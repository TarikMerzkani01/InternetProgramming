const http = require('http');
const url = require('url');
const fs = require('fs');
const qs = require('querystring');

// Updated createServer.js by Tarik Merzkani 3/27/2023 Lec 18 Ex1
const port = 9001;
http.createServer(function(req, res) {
  var q = url.parse(req.url, true);
  if (q.pathname === '/') {
    indexPage(req, res);
  }
  else if (q.pathname === '/index.html') {
    indexPage(req, res);
  }
  else if (q.pathname === '/schedule.html') {
    schedPage(req, res);
  }
  else if (q.pathname === '/addEvent.html') {
    addEventPage(req, res);
  }
  else if (q.pathname === '/getSchedule') {
    //get the day from the parameters passed with the GET request sent by the FETCH on the schedule.html page
    //Use Query
    //Read Schedule (req, res, day)

    // parameter
    readSchedule(req, res, day);

  }
  else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    return res.end("404 Not Found");
  }
}).listen(port);


function indexPage(req, res) {
  fs.readFile('client/index.html', (err, html) => {
    if (err) {
      throw err;
    }
    res.statusCode = 200;
    res.setHeader('Content-type', 'text/html');
    res.write(html);
    res.end();
  });
}

function schedPage(req, res) {
  fs.readFile('client/schedule.html', (err, html) => {
    if (err) {
      throw err;
    }
    res.statusCode = 200;
    res.setHeader('Content-type', 'text/html');
    res.write(html);
    res.end();
  });
}

function addEventPage(req, res) {
  fs.readFile('client/addEvent.html', (err, html) => {
    if (err) {
      throw err;
    }
    res.statusCode = 200;
    res.setHeader('Content-type', 'text/html');
    res.write(html);
    res.end();
  });
}

// function readSchedule 
function readSchedule(req, res, day) {
  fs.readFile('schedule.json', (err, jsonString) => {
    if (err) {
      throw err;
    }
    var scheduleObj = JSON.parse(jsonString);
    //day either = 'monday', 'tuesday', etc.
    var dayEvents = scheduleObj.day;  //it is a string!
    //
    res.statusCode = 200;
    //SET Contnt-Type to "application/json"
    res.setHeader('Content-type', 'application/json')
    //write "stringify" dayEvents
    res.write(JSON.stringify(dayEvents));
    //Basically sends a JSON string in the body
    // in response.text();
    res.end();
  });
}
