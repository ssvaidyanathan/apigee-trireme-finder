const colors = require("colors/safe");
const inquirer = require("inquirer");
const rp = require("request-promise");
const util = require("util");
const pLimit = require("p-limit");
const fs = require("fs");

//Progress bar implementation
const _cliProgress = require("cli-progress");
const b1 = new _cliProgress.SingleBar({
  format:
    "Progress |" +
    colors.cyan("{bar}") +
    "| {percentage}% || {value}/{total} Proxies || ETA: {eta}s",
  barCompleteChar: "\u2588",
  barIncompleteChar: "\u2591",
  hideCursor: true
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

/**
 * retryRequest, a wrapper for async functions allowing retries with timeouts between attempts
 * @param {async ()=>} asyncFunc
 * @param {number of attempts} count
 * @param {how long between attempts} timeOut
 */
const retryRequest = async (
  asyncFunc = () => {},
  count = 5,
  timeOut = 1000
) => {
  const sleep = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds));
  // const result = null;
  let Error;
  let result;
  for (let index = 0; index < count; index++) {
    if (result) return result;
    try {
      result = await asyncFunc();
    } catch (error) {
      Error = error;
      // console.log(error);
      // console.log('retrying ', index + 1);
      await sleep(timeOut);
    }
  }
  if (result) return result;
  throw Error;
};

let questions = [
  {
    type: "input",
    name: "host",
    message: colors.yellow("Please provide the Apigee Management Host: "),
    validate: function(value) {
      if (!value)
        return colors.red("Apigee Management Host name cannot be empty!");
      return true;
    }
  },
  {
    type: "input",
    name: "org",
    message: colors.yellow(
      "Please provide the Apigee Edge Organization name: "
    ),
    validate: function(value) {
      if (!value)
        return colors.red("Apigee Edge Organization name cannot be empty!");
      return true;
    }
  },
  {
    type: "list",
    name: "authType",
    message: colors.yellow("Which Auth type would you like to use?"),
    choices: ["Basic", "OAuth"],
    validate: function(value) {
      if (!value) return colors.red("Please select an Auth type!");
      return true;
    }
  }
];

let basicAuthPrompt = [
  {
    type: "input",
    name: "username",
    message: colors.yellow("Please provide the Apigee Edge username: "),
    validate: function(value) {
      if (!value) return colors.red("Apigee Edge username cannot be empty!");
      return true;
    }
  },
  {
    type: "password",
    name: "password",
    mask: "*",
    message: colors.yellow("Please provide the Apigee Edge password: "),
    validate: function(value) {
      if (!value) return colors.red("Apigee Edge password cannot be empty!");
      return true;
    }
  }
];

let oAuthPrompt = [
  {
    type: "input",
    name: "oauthToken",
    message: colors.yellow("Please provide the Apigee OAuth token: "),
    validate: function(value) {
      if (!value) return colors.red("Apigee OAuth token cannot be empty!");
      return true;
    }
  }
];

inquirer.prompt(questions).then(async function(options) {
  if (options.authType === "Basic") {
    inquirer.prompt(basicAuthPrompt).then(async function(authOptions) {
      await getTriremeProxies(options, authOptions);
    });
  } else {
    inquirer.prompt(oAuthPrompt).then(async function(authOptions) {
      await getTriremeProxies(options, authOptions);
    });
  }
});

async function getTriremeProxies(config, auth) {
  //   let triremeProxies = [];
  console.log("Fetching all proxies in " + config.org + " org...");
  try {
    let apis = await retryRequest(() => getEntities(config, auth, "apis"));

    console.log("Test is being run on " + apis.length + " proxies");

    if (apis === null) {
      console.log("API Proxies: NONE");
      return;
    }
    console.log("Fetch complete");
    console.log("Checking each proxy revision...");
    b1.start(apis.length, 0, {});
    // Limit of queries allowed to run concurrently
    const limit = pLimit(100);
    // Promise array of all the proxy queries
    const promises = apis.map(api => {
      const apiRes = limit(() =>
        retryRequest(async () => {
          try {
            let apiMetaData = await retryRequest(() =>
              getEntities(config, auth, "apis/" + api)
            ).catch(err => {
              throw `Api ${api} FAILED\n` + err;
            });
            let revisions = apiMetaData.revision;
            for (revision of revisions) {
              try {
                let revisionMetaData = await retryRequest(() =>
                  getEntities(
                    config,
                    auth,
                    "apis/" + api + "/revisions/" + revision
                  )
                ).catch(err => {
                  throw `Api ${api} Revision ${revision} has FAILED\n` + err;
                });
                //console.log("API: "+ api+ " Revision: "+ revision+ " resources: "+revisionMetaData.resources);
                if (
                  revisionMetaData.resources !== null &&
                  revisionMetaData.resources.length > 0
                ) {
                  for (var i = 0; i < revisionMetaData.resources.length; i++) {
                    let pos = revisionMetaData.resources[i].search("node://");
                    if (pos > -1) {
                      //   triremeProxies.push({
                      //     api: api,
                      //     revision: revision
                      //   });
                      return {
                        api: api,
                        revision: revision
                      };
                      //   return `Api ${api} Revision ${revision} passed`;
                    }
                  }
                }
              } catch (error) {
                throw `Api ${api} Revision ${revision} has FAILED`;
              }
            }

            // return `Api ${api} passed`;
            return "Passed";
          } catch (error) {
            // b1.increment();
            throw error ? error : `Api ${api} has FAILED`;
          }
        })
          .then(res => {
            b1.increment();
            return res;
          })
          .catch(err => {
            b1.increment();
            throw err ? err : `Api ${api} has FAILED`;
          })
      ).catch(err => err);

      return apiRes;
    });
    await Promise.all(promises).then(res => {
      b1.stop();

      // DEBUG enable this console log to see proxies that failed the check
      const triremeProxies = res.filter(str => {
        return str != "Passed";
      });
      failures = triremeProxies.filter(proxy => {
        return proxy == proxy.api;
      });
      if (failures.length) {
        console.log(failures);
      } else {
        console.log("All proxies were checked without fail");
      }

      console.log("======== Trireme Proxies =========");
      if (triremeProxies === null || triremeProxies.length === 0) {
        console.log("NONE");
        console.log("==================================");
        return;
      }
      for (proxy of triremeProxies) {
        console.log("API: " + proxy.api);
        console.log("Revision: " + proxy.revision);
        console.log("==================================");
      }
      var jsonObj = JSON.stringify(triremeProxies);

      fs.writeFile("output.json", jsonObj, "utf8", err => {
        if (err) {
          console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
        }

        console.log("JSON file has been saved.");
      });
    });
  } catch (error) {
    throw error;
  }
}

async function getEntities(config, authConfig, entity) {
  //safeLog("Fetching "+entity+" from Apigee org: "+config.org);
  let auth = "";
  if (config.authType === "Basic")
    auth =
      "Basic " +
      Buffer.from(authConfig.username + ":" + authConfig.password).toString(
        "base64"
      );
  else auth = "Bearer " + authConfig.oauthToken;
  let options = {
    method: "GET",
    uri:
      "https://" +
      config.host +
      "/v1/organizations/" +
      config.org +
      "/" +
      entity,
    headers: {
      Authorization: auth
    },
    json: true
  };
  try {
    let parsedBody = await rp(options);
    return parsedBody;
  } catch (err) {
    throw safeLog(err);
  }
}

// strip Basic auth from logging
function safeLog(obj) {
  let str = util.inspect(obj);
  return str.replace(/Basic [+/A-Za-z0-9]+/g, "Basic ******");
}
