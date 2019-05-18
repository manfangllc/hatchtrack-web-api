const express = require("express");
const bodyParser = require("body-parser");
const awsIot = require("aws-iot-device-sdk");
const awsCognito = require('amazon-cognito-identity-js');
const util = require("util");
const uuid = require("uuid/v1");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const https = require("https");
const morgan = require("morgan");
const fs = require("fs");
const config = require("./config");
const app = express();
const port = 18888;

global.fetch = require('node-fetch');

// postgres configuration /////////////////////////////////////////////////////

const postgresPool = new Pool({
  user: config.postgresPoolUser,
  host: config.postgresPoolHost,
  database: config.postgresPoolDatabase,
  password: config.postgresPoolPassword,
  port: config.postgresPoolPort,
});

// AWS Cognito configuration //////////////////////////////////////////////////

var cognitoPool = new awsCognito.CognitoUserPool({
  UserPoolId: "us-west-2_wOcu7aBMM",
  ClientId: "3613d9a19u167arbjab22ip8ee",
});

// AWS IoT configuration //////////////////////////////////////////////////////

const thingShadow = awsIot.thingShadow({
  keyPath: config.awsIotKeyPath,
  certPath: config.awsIotCertPath,
  caPath: config.awsIotCaPath,
  clientId: config.awsIotClientId,
  host: config.awsIotHost,
});

// express configuration //////////////////////////////////////////////////////

const apiV1Routes = express.Router();
app.use(morgan("combined"));
app.use(bodyParser.json());
app.use("/api/v1", apiV1Routes);
apiV1Routes.routerPath = "/api/v1";

if (typeof process.env.NODE_ENV === "undefined") {
  process.env.NODE_ENV = "production";
}

if (process.env.NODE_ENV === "development") {
  app.set("json spaces", 2);
  app.listen(port, () =>
    console.log(`listening on port ${port}`),
  );
}
else if (process.env.NODE_ENV === "production") {
  // Let's Encrypt certificates for SSL
  const privateKey = fs.readFileSync(
    "/etc/letsencrypt/live/db.hatchtrack.com/privkey.pem",
    "utf8");
  const certificate = fs.readFileSync(
    "/etc/letsencrypt/live/db.hatchtrack.com/cert.pem",
    "utf8");
  const ca = fs.readFileSync(
    "/etc/letsencrypt/live/db.hatchtrack.com/chain.pem",
    "utf8");

  https.createServer({
    key: privateKey,
    cert: certificate,
    ca: ca
  }, app).listen(port, () =>
    console.log(`listening on port ${port} (SSL enabled)`),
  );
}

// routes /////////////////////////////////////////////////////////////////////

app.use((err, req, res, next) => {
  // this is used as a generic error handler for anything not caught elsewhere
  if (err !== null) {
    console.log(err);
    return res.status(400).send();
  }
  return next();
});

app.post("/auth", (req, res) => {
  var email = req.body.email;
  var password= req.body.password;

  if (("undefined" === typeof email) || ("undefined" === typeof password)) {
    res.status(400).send();
  }
  else {
    try {
      var cognitoUser = new awsCognito.CognitoUser({
        Username : email,
        Pool : cognitoPool,
      });

      var cognitoAuth = new awsCognito.AuthenticationDetails({
          Username : email,
          Password : password,
      });

      cognitoUser.authenticateUser(cognitoAuth, {
          onSuccess: function (result) {
              // TODO: It would be cool to use the accessToken provided by AWS.
              //var accessToken = result.getAccessToken().getJwtToken();

              // TODO: Is there a better approach for ensuring the user has
              // a valid entry in the database?
              var q = "";
              q += "INSERT INTO email_2_peep_uuids (email, peep_uuids) ";
              q += "VALUES ('" + email + "','{}') ";
              q += "ON CONFLICT (email) DO NOTHING";

              postgresPool.query(q, (err, result) => {
                if (err) {
                  console.error(err);
                  res.status(500).send();
                }
                else {
                  const payload = { email:  email };
                  const options = { expiresIn: 60 * 5 };
                  var token = jwt.sign(payload, config.jwtSecret, options);
                  // return Access-Token used to make requests to /api
                  res.status(200).json({ "accessToken": token });
                }
              });
          },

          onFailure: function(err) {
              res.status(401).send();
          },
      });
    }
    catch (err) {
      res.status(422).send();
    }
  }
});

