# hatchtrack-web-api

## About
A RESTful web API for Hatchtrack web services written using Node JS.

## Documentation
The API is documented in the [API.md](API.md) file.

## Preamble
Ensure that `node` and `npm` are installed and able to be executed. Currently,
Node v10.x.x and its associated version of NPM are the only versions supported.
Things may work with older or newer versions, but your milage may vary.

## Building
Cloning the repository and running `npm install` should install all of the
dependencies for this project.

## Running
Unless you are deploying this on the production server that has all of the
required SSL certificates on it, you should run this server in test mode.
```
$ npm run-script test

> hatchtrack-web-api@1.0.0 test /home/ubuntu/hatchtrack-web-api
> NODE_ENV=development node ./app.js

listening on port 18888

```

When deploying this server on a target with the SSL scripts loaded onto it, run
it in production mode.
```
$ npm run-script production

> hatchtrack-web-api@1.0.0 production /home/ubuntu/hatchtrack-web-api
> node ./app.js

listening on port 18888 (SSL enabled)
```
