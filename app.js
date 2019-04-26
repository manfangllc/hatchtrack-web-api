const express = require("express");
const awsIot = require("aws-iot-device-sdk");
const util = require("util")
const uuid = require("uuid/v1");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const https = require("https");
const morgan = require("morgan");
const fs = require("fs");
const config = require("./config");
const app = express();
const port = 18888;

// postgres configuration /////////////////////////////////////////////////////

const postgresPool = new Pool({
  user: config.postgresPoolUser,
  host: config.postgresPoolHost,
  database: config.postgresPoolDatabase,
  password: config.postgresPoolPassword,
  port: config.postgresPoolPort,
});

// AWS IoT configuration //////////////////////////////////////////////////////

const thingShadow = awsIot.thingShadow({
  keyPath: config.awsIotKeyPath,
  certPath: config.awsIotCertPath,
  caPath: config.awsIotCaPath,
  clientId: config.awsIotClientId,
  host: config.awsIotHost,
});

//thingShadow.on("connect", function() {
  //console.log("[AWS IoT]: connected");
//});

//thingShadow.on("close", function() {
  //console.log("close");
//});

//thingShadow.on("reconnect", function() {
  //console.log("reconnect");
//});

thingShadow.on("status", function(thingName, stat, clientToken, stateObject) {
  //console.log("status " + stat + ": " + thingName);
  thingShadow.unregister(thingName);
});

thingShadow.on("timeout", function(thingName, clientToken) {
  //console.log("timeout: " + thingName);
  thingShadow.unregister(thingName);
});

// express configuration //////////////////////////////////////////////////////

const apiRoutes = express.Router();
app.use(morgan("combined"));
app.use("/api", apiRoutes);
app.use(express.json());
app.set("thingShadow", thingShadow);

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
    return res.status(400).send();
  }
  return next();
});

app.post("/auth", (req, res) => {
  try {
    // TODO: check credentials in AWS cognito
    const payload = { check:  true };
    const options = { expiresIn: 60 * 5 };
    var token = jwt.sign(payload, config.jwtSecret, options);
    // return access-token used to make requests to /api
    res.status(200).json({ "access-token": token });
  }
  catch (err) {
    res.status(422).send();
  }
});

apiRoutes.use((req, res, next) =>{
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

apiRoutes.get("/v1/email2uuids", (req, res) => {
  var email = req.query.email;
  if (!email) {
    res.status(422).send();
  }
  else {
    // postgres query to grab all Peep UUIDs for a given email account
    var q = "";
    q += "SELECT peep_uuids FROM email_2_peep_uuids ";
    q += "WHERE email='" + email + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        throw err;
      }
      var data = result.rows[0];
      res.status(200).json(data);
    });
  }
});

apiRoutes.get("/v1/uuid2info", (req, res) => {
  var uuid = req.query.uuid;
  if (!uuid) {
    res.status(422).send();
  }
  else {
    // postgres query to grab Peep name given a Peep UUID
    var q = "";
    q += "SELECT name FROM peep_uuid_2_info ";
    q += "WHERE uuid='" + uuid + "'";

    postgresPool.query(q, (err, result) => {
      if (err) {
        throw err;
      }
      var data = result.rows[0];
      res.status(200).json(data);
    });
  }
});

app.post("/hatch", (req, res) => {
  try {
    const thingShadow = req.app.get("thingShadow");
    var email = req.body.email;
    var peepUUID = "hatchtrack-web-api";
    var hatchUUID = uuid();
    var endUnixTimestamp = req.body.endUnixTimestamp;
    var measureIntervalMin = req.body.measureIntervalMin;
    
    var shadow = {"state":
      {"desired":
        { "hatchUUID":hatchUUID,
          "endUnixTimestamp":endUnixTimestamp,
          "measureIntervalMin":measureIntervalMin
        }
      }
    };

    var opt = {ignoreDeltas: true, persistentSubscribe: false};
    thingShadow.register(peepUUID, opt, function() {
      var clientTokenUpdate = thingShadow.update(peepUUID, shadow);
      if (clientTokenUpdate === null) {
        console.log("update shadow failed, operation still in progress");
        res.status(500).send();
      }
      else {
        // NOTE: In my ideal world, this would be sent only after we get a
        // confirmation that the message has successfully been sent; this would
        // be in the thingShadow.on("status", function()) callback.
        res.status(200).send();
      }
    });
  }
  catch (err) {
    console.log(err);
    res.status(422).send();
  }
});