apiV1Routes.use((req, res, next) =>{
  // all routes with "/api" will start here for authentication
  // check header for the token
  var token = req.headers["access-token"];

  // decode token
  if (token) {
    // verifies secret and checks if the token is expired
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        // not authorized
        return res.status(401).send();
      } else {
        console.log(decoded);
        // authorized, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  }
  else {
    // if there is no token
    res.status(401).send();
  }
});

apiV1Routes.get("/user/peeps", (req, res) => {
  var email = req.decoded.email;

  if ("undefined" === email) {
    res.status(422).send();
  }
  else {
    // postgres query to grab all Peep UUIDs for a given email account
    var q = "";
    q += "SELECT peep_uuids FROM email_2_peep_uuids ";
    q += "WHERE email='" + email + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send();
      }
      var data = result.rows[0].peep_uuids;
      var js = { peepUUIDs: data };

      res.status(200).json(js);
    });
  }
});

apiV1Routes.delete("/user/peep", (req, res) => {
  var email = req.decoded.email;
  var peepUUID = req.query.peepUUID;

  if (("undefined" === typeof email) ||
      ("undefined" === typeof peepUUID)) {
    res.status(422).send();
  }
  else {
    var q = "";
    q += "UPDATE email_2_peep_uuids SET ";
    q += "peep_uuids = array_remove(peep_uuids, '" + peepUUID + "') ";
    q += "WHERE email = '" + email + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send();
      }
      else {
        res.status(200).send();
      }
    });
  }
});

apiV1Routes.post("/user/peep", (req, res) => {
  var email = req.decoded.email;
  var peepUUID = req.body.peepUUID;

  if (("undefined" === typeof email) ||
      ("undefined" === typeof peepUUID)) {
    res.status(422).send();
  }
  else {
    var q = "";
    // Force removal first just to be safe. Also has benefit of pushing
    // UUID to the back if it already existed.
    q += "UPDATE email_2_peep_uuids SET ";
    q += "peep_uuids = array_remove(peep_uuids, '" + peepUUID + "') ";
    q += "WHERE email = '" + email + "'";
    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(q);
        console.error(err);
        res.status(500).send();
      }
      else {
        q = "";
        q += "UPDATE email_2_peep_uuids SET ";
        q += "peep_uuids = array_append(peep_uuids, '" + peepUUID + "') ";
        q += "WHERE email = '" + email + "'";

        postgresPool.query(q, (err, result) => {
          if (err) {
            console.error(q);
            console.error(err);
            res.status(500).send();
          }
          else {

            q = "";
            q += "INSERT INTO peep_uuid_2_info (uuid, name, hatch_uuids) "
            q += "VALUES ('" + peepUUID + "', 'New Peep', '{}') ";
            q += "ON CONFLICT (uuid) DO NOTHING";

            postgresPool.query(q, (err, result) => {
              if (err) {
                console.error(q);
                console.error(err);
                res.status(500).send();
              }
              else {
                res.status(200).send();
              }
            });
          }
        });
      }
    });
  }
});

apiV1Routes.get("/peep", (req, res) => {
  var peepUUID = req.query.peepUUID;

  if ("undefined" === peepUUID) {
    res.status(422).send();
  }
  else {
    // postgres query to grab Peep name given a Peep UUID
    var q = "";
    q += "SELECT * FROM peep_uuid_2_info ";
    q += "WHERE uuid='" + peepUUID + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send();
      }
      else {
        var name = result.rows[0].name;
        var hatches = result.rows[0].hatch_uuids;

        var js = {
          peepName : name,
          hatchUUIDs : hatches
        };

        res.status(200).json(js);
      }
    });
  }
});

