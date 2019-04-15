const express = require('express');
const util = require('util')
const { Pool } = require('pg');
const app = express();
const port = 3000;

// configuration //////////////////////////////////////////////////////////////

const postgresPool = new Pool({
  user: 'master',
  host: 'hatchtrack-peep-user-db-test.crprnnsms8xr.us-west-2.rds.amazonaws.com',
  database: 'hatchtrack_peep_user_db_test',
  password: 'W6FAv5Hjkrp6vZ4L',
  port: 5432,
});

app.use(express.json());

if(process.env.NODE_ENV === 'development') {
  app.set('json spaces', 2);
}

app.use((err, req, res, next) => {
  if (err !== null) {
    return res.status(400).send();
  }
  return next();
});

app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`),
);

// routes /////////////////////////////////////////////////////////////////////

app.post("/v1/auth", (req, res) => {
  try {
    console.log(req.body);
    auth.authEmail("test@widgt.ninja", "Test1337$");
    res.status(200).send();
  }
  catch (err) {
    res.status(422).send();
  }
});

app.get('/v1/email2uuids', (req, res) => {

  var email = req.query.email;
  if (!email) {
    res.status(422).send();
  }
  else {
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

app.get('/v1/uuid2info', (req, res) => {

  var uuid = req.query.uuid;
  if (!uuid) {
    res.status(422).send();
  }
  else {
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
