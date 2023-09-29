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
    // read and write from schedule.jsonfile
    let day = q.query.day;
    readSchedule(req, res, day);
  }
  else if (q.pathname === '/postEventEntry') {
    // write to schedule.json, redirect to schedule.html
    // combine parts of schedPage and readSchedule
    var reqBody = "";
    // server starts receiving the form data
    req.on('data', function (data) {
      reqBody += data;
    }); 
    // server has receieved all the form data
    req.on('end', function() {
      eventEntry(req, res, reqBody);
    });
  }
  else if (q.pathname === '/eventInterferes') {
    // read and write from schedule.jsonfile
    let nday = q.query.day;
    let nstart = q.query.start;
    let nend = q.query.end;
    let eventObj = {
      day : nday,
      start : nstart,
      end : nend
    };
    eventConflict(req, res, eventObj);
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
    var dayEvents = scheduleObj[day];  //it is a string!
    res.statusCode = 200;
    //SET Content-Type to "application/json"
    res.setHeader('Content-type', 'application/json');
    //write "stringify" dayEvents
    res.write(JSON.stringify(dayEvents));
    // Basically sends a JSON string in the body
    // in response.text();
    res.end();
  });
}

function convertMilitary(time) {
  // Conversion from military to standard (obtained from stackoverflow link provided)
  time = time.split(":");
  var hours = Number(time[0]);
  var minutes = Number(time[1]);
  var timeValue = "";
  if (hours > 0 && hours <= 12) {
    timeValue= "" + hours;
  } else if (hours > 12) {
    timeValue= "" + (hours - 12);
  } else if (hours == 0) {
    timeValue= "12";
  }
  timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;  // get minutes
  timeValue += (hours >= 12) ? " PM" : " AM";  // get AM/PM
  return timeValue;
}

function eventConflict(req, res, eventObj) {
  fs.readFile('schedule.json', (err, jsonString) => {
    if (err) {
      throw err;
    }
    let day = eventObj.day.toLowerCase();
    var scheduleObj = JSON.parse(jsonString);
    var dayEvents = scheduleObj[day]; //array of event objects for a certain day!
    var conflictEvents = [];
    let mystart = eventObj.start.split(":");
    let myend = eventObj.end.split(":");
    //convert to amount of minutes since 12:00AM
    mystart = parseInt(mystart[0])*60 + parseInt(mystart[1]);
    myend = parseInt(myend[0])*60 + parseInt(myend[1]);
    if (myend < mystart) {
      myend += 24*60;
    }
    // check if start or end of event in array happens during the event in eventObj
    var givenstart, givenend;
    for (let i = 0; i < dayEvents.length; i++) {
      let ahr = parseInt(dayEvents[i].start.split(':')[0]); //should be a int
      let bhr = parseInt(dayEvents[i].end.split(':')[0]);
      let amin = parseInt(dayEvents[i].start.split(':')[1].split(" ")[0]);
      let bmin = parseInt(dayEvents[i].end.split(':')[1].split(" ")[0]);
      let astat = dayEvents[i].start.split(':')[1].split(" ")[1]; //should be a string AM or PM
      let bstat = dayEvents[i].end.split(':')[1].split(" ")[1];
      //Convert to Military Time
      if (astat === "AM" && ahr == 12) {
        ahr = 0;
      }
      else if (astat === "PM" && ahr != 12) {
        ahr += 12;
      }
      if (bstat === "AM" && bhr == 12) {
        bhr = 0;
      }
      else if (bstat === "PM" && bhr != 12) {
        bhr += 12;
      }
      givenstart = ahr*60 + amin;
      givenend = bhr*60 + bmin;
      //Calculated amount of minutes from 12:00 AM for start and end time of event
      //if conflict, push to conflictEvents array
      if (mystart <= givenstart && givenstart < myend) {
        // conflicts, push specific event to conflictEvents
        conflictEvents.push(dayEvents[i]);
      } else if (mystart < givenend && givenend <= myend) {
        conflictEvents.push(dayEvents[i]);
      } else if (givenstart <= mystart && mystart < givenend){
        conflictEvents.push(dayEvents[i]);
      } else if (givenstart <myend && myend <= givenend) {
        conflictEvents.push(dayEvents[i]);
      }
    }
    res.statusCode = 200;
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(conflictEvents));
    res.end();
  });
}