apiV1Routes.get("/peep/name", (req, res) => {
  var peepUUID = req.query.peepUUID;

  if ("undefined" === peepUUID) {
    res.status(422).send();
  }
  else {
    // postgres query to grab Peep name given a Peep UUID
    var q = "";
    q += "SELECT name FROM peep_uuid_2_info ";
    q += "WHERE uuid='" + peepUUID + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send();
      }
      else {
        if ("undefined" !== result.rows[0]) {
          var data = result.rows[0].name;
          res.status(200).json({peepName : data});
        }
        else {
          console.error(result);
          res.status(500).send();
        }
      }
    });
  }
});

apiV1Routes.post("/peep/name", (req, res) => {
  var peepUUID = req.body.peepUUID;
  var peepName = req.body.peepName;

  if (("undefined" === typeof peepUUID) ||
      ("undefined" === typeof peepName)) {
    res.status(422).send();
  }
  else {
    // postgrest query to update Peep name
    var q = "";
    q += "UPDATE peep_uuid_2_info SET name = '" + peepName + "' "
    q += "WHERE uuid = '" + peepUUID + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send();
      }
      else {
        res.status(200).send();
      }
    });
  }
});

function peepUUID2InfoAppendPostgres(peepUnit, callback) {
  var q = "";
  q += "UPDATE peep_uuid_2_info SET "
  q += "hatch_uuids = array_append(hatch_uuids,'" + peepUnit.hatchUUID + "') "
  q += "WHERE uuid = '" + peepUnit.uuid + "'";

  postgresPool.query(q, (err, result) => {
    if (err) {
      console.error(err);
      throw 500;
    }
    else {
      callback(peepUnit);
    }
  });
}

function hatchUUID2InfoPostgres(peepUnit, callback) {
  var q = "";
  q += "INSERT INTO hatch_uuid_2_info "
  q += "(uuid, start_unix_timestamp, end_unix_timestamp, "
  q += "measure_interval_min, temperature_offset_celsius) ";
  q += "VALUES ('";
  q += peepUnit.hatchUUID + "',"; // str
  q += peepUnit.startUnixTimestamp + ","; // int
  q += peepUnit.endUnixTimestamp + ","; // int
  q += peepUnit.measureIntervalMin + ","; // int
  q += peepUnit.temperatureOffsetCelsius + ") "; // int

  postgresPool.query(q, (err, result) => {
    if (err) {
      console.error(err);
      throw 500;
    }
    else {
      callback(peepUnit);
    }
  });
}

function uuid2hatchAWS(peepUnit, callback) {
  var shadow =
  {"state":
    {"desired":
      { "hatchUUID": peepUnit.hatchUUID,
        "endUnixTimestamp": peepUnit.endUnixTimestamp,
        "measureIntervalMin": peepUnit.measureIntervalMin,
        "temperatureOffsetCelsius": peepUnit.temperatureOffsetCelsius,
      }
    }
  };

  var peepUUID = peepUnit.uuid;
  var opt = {ignoreDeltas: true, persistentSubscribe: false};
  thingShadow.register(peepUUID, opt, function() {

    thingShadow.on("status",
                   function(thingName, stat, clientToken, stateObject) {
      thingShadow.unregister(thingName);
      if (stat === "accepted") {
        callback(peepUnit);
      }
      else {
        throw 500;
      }
    });

    thingShadow.on("timeout", function(thingName, clientToken) {
      thingShadow.unregister(thingName);
      throw 500;
    });

    var clientTokenUpdate = thingShadow.update(peepUUID, shadow);
    if (clientTokenUpdate === null) {
      console.log("update shadow failed, operation still in progress");
      throw 500;
    }
  });
}

