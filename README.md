# apigee-trireme-finder
Script to find list of proxies that uses Trireme based NodeJS code

## Pre-req
- NodeJS 8.x or later
- User must have appropriate permissions in the Apigee org

## Steps
- Clone this repo `git clone https://github.com/ssvaidyanathan/apigee-trireme-finder.git`
- Navigate to the `apigee-trireme-finder` directory in your machine
- Run `npm install` to install the dependencies

### To get the list of proxies that has NodeJS resources
- Run `node trireme_proxy_finder.js`
- It should prompt you to provide Apigee Management Host, Apigee organization and Auth Type
	- If you select *Basic*, it should prompt you to provide the Apigee username and password
	- If you select *OAuth*, it should prompt you to provide the OAuth Token. Please refer to [this doc](https://docs.apigee.com/api-platform/system-administration/auth-tools) to generate OAuth Tokens
- Once the info is provided, the script should list the Proxies and the Revision that uses Trireme

### To get the list of deployed proxies in a given environment that has NodeJS resources
- Run `node deployed_trireme_proxy_finder.js`
- It should prompt you to provide Apigee Management Host, Apigee organization, Apigee environment and Auth Type
	- If you select *Basic*, it should prompt you to provide the Apigee username and password
	- If you select *OAuth*, it should prompt you to provide the OAuth Token. Please refer to [this doc](https://docs.apigee.com/api-platform/system-administration/auth-tools) to generate OAuth Tokens
- Once the info is provided, the script should list the deployed Proxies and the Revision that uses Trireme