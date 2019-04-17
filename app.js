const express = require('express');
const util = require('util')
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const config = require('./config');
const app = express();
const port = 3000;

// configuration //////////////////////////////////////////////////////////////

const postgresPool = new Pool({
  user: config.postgresPoolUser,
  host: config.postgresPoolHost,
  database: config.postgresPoolDatabase,
  password: config.postgresPoolPassword,
  port: config.postgresPoolPort,
});

const apiRoutes = express.Router();
app.use('/api', apiRoutes);
app.use(express.json());

if(process.env.NODE_ENV === 'development') {
  app.set('json spaces', 2);
}

app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`),
);

// routes /////////////////////////////////////////////////////////////////////

app.use((err, req, res, next) => {
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

apiRoutes.get('/v1/email2uuids', (req, res) => {
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

apiRoutes.get('/v1/uuid2info', (req, res) => {
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
