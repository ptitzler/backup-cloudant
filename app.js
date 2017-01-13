/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var http = require('http');
var environment = require('./environment');
var operations = require('./operations');

// create a new express server
var app = express();

//run the backup every 24 hours, or 86400000 milliseconds
setInterval( operations.backup, environment.backup_interval);


//serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

http.createServer(app).listen(environment.appEnv.port, environment.appEnv.bind, function(){
    console.log("Storage application started: " + environment.appEnv.bind + ":" + environment.appEnv.port);
    operations.backup();
});