apiV1Routes.get("/peep/hatches", (req, res) => {
  var peepUUID = req.query.peepUUID;

  if ("undefined" === peepUUID) {
    res.status(422).send();
  }
  else {
    // postgres query to grab Peep name given a Peep UUID
    var q = "";
    q += "SELECT hatch_uuids FROM peep_uuid_2_info ";
    q += "WHERE uuid='" + peepUUID + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send();
      }
      else {
        var hatches = result.rows[0].hatch_uuids;

        var js = {
          hatchUUIDs : hatches
        };

        res.status(200).json(js);
      }
    });
  }
});

apiV1Routes.post("/peep/hatch", (req, res) => {
  var email = req.decoded.email;
  var peepUUID = req.body.peepUUID;
  var hatchUUID = uuid();
  var startUnixTimestamp = Date.now() / 1000;
  var endUnixTimestamp = parseInt(req.body.endUnixTimestamp);
  var measureIntervalMin = parseInt(req.body.measureIntervalMin);
  var temperatureOffsetCelsius = parseInt(req.body.temperatureOffsetCelsius);

  if (("undefined" === typeof email) ||
      ("undefined" === typeof peepUUID) ||
      ("undefined" === typeof hatchUUID) ||
      ("undefined" === typeof endUnixTimestamp) ||
      ("undefined" === typeof measureIntervalMin) ||
      ("undefined" === typeof temperatureOffsetCelsius)) {
    res.status(422).send();
  }
  else {
    if (measureIntervalMin <= 0) {
      measureIntervalMin = 15;
    }

    var peepUnit = {
      email: email,
      uuid: peepUUID,
      hatchUUID: hatchUUID,
      startUnixTimestamp: startUnixTimestamp,
      endUnixTimestamp: endUnixTimestamp,
      measureIntervalMin: measureIntervalMin,
      temperatureOffsetCelsius: temperatureOffsetCelsius,
    };

    try {
      uuid2hatchAWS(peepUnit, (peepUnit) => {
        hatchUUID2InfoPostgres(peepUnit, (peepUnit) => {
          peepUUID2InfoAppendPostgres(peepUnit, (peepUnit) => {
            res.status(200).send();
          });
        });
      });
    }
    catch (err) {
      console.log(err);
      res.status(500).send();
    }
  }
});

apiV1Routes.get("/hatch", (req, res) => {
  var hatchUUID = req.query.hatchUUID;

  if ("undefined" === hatchUUID) {
    res.status(400).send();
  }
  else {
    var q = "";
    q += "SELECT * FROM hatch_uuid_2_info ";
    q += "WHERE uuid='" + hatchUUID + "'";

    //postgresPool.query({text: q, rowMode: 'array'}, (err, result) => {
    postgresPool.query(q, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send();
      }
      else {
        //var data = result.rows[0];
        var data = result.rows[0];

        if ("undefined" === typeof data) {
          res.status(200).json({
            "startUnixTimestamp": 0,
            "endUnixTimestamp": 0,
            "measureIntervalMin": 15,
            "temperatureOffsetCelsius": 0,
          });
        }
        else {
          res.status(200).json({
             // force int conversion, BIGINT is returned as string
            "startUnixTimestamp": parseInt(data.start_unix_timestamp),
            "endUnixTimestamp": parseInt(data.end_unix_timestamp),
            "measureIntervalMin": data.measure_interval_min,
            "temperatureOffsetCelsius": data.temperature_offset_celsius,
          });
        }
      }
    });
  }
});

// Print out all routes for debugging/development.
//app._router.stack.forEach(function(r){
  //if (r.route && r.route.path){
    //console.log(r.route.path);
  //}
//});

//apiV1Routes.stack.forEach(function(r){
  //if (r.route && r.route.path){
    //console.log(apiV1Routes.routerPath + r.route.path);
  //}
//});
