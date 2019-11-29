var express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");
var db = require("../db");
var request = require("request");
var util = require("../util");
var crypto = require('crypto');
var ObjectId = require("mongodb").ObjectID;

router.post("/authenticate", function(req, res, next) {

  if (!req.body.hasOwnProperty("username") || !req.body.hasOwnProperty("password")) {
    util.response(res, false, "Username or password not provided", {});
  } else {
    db.get().collection("users").findOne({
      username: req.body.username,
      isDpo: true
    }, function(err, result) {
      if (!err && result !== null) {
        var hash = crypto.createHash("sha256", result.salt).update(req.body.password).digest("base64");    

        if (result.username === req.body.username && result.password === hash && result.isDpo) {

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
        util.response(res, false, "Authentication was not successful. Wrong credentials or not DPO?", {});
      }
    });
  }
});

router.get("/pull", function(req, res, next) {
  if (typeof req.query.from === "undefined") {
    req.query.from = Date.now() - (1000 * 60 * 60 * 7);
  }
  if (typeof req.query.to === "undefined") {
    req.query.to = Date.now();
  }

  db.get().collection("log")
    .find({$and: [
      {"data": "http://www.specialprivacy.eu/vocabs/data#Message"},
      {"process": ObjectId(req.application._id)},
      {"timestamp": {$gte: Number.parseInt(req.query.from)}},
      {"timestamp": {$lte: Number.parseInt(req.query.to)}}
    ]})
    .toArray(function (error, entries) {
      if (!error) {
        util.response(res, true, "Successfully loaded log entries", entries);
      } else {
        util.response(res, false, "Error loading event log entries.", error);
      }
    });
});

module.exports = router;