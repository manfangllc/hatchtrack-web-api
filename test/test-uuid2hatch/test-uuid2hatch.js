const fetch = require('node-fetch');

const url = "http://localhost:18888";
const auth = {email: "test@widgt.ninja", password: "Test1337$"};

postDataJsonResp(url + "/auth", auth)
  .then(function(data) {
    var accessToken = data.accessToken;
    //console.log(accessToken);

    const info = {
      peepUUID:"d1533a96-6ab3-42dd-bbce-c6632c296985",
      email:"test@widgt.ninja",
      endUnixTimestamp: 0,
      measureIntervalMin: 22,
      temperatureOffset: 3,
    };
    postData(url + "/api/v1/uuid2hatch", accessToken, info)
      .catch(function(error) {
        console.error(error);
      });
  })
  .catch(function(error) {
    console.error(error);
  });

function postDataJsonResp(url = ``, data = {}) {
  return fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrer: "no-referrer",
    body: JSON.stringify(data),
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

// Returns status code.
function postData(url = ``, accessToken = ``, data = {}) {
  return fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "access-token": accessToken,
    },
    redirect: "follow",
    referrer: "no-referrer",
    body: JSON.stringify(data),
  })
  .then(function(response) {
    if (200 !== response.status) {
      throw "Error: " + response.status.toString();
    }
  });
}
