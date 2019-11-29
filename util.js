var ObjectId = require("mongodb").ObjectID;

var tvData = require("./data/tv-data.json");
var locationData = require("./data/location-data.json");
var browsingData = require("./data/browsing-data.json");

var db = require("./db");
var jwt = require("jsonwebtoken");

function seed(userId, applicationId, consentTv, consentLocation, consentBrowsing) {
  
  var tvLog = [];
  if (consentTv) {
    tvLog = tvData.map(element => {
      element.watched_on = element.watched_on.$date.$numberLong * 10;
      return {
        user: ObjectId(userId), 
        process: ObjectId(applicationId),
        data: "http://www.specialprivacy.eu/vocabs/data#AudiovisualActivity",
        purpose: "http://www.specialprivacy.eu/vocabs/purposes#Telemarketing",
        processing: "http://www.specialprivacy.eu/vocabs/processing#Collect",
        storage: "http://www.specialprivacy.eu/vocabs/locations#OurServers",
        recipient: "http://www.specialprivacy.eu/vocabs/recipients#Ours",
        timestamp: element.watched_on,
        instanceData: element
      } 
    });
  }

  var locationLog = [];
  if (consentLocation) {
    locationLog = locationData.map(element => {
      element.timestamp = element.timestamp.$date.$numberLong * 10;
      return {
        user: ObjectId(userId), 
        process: ObjectId(applicationId),
        data: "http://www.specialprivacy.eu/vocabs/data#Location",
        purpose: "http://www.specialprivacy.eu/vocabs/purposes#Telemarketing",
        processing: "http://www.specialprivacy.eu/vocabs/processing#Collect",
        storage: "http://www.specialprivacy.eu/vocabs/locations#OurServers",
        recipient: "http://www.specialprivacy.eu/vocabs/recipients#Ours",
        timestamp: element.timestamp,
        instanceData: element
      }
    });
  }

  var browsingLog = [];
  if (consentBrowsing) {
    browsingLog = browsingData.map(element => {
      element.timestamp = element.timestamp.$date.$numberLong * 10;
      return {
        user: ObjectId(userId), 
        process: ObjectId(applicationId),
        data: "http://www.specialprivacy.eu/vocabs/data#OnlineActivity",
        purpose: "http://www.specialprivacy.eu/vocabs/purposes#Telemarketing",
        processing: "http://www.specialprivacy.eu/vocabs/processing#Collect",
        storage: "http://www.specialprivacy.eu/vocabs/locations#OurServers",
        recipient: "http://www.specialprivacy.eu/vocabs/recipients#Ours",
        timestamp: element.timestamp,
        instanceData: element
      }
    });
  }

  db.get().collection("log").insertMany(tvLog.concat(locationLog, browsingLog), function(err, res) {
    if (err) {
      throw err
    } else {
      console.log("Successfully generated data.");
    }
  });

}

function response(res, success, msg, result) {
  res.send(JSON.stringify({
    success: success,
    message: msg,
    result: result
  }));
}

function validateToken(token, callback) {
  //TODO: use hash of user password as shared secret
  jwt.verify(token, "password", function(err, decoded) {
    if (!err) {
      db.get().collection("users").findOne({
        username: decoded.subject
      }, function(error, result) {
        if (!err && result !== null) {
          if (result.hasOwnProperty("token")) {
            if (token === result.token) {
              decoded.user = result;
              callback(null, decoded);
            } else {
              callback({msg: "Wrong token provided!"}, decoded);
            }
          } else {
            callback({msg: "Obtain token first!"}, decoded);
          }
        } else {
          callback({msg: "No user with this App-ID!"}, decoded);
        }
      });
    } else {
      callback({msg: "Token not valid!"}, decoded);
    }
  });
}

module.exports = { seed, response, validateToken };