function eventEntry(req, res, reqBody) {
  // get all values from body of POST request using qs modle <querystring>
  var postObj = qs.parse(reqBody);
  var eday = postObj.day.toLowerCase();
  var ename = postObj.event;
  // times from addEvent.html ALREADY in military time
  var milstart = postObj.start; 
  var milend = postObj.end;
  // Conversion from military to standard (obtained from stackoverflow link provided)
  var estart = convertMilitary(milstart);
  var eend = convertMilitary(milend);

  var ephone = postObj.phone;
  var eloc = postObj.location;
  var einfo = postObj.info;
  var eurl = postObj.url;
  // Put these string values into a JSON object!
  var jsonObj = {};
  jsonObj.name = ename;
  jsonObj.start = estart;
  jsonObj.end = eend;
  jsonObj.phone = ephone;
  jsonObj.location = eloc;
  jsonObj.info = einfo;
  jsonObj.url = eurl;
  // Read schedule.json file  
  var fileJsonString = fs.readFileSync('schedule.json');
  // fs.readFile('schedule.json', (err, jsonString) => {
  //   if (err) {
  //     throw err;
  //   }
  //   fileJsonString = jsonString;
  // });
  // AT THIS POINT, file JsonString should be populated
  
  var parsedJson = JSON.parse(fileJsonString);
  //let's append jsonObj onto end of array of the certain day
  parsedJson[eday].push(jsonObj);

  // SORTING TIME! We sort the array of objects parsedJson[eday]
  // First sort by minutes!
  // Then sort by Hours!

  parsedJson[eday].sort(function(a, b) {
    // a and b are JSON objects with name, start, end, etc. KEYS!
    // sort by start time, first mins
    let amin = a.start.split(':')[1].split(" ")[0]; //should be a string for mins
    let bmin = b.start.split(':')[1].split(" ")[0];
    return amin.localeCompare(bmin);
  });

  parsedJson[eday].sort(function(a, b) {
    // a and b are JSON objects with name, start, end, etc. KEYS!
    // sort by HOURS now, from start time
    let ahr = parseInt(a.start.split(':')[0]); //should be a int
    let bhr = parseInt(b.start.split(':')[0]);
    let astat = a.start.split(':')[1].split(" ")[1]; //should be a string AM or PM
    let bstat = b.start.split(':')[1].split(" ")[1];

    //Convert to Military Time
    if (astat === "AM" && ahr == 12) {
      ahr = 0;
    }
    else if (astat === "PM" && ahr != 12) {
      ahr += 12;
    }
    if (bstat === "AM" && bhr == 12) {
      bhr = 0;
    }
    else if (bstat === "PM" && bhr != 12) {
      bhr += 12;
    }

    return ahr - bhr;
  });

  // parsedJson[eday] is now sorted!

  var newsched = JSON.stringify(parsedJson);

  fs.writeFile('schedule.json', newsched, (err) => { 
    if(err) { 
      throw err; 
    }
  }); 

  // redirect time!
  res.writeHead(302, {
      'Location':'/schedule.html'
  });
  res.end();
}

/*
    let mystart = convertMilitary(eventObj.start).split(":");
    let myend = convertMilitary(eventObj.end).split(":");
    let myshr = mystart[0]; let mysmin = mystart[1].split(" ")[0];
    let myehr = mystart[0]; let myemin = mystart[1].split(" ")[0];
    // check if start or end of event in array happens during the event in eventObj
    var givenshr, givensmin, givenehr, givenemin;
    for (let i = 0; i < dayEvents.length; i++) {
      givenshr = dayEvents[i].start.split(":");
      givensmin = givenshr[1].split(" ")[0];
      givenshr = givenshr[0];
      
      givenehr = dayEvents[i].end.split(":");
      givenemin = givenehr[1].split(" ")[0];
      givenehr = givenehr[0];
      if () {}
      else if () {}


      //if conflict, push to conflictEvents array
    }
    */