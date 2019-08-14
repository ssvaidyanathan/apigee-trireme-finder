# apigee-trireme-finder
Script to find list of proxies that uses Trireme based NodeJS code

## Pre-req
- NodeJS 8.x or later
- User must have appropriate permissions in the Apigee org

## Steps
- Clone this repo `git clone https://github.com/ssvaidyanathan/apigee-trireme-finder.git`
- Navigate to the `apigee-trireme-finder` directory in your machine
- Run `npm install` to install the dependencies
- Run `node trireme_proxy_finder.js` and provide the Apigee Management Server Host, Apigee org, username and password
- Should list the Proxies and the Revision that uses Trireme code
