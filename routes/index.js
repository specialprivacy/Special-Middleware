var express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");
var db = require("../db");
var request = require("request");
var grabity = require("grabity");
var util = require("../util");
var crypto = require('crypto');
var ObjectId = require("mongodb").ObjectID;

// https://stackoverflow.com/a/17415677
Date.prototype.toIsoString = function() {
  var tzo = -this.getTimezoneOffset(),
      dif = tzo >= 0 ? '+' : '-',
      pad = function(num) {
          var norm = Math.floor(Math.abs(num));
          return (norm < 10 ? '0' : '') + norm;
      };
  return this.getFullYear() +
      '-' + pad(this.getMonth() + 1) +
      '-' + pad(this.getDate()) +
      'T' + pad(this.getHours()) +
      ':' + pad(this.getMinutes()) +
      ':' + pad(this.getSeconds()) +
      dif + pad(tzo / 60) +
      ':' + pad(tzo % 60);
}

router.post("/subscribe", function(req, res, next) {
  if (!req.body.hasOwnProperty("username") || !req.body.hasOwnProperty("password")) {
    util.response(res, false, "Username or password not provided.", {});
  } else {

    db.get().collection("apiKey").findOne({
      apiKey: req.headers["x-api-key"]
    }, function (error, application) {
      if (!error && application !== null) {

        db.get().collection("users").find({
          username: req.body.username
        }).toArray(function(err, docs) {
          if (docs.length === 0) {
            var salt = getRandomString()
            var hash = crypto.createHash("sha256", salt).update(req.body.password).digest("base64");
            var userObject = {
              username: req.body.username,
              password: hash,
              salt: salt
            };
    
            db.get()
              .collection("users")
              .insertOne(userObject, function(error, result) {
                if (!error) {
                  if (application.apiKey === "38895e56-554f-4ca0-ab1c-4716482d2882") {
                    util.seed(userObject._id, application._id, true, true, true);
                  }
                  util.response(res, true, "User successfully created!", userObject);
                } else {
                  util.response(res, false, "Error while creating user!", {});
                }
              });
          } else {
            util.response(res, false, "User already exists!", {});
          }
        });

      }
    });
  }
});

router.post("/authenticate", function(req, res, next) {

  if (!req.body.hasOwnProperty("username") || !req.body.hasOwnProperty("password")) {
    util.response(res, false, "Username or password not provided", {});
  } else {
    db.get().collection("users").findOne({
      username: req.body.username,
    }, function(err, result) {
      if (!err && result !== null) {
        var hash = crypto.createHash("sha256", result.salt).update(req.body.password).digest("base64");    

        if (result.username === req.body.username && result.password === hash) {

          if (!result.hasOwnProperty("token")) {
            var token = jwt.sign({
              expiredIn: "365 days",
              audience: "all",
              issuer: "servers-pub-key",
              subject: req.body.username
            }, "password"); //TODO: use hash of user password as shared secret
  
            result.token = token;
            db.get().collection("users").updateOne({
              username: result.username,
              password: result.password
            }, {$set: result}, function(error, r) {
              if (!error) {
                util.response(res, true, "Authentication was successful", token);
              } else {
                util.response(res, false, "Authentication was not successful", error);
              }
            });
          } else {
            util.response(res, true, "Authentication was successful", result.token);
          }
          
        } else {
          util.response(res, false, "Authentication was not successful. Wrong credentials?", {});
        }
      } else {
        util.response(res, false, "Authentication was not successful. Wrong credentials?", {});
      }
    });
  }
});

router.get("/company", function(req, res, next) {
  if (typeof req.query.company === "undefined") {
    util.response(res, false, "No company name provided.", {});
  }
});

router.get("/link", function(req, res, next) {
  (async () => {
    var urlInfo = await grabity.grab(decodeURIComponent(req.query.url));
    util.response(res, true, "Successfully retrieved link preview.", urlInfo);
    })().catch((error) => {
    util.response(res, false, "Error retrieving link preview.", error);
    });
});

