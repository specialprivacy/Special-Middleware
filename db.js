const MongoClient = require('mongodb').MongoClient;

const dbName = "specialBackend";
const dbUrl = "mongodb://localhost:27017";
var db = null;

function connect(callback) {
  MongoClient.connect(dbUrl, {useNewUrlParser: true}, function (err, client) {
    if (!err) {
      console.log("Connected to MongoDB successfully!");
      db = client.db(dbName);
    } else {
      console.log("Couldn't connect to MongoDB!");
      console.debug(err);
    }
    callback();
  });
}

function get() {
  return db;
}

function close() {
  db.close();
}

module.exports = { connect, get, close };