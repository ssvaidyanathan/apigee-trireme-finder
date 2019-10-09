const colors = require("colors/safe");
const inquirer = require("inquirer");
const rp = require("request-promise");
const util = require("util");
const Spinner = require('cli-spinner').Spinner;

let questions = [
	{
    type: 'input',
    name: 'host',
    default: "api.enterprise.apigee.com",
    message: colors.yellow("Please provide the Apigee Management Host: "),
    validate: function(value) {
      if(!value)
        return colors.red("Apigee Management Host name cannot be empty!");
      return true;
    }
   },
   {
    type: 'input',
    name: 'org',
    message: colors.yellow("Please provide the Apigee Edge Organization name: "),
    validate: function(value) {
      if(!value)
        return colors.red("Apigee Edge Organization name cannot be empty!");
      return true;
    }
   },
   {
    type: 'input',
    name: 'env',
    message: colors.yellow("Please provide the Apigee Edge Environment name: "),
    validate: function(value) {
      if(!value)
        return colors.red("Apigee Edge Environment name cannot be empty!");
      return true;
    }
   },
   {
	  type: 'list',
	  name: 'authType',
	  message: colors.yellow("Which Auth type would you like to use?"),
	  choices: ['Basic', 'OAuth'],
	  validate: function(value) {
      if(!value)
        return colors.red("Please select an Auth type!");
      return true;
    }
   }
];


let basicAuthPrompt = [
{
    type: 'input',
    name: 'username',
    message: colors.yellow("Please provide the Apigee Edge username: "),
    validate: function(value) {
      if(!value)
        return colors.red('Apigee Edge username cannot be empty!');
      return true;
    }
   },
   {
    type: 'password',
    name: 'password',
    mask: '*',
    message: colors.yellow("Please provide the Apigee Edge password: "),
    validate: function(value) {
      if(!value)
        return colors.red('Apigee Edge password cannot be empty!')
      return true;
     } 
    }
];

let oAuthPrompt = [
{
    type: 'input',
    name: 'oauthToken',
    message: colors.yellow("Please provide the Apigee OAuth token: "),
    validate: function(value) {
      if(!value)
        return colors.red('Apigee OAuth token cannot be empty!');
      return true;
    }
   }
];

inquirer.prompt(questions).then(async function(options) {
  if(options.authType === "Basic"){
  	inquirer.prompt(basicAuthPrompt).then(async function(authOptions) {
  		await getTriremeProxies(options, authOptions);
  	});
  }else {
  	inquirer.prompt(oAuthPrompt).then(async function(authOptions) {
  		await getTriremeProxies(options, authOptions);
  	});
  }
});

async function getTriremeProxies(config, auth){
	let triremeProxies = [];
	let spinner = new Spinner('Fetching all deployed proxies in '+config.org+ ' org in the '+ config.env +' env... %s');
	spinner.start();
	let apis = await getEntities(config, auth, "environments/"+config.env+"/deployments");
	if (apis.aPIProxy!=null && apis.aPIProxy.length==0) {
		console.log("API Proxies Deployed: NONE");
		return;
	}
	spinner.stop();
	console.log("");
	console.log("Fetch complete");
	spinner = new Spinner('Checking each proxy revision... %s');
	console.log("");
	spinner.start();
	for(api of apis.aPIProxy){
    let targets = await getEntities(config, auth, "apis/"+api.name+"/revisions/"+api.revision[0].name+"/targets");
    for(target of targets){
      let targetMetadata = await getEntities(config, auth, "apis/"+api.name+"/revisions/"+api.revision[0].name+"/targets/"+target);
      if(targetMetadata !=null && targetMetadata.connection!=null && targetMetadata.connection.connectionType == "scriptConnection"){
        triremeProxies.push({
            "api": api.name,
            "revision": api.revision[0].name,
            "target": target
          }); 
          break;
      }
    }

		/*let revisionMetaData = await getEntities(config, auth, "apis/"+api.name+"/revisions/"+api.revision[0].name);
		if(revisionMetaData.resources !== null && revisionMetaData.resources.length > 0){
			for (var i = 0; i < revisionMetaData.resources.length; i++){
				if(revisionMetaData.resources[i].startsWith("node://") && revisionMetaData.resources[i].endsWith(".js")){
					triremeProxies.push({
						"api": api.name,
						"revision": api.revision[0].name
					});	
					break;
				}
			}
		}*/
	}
	spinner.stop();
	console.log("\n======== Trireme Proxies =========");
	if (triremeProxies === null || triremeProxies.length === 0) {
		console.log("NONE");
		console.log ("==================================");
		return;
	}
	for (proxy of triremeProxies){
		console.log("API: "+ proxy.api);
		console.log("Revision: "+ proxy.revision);
    	console.log("Target: "+ proxy.target);
		console.log("Environment: "+ config.env);
		console.log("==================================");
	}
}

async function getEntities(config, authConfig, entity){
	let auth = "";
	if(config.authType === "Basic")
		auth = "Basic "+Buffer.from(authConfig.username+":"+authConfig.password).toString('base64');
	else
		auth = "Bearer "+ authConfig.oauthToken
	let options = {
	    method: "GET",
	    uri: "https://"+config.host+"/v1/organizations/"+config.org+"/"+entity,
	    headers: {
        	"Authorization": auth
    	},
	    json: true
	};
	try{
		let parsedBody = await rp(options);
		return parsedBody;
	}
	catch(err){
		safeLog(err);
		return null;
	}
}


// strip Basic auth from logging
function safeLog(obj) {
	let str = util.inspect(obj);
	console.log(str.replace(/Basic [+/A-Za-z0-9]+/g,'Basic ******'));
}

