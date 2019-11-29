var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var logRouter = require('./routes/log');
var dpoRouter = require('./routes/dpo');

var app = express();
var db = require("./db");
var util = require("./util");

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); //TODO: will change
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type, x-api-key");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Content-Type", "application/json");
  next();
});

app.use(function (req, res, next) {
  var apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "undefined") {
    util.response(res, false, "API key not provided.", {});
  } else {
    db.get().collection("apiKey").findOne({apiKey: apiKey}, function (err, result) {
      if (!err && result !== null) {
        req.application = result;
        next();
      } else {
        util.response(res, false, "API key might be wrong!", {errorMsg: err, result: result});
      }
    })
  }
});

// source: https://stackoverflow.com/a/51981393
var unless = function(middleware, ...paths) {
  return function(req, res, next) {
    console.log(req.path);
    const pathCheck = paths.some(path => path === req.path);
    pathCheck ? next() : middleware(req, res, next);
  };
};

app.use(unless(function (req, res, next) {
  var token = req.headers["authorization"];
  if (typeof token === "undefined") {
    util.response(res, false, "No Authorization header provided", {});
    return;
  } else {
    token = token.replace("Bearer ", "");
  }

  util.validateToken(token, function (err, decoded) {
    if (!err) {
      req.user = decoded.user;
      next();
    } else {
      util.response(res, false, "Error validating token!", err);
    }
  });
},
  "/api/subscribe/",
  "/api/subscribe",
  "/api/authenticate/",
  "/api/authenticate",
  "/api/dpo/authenticate/",
  "/api/dpo/authenticate",  
));

app.use("/api/", indexRouter);
app.use("/api/log", logRouter);
app.use("/api/dpo", dpoRouter);

module.exports = app;

db.connect(function() {
  app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
    // util.seed();
  })
});