var express = require("express");
var router = express.Router();
var db = require("../db");
var ObjectId = require("mongodb").ObjectID;
var util = require("../util");

router.get("/pull", function(req, res, next) {
  if (typeof req.query.from === "undefined") {
    req.query.from = Date.now() - (1000 * 60 * 60 * 7);
  }
  if (typeof req.query.to === "undefined") {
    req.query.to = Date.now();
  }

  db.get().collection("log")
    .find({$and: [
      {"user": ObjectId(req.user._id)},
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

router.post("/push/raw", function(req, res, next) {
  if (!req.body.hasOwnProperty("data") ||
      !req.body.hasOwnProperty("purpose") ||
      !req.body.hasOwnProperty("processing") ||
      !req.body.hasOwnProperty("storage") ||
      !req.body.hasOwnProperty("recipient")) {
        util.response(res, false, "Error pushing data to log. Please specify the big 5.", {});  
      }

  req.body.user = req.user._id;
  req.body.process = req.application._id;
  req.body.timestamp = Date.now();

  db.get().collection("log").insertOne(req.body, function(e, entry) {
    if (!e && entry !== null) {
      util.response(res, true, "Successfull pushed data to log", entry);
    } else {
      util.response(res, false, "Error pushing data to log. x02", {});
    }
  });
});

router.post("/push", function(req, res, next) {
  var logEntry = {
    user: ObjectId(req.user._id),
    process: ObjectId(req.application._id),
    data: "http://www.specialprivacy.eu/vocabs/data#Location",
    purpose: "http://www.specialprivacy.eu/vocabs/purposes#Telemarketing",
    processing: "http://www.specialprivacy.eu/vocabs/processing#Collect",
    storage: "http://www.specialprivacy.eu/vocabs/locations#OurServers",
    recipient: "http://www.specialprivacy.eu/vocabs/recipients#Ours",
    timestamp: Date.now(),
    instanceData: req.body
  }
  db.get().collection("log").insertOne(logEntry, function(e, entry) {
    if (!e && entry !== null) {
      util.response(res, true, "Successfull pushed data to log", entry);
    } else {
      util.response(res, false, "Error pushing data to log. x02", {});
    }
  });
});

module.exports = router;