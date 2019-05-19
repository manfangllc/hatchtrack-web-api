# API Documentation

## POST /auth
Authenticate user for access to API.
### Input
**email**: User's email to authenticate.  
**password**: User's password used for authentication.
### Output
**accessToken**: JSON Web Token used for authentication. This should be placed in the http header `Access-Token` for all calls to `/api/v1/*` endpoints.
### Example
Input  
```javascript
{  
  "email" : "user@domain.com",
  "password" : "secret123!"
}
```
Output
```javascript
{
    "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAd2lkZ3QubmluamEiLCJpYXQiOjE1NTc4MDEyMzgsImV4cCI6MTU1NzgwMTUzOH0.QjX1p5LCA53IQniIMk1JJOIKuECH43tla-M5_3BJ5Q0"
}
```

## GET /api/v1/user/peeps
Get user's registered Peeps.
### Output
**peepUUIDs**: Array of Peep units associated with a given user's account represented as a 128 bit UUID.
### Example
Output
```javascript
{
  "peepUUIDs":
   [ '425e11b3-5844-4626-b05a-219d9751e5ca',
     '86559e4a-c115-4412-a8b3-b0f54486a18c' ]
}
```
## POST /api/v1/user/peep
Register a new Peep with a user's account.
### Input
**peepUUID**: The 128 bit UUID of the Peep to register.
### Example
Input
```javascript
{
    "peepUUID": "d1533a96-6ab3-42dd-bbce-c6632c296985"
}
```

## DELETE /api/v1/user/peep
Remove Peep from user's registered Peeps.
### Input
**peepUUID**: The 128 bit UUID of the Peep to remove.
### Example
Input
```javascript
{
    "peepUUID": "d1533a96-6ab3-42dd-bbce-c6632c296985"
}
```

## GET /api/v1/peep/name
Get the user defined name for a given Peep.
### Input
**peepUUID**: The 128 bit UUID of the Peep.
### Output
**peepName**: User given name for the Peep.
### Example
Input
```
/api/v1/peep/name?peepUUID=d1533a96-6ab3-42dd-bbce-c6632c296985
```
Output
```javascript
{
    "peepName": "My Peep"
}
```

## POST /api/v1/peep/name
Set the user defined name for a given Peep.
### Input
**peepUUID**: The 128 bit UUID of the Peep.
**peepName**: The name to assign to the specified Peep.
### Example
Input
```javascript
{
    "peepUUID": "d1533a96-6ab3-42dd-bbce-c6632c296985"
    "peepName": "My Peep"
}
```

## GET /api/v1/peep/hatches
Get all Hatches registered for a given Peep.
### Input
**peepUUID**: The 128 bit UUID of the Peep.
### Output
**hatchUUIDs**: Array of 128 bit UUIDs correlating to all hatches registered with a given Peep.
### Example
Input
```
/api/v1/peep/hatches?peepUUID=d1533a96-6ab3-42dd-bbce-c6632c296985
```
Output
```javascript
{
  "hatchUUIDs": [ '50188540-75b7-11e9-82e1-db44545430e3' ]
}
```

## POST /api/v1/peep/hatch
Register new Hatch for a given Peep.
### Input
**peepUUID**: The 128 bit UUID of the Peep.  
**endUnixTimestamp**: The UTC Unix timestamp value at which the Peep will stop a given hatch.  
**measureIntervalMin**: Period in minutes which a Peep will perform an environmental reading.  
**temperatureOffsetCelsius**: Calibration offset in degrees celsius to apply to measurements taken by a Peep.
### Example
Input
```javascript
{
  "peepUUID": "d1533a96-6ab3-42dd-bbce-c6632c296985"
  "endUnixTimestamp": 1557804708,
  "measureIntervalMin": 15,
  "temperatureOffsetCelsius": 0
}
```

## GET /api/v1/peep/measure/last
Get all Hatches registered for a given Peep.
### Input
**peepUUID**: The 128 bit UUID of the Peep.
### Output
**hatchUUID**: The 128 bit UUID of the hatch the measure is from.  
**time**: Unix timestamp of last measurement.  
**humidity**: Relative humidity measured as percentage.  
**temperature**: Temperature measured in Celcius.  
### Example
Input
```
/api/v1/peep/measure/last?peepUUID=d1533a96-6ab3-42dd-bbce-c6632c296985
```
Output
```javascript
{
  "hatchUUID": "50188540-75b7-11e9-82e1-db44545430e3",
  "unixTimestamp": 1556816523,
  "humidity": 45.19,
  "temperature": 24.75
}
```

## GET /api/v1/hatch
Get information for a given Hatch.
### Input
**hatchUUID**: The 128 bit UUID of the Hatch.
### Output
**startUnixTimestamp**: The UTC Unix timestamp value at which the Hatch was registered.  
**endUnixTimestamp**: The UTC Unix timestamp value at which the Hatch will end.  
**measureIntervalMin**: Period in minutes which a Peep will perform an environmental reading for the Hatch.  
**temperatureOffsetCelsius**: Calibration offset in degrees celsius to apply to measurements taken by a Peep for this Hatch.
### Example
Input
```
/api/v1/hatch?hatchUUID=50188540-75b7-11e9-82e1-db44545430e3
```
Output
```javascript
{
  "startUnixTimestamp": 1558042258,
  "endUnixTimestamp": 2147483647,
  "measureIntervalMin": 15,
  "temperatureOffsetCelsius": 0
}
```