router.get("/events", function(req, res, next) {
  const options = {
    url: "https://search-test.uitdatabank.be/events",
    headers: {
      "x-api-key": ""
    },
    qs: {
      coordinates: req.query.lat + "," + req.query.lon,
      distance: "35km",
      embed: true,
      hasMediaObjects: true,
      start: req.query.start,
      limit: req.query.limit,
      dateFrom: new Date(Date.now()).toIsoString(),
      dateTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 31).toIsoString(),
      languages: "nl",
      q: "_exists_:name.nl AND _exists_:description.nl"
    }
  };

  request.get(options, function(err, response, events) {
    if (err) {
      util.response(res, false, "Error while retrieving events.", err);
    } else {
      util.response(res, true, "Events successfully retrieved.", JSON.parse(events));
    }
  });
  
  var logEntry = {
    user: ObjectId(req.user._id),
    process: ObjectId(req.application._id),
    data: "http://www.specialprivacy.eu/vocabs/data#Location",
    purpose: "http://www.specialprivacy.eu/vocabs/purposes#Telemarketing",
    processing: "http://www.specialprivacy.eu/vocabs/processing#Collect",
    storage: "http://www.specialprivacy.eu/vocabs/locations#OurServers",
    recipient: "http://www.specialprivacy.eu/vocabs/recipients#Ours",
    timestamp: Date.now(),
    instanceData: {
      lat: req.query.lat,
      lon: req.query.lon,
      timestamp: Date.now()
    }
  }
  db.get().collection("log").insertOne(logEntry, function(e, entry) {
    if (!e && entry !== null) {
      console.log("Pushed log entry successfully to DB: " + entry);
    } else {
      console.error("Error while inserting log entry: " + entry);
    }
  });
});

router.get("/movie", function(req, res, next) {
  const options = {
    url: "https://api.themoviedb.org/3/search/movie",
    headers: {
    },
    qs: {
      api_key: "",
      query: req.query.movie,
    }
  };

  request.get(options, function(err, response, result) {
    if (err) {
      util.response(res, false, "Error while retrieving events.", err);
      return;
    }
    util.response(res, true, "Events successfully retrieved.", JSON.parse(result));
  });
});

// TODO: merge following endpoints into two
// TODO: simply generalize method

router.get("/application", function(req, res, next) {
  util.response(res, true, "Application read successfully", req.application);
});

router.get("/user", function(req, res, next) {
  if (typeof req.query.attribute === "undefined") {
    util.response(res, true, "User read successfully", req.user);
  } else {
    if (req.user.hasOwnProperty(camelize(req.query.attribute))) {
      util.response(res, true, "User attribute read successfully", req.user[camelize(req.query.attribute)]);
    } else {
      util.response(res, false, "User has no attribute " + camelize(req.query.attribute), {attribute: camelize(req.query.attribute)});
    }
  }
});

router.post("/user", function(req, res, next) {
  if (typeof req.query.attribute === "undefined") {
    util.response(res, false, "Please specify an attribute", {});
  } else {
    updateUser(req, res, req.query.attribute);
  }
});

router.get("/consent", function(req, res, next) {  
  util.response(res, true, "Consent read successfully", req.user.consent);
});

router.post("/consent", function(req, res, next) {
  updateUser(req, res, "consent");
});

router.get("/interest-profile", function(req, res, next) {
  util.response(res, true, "Profile read successfully", req.user.interestProfile);
});

router.post("/interest-profile", function(req, res, next) {
  updateUser(req, res, "interest-profile");
});

function updateUser(req, res, attribute) {
  var camelizedAttribute = camelize(attribute);
  req.user[camelizedAttribute] = req.body;
  db.get().collection("users").updateOne({
    "_id": ObjectId(req.user._id)
  }, {$set: req.user}, function (error, r) {
    if (!error) {
      util.response(res, true, attribute + " updated successfully", req.user[camelizedAttribute]);
    } else {
      util.response(res, false, attribute + " updated not successfully", error);
    }
  });
}

// source: https://stackoverflow.com/a/52551910
function camelize(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

// source: https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
var getRandomString = function(){
  return crypto.randomBytes(32).toString("hex");
};

module.exports = router;


