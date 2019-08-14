const prompt = require("prompt");
const colors = require("colors/safe");
const rp = require("request-promise");
const util = require("util");

let schema = {
    properties: {
      host: {
        description: colors.yellow("Please provide the Apigee Management Host"),
        message: colors.red("Apigee Edge Organization name cannot be empty!"),
        required: true
      },
      org: {
        description: colors.yellow("Please provide the Apigee Edge Organization name"),
        message: colors.red("Apigee Edge Organization name cannot be empty!"),
        required: true
      },
      username: {
        description: colors.yellow("Please provide the Apigee Edge username"),
        message: colors.red("Apigee Edge username cannot be empty!"),
        required: true
      },
      password: {
        description: colors.yellow("Please provide the Apigee Edge password"),
        message: colors.red("Apigee Edge password cannot be empty!"),
        hidden: true,  
        replace: '*',
        required: true
      }
    }
  };
 
//
// Start the prompt
//
prompt.start();

prompt.get(schema, async function (err, config) {
  getTriremeProxies(config);
});


async function getTriremeProxies(config){
	let triremeProxies = [];
	let apis = await getEntities(config, "apis");
	if (apis === null) {
		console.log("API Proxies: NONE");
		return;
	}
	for (api of apis){
		let apiMetaData = await getEntities(config, "apis/"+api);
		let revisions = apiMetaData.revision;
		for (revision of revisions){
			let revisionMetaData = await getEntities(config, "apis/"+api+"/revisions/"+revision);
			//console.log("API: "+ api+ " Revision: "+ revision+ " resources: "+revisionMetaData.resources);
			if(revisionMetaData.resources !== null && revisionMetaData.resources.length > 0){
				for (var i = 0; i < revisionMetaData.resources.length; i++){
					let pos = revisionMetaData.resources[i].search("node://");
					if(pos > -1){
						triremeProxies.push({
							"api": api,
							"revision": revision
						});
						break;
					}
				}
			}
		}
	}
	console.log("======== Trireme Proxies =========")
	if (triremeProxies === null || triremeProxies.length === 0) {
		console.log("NONE");
		console.log ("==================================")
		return;
	}
	for (proxy of triremeProxies){
		console.log("API: "+ proxy.api);
		console.log("Revision: "+ proxy.revision);
		console.log("==================================");
	}
}

async function getEntities(config, entity){
	//safeLog("Fetching "+entity+" from Apigee org: "+config.org);
	let auth = Buffer.from(config.username+":"+config.password).toString('base64')
	let options = {
	    method: "GET",
	    uri: "https://"+config.host+"/v1/o/"+config.org+"/"+entity,
	    headers: {
        	"Authorization": "Basic "+auth
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

