module.exports = {
  jwtSecret : "c097qjk3v9kjfASfova8aka",

  postgresPoolUser: "master",
  postgresPoolHost: "hatchtrack-peep-user-db-test.crprnnsms8xr.us-west-2.rds.amazonaws.com",
  postgresPoolDatabase: "hatchtrack_peep_user_db_test",
  postgresPoolPassword: "W6FAv5Hjkrp6vZ4L",
  postgresPoolPort: 5432,
  
  awsIotKeyPath: __dirname + "/keys/4b0c237649-private.pem.key",
  awsIotCertPath: __dirname + "/keys/4b0c237649-certificate.pem.crt",
  awsIotCaPath: __dirname + "/keys/aws-root-ca1.pem",
  awsIotClientId: "hatchtrack-web-api",
  awsIotHost: "a1mdhmgt02ub52-ats.iot.us-west-2.amazonaws.com",
};
