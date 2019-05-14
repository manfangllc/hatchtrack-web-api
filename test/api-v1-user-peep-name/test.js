const fetch = require('node-fetch');

const url = "http://localhost:18888";
const auth = {email: "test@widgt.ninja", password: "Test1337$"};
const peepUUID = "d1533a96-6ab3-42dd-bbce-c6632c296985";

postData(url + "/auth", null, auth)
  .then(function(data) {

    var accessToken = data.accessToken;
    var data = { 
      peepUUID : peepUUID,
      peepName : "Peep" + Date.now().toString()
    };

    postData(url + "/api/v1/peep/name", accessToken, data)
      .then(function(data) {

        getData(url + "/api/v1/peep/name?peepUUID=" + peepUUID, accessToken)
          .then(function(data) {
            console.log(data);
          })
          .catch(function(err) {
            console.error(err);
          });
      })
      .catch(function(err) {
        console.error(err);
      });
  })
  .catch(function(err) {
    console.error(err);
  });

// Helper Functions ///////////////////////////////////////////////////////////

function postData(url = ``, accessToken = null, data = {}) {
  if (null === accessToken) {
    var headers = {
      "Content-Type": "application/json"
    };
  }
  else {
    var headers = {
      "Content-Type": "application/json",
      "Access-Token": accessToken,
    };
  }

  return fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: headers,
    redirect: "follow",
    referrer: "no-referrer",
    body: JSON.stringify(data),
  })
  .then(function(response) {
    if (200 === response.status) {
      return ((0 != response.headers.get("content-length"))) ?
             response.json() :
             { };
    }
    else {
      throw "Error: " + response.status.toString();
    }
  });
}

function getData(url = ``, accessToken = ``) {
  return fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": accessToken,
    },
    redirect: "follow",
    referrer: "no-referrer",
  })
  .then(function(response) {
    if (200 === response.status) {
      return response.json()
    }
    else {
      throw "Error: " + response.status.toString();
    }
  });
}
