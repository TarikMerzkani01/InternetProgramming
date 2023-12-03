// YOU CAN USE THIS FILE AS REFERENCE FOR SERVER DEVELOPMENT

// include the express module
var express = require("express");

// create an express application
var app = express();
const url = require('url');

// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser');

// fs module - provides an API for interacting with the file system
var fs = require("fs");

// helps in managing user sessions
var session = require('express-session');

// include the mysql module
var mysql = require("mysql");

// helpful for reading, compiling, rendering pug templates
const pug = require("pug");  

// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');
const { response } = require("express");

// A  library that can help read uploaded file for bonus.
// var formidable = require('formidable')


//apply the body-parser middleware to all incoming requests
//app.use(bodyparser());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));

var con = mysql.createConnection({
  host: "cse-mysql-classes-01.cse.umn.edu",
  user: "C4131DF23U63",               // replace with the database user provided to you
  password: "4019",                  // replace with the database password provided to you
  database: "C4131DF23U63",           // replace with the database user provided to you
  port: 3306
});

con.connect(function(err) {
  if (err) {
    throw err;
  }
  console.log("Connected!");
});

// use express-session
// in mremory session is sufficient for this assignment
app.use(session({
  secret: "csci4131secretkey",
  saveUninitialized: true,
  resave: false
}
));

// server listens on port 9007 for incoming connections
app.listen(9007, () => console.log('Listening on port 9007!'));
//changed FROM 9007 to playtest

// function to return the welcome page
app.get('/',function(req, res) {
  res.render(__dirname + '/client/welcome.pug');
});

// SENDS USER TO LOGIN PAGE. THIS IS THE LOCATION FOR LOGGING IN.
// This is the destination for users not logged in attempting to do something else.

// Login Related Routes

app.get('/login',function(req, res) {
  if (req.session.value) {  // already logged in
    res.redirect(302, '/schedule');
  } else {
    res.render(__dirname + '/client/login.pug');
  }
});

// This is the POST method for sending the login details when hitting the button.
app.post('/sendLoginDetails',function(req, res) {
  const quser = req.query.username;
  const qpass = req.query.password;
  //console.log(quser +" "+ qpass);
  con.query('SELECT * FROM tbl_accounts WHERE acc_name=?', [quser],function(err,rows,fields) {
    if (err) throw err;
    if (rows.length == 0) {
      //console.log("NO MATCH");
      res.json({status:"fail"});
    }
    else {
      if (bcrypt.compareSync(req.query.password, rows[0].acc_password)) {
        //login successfully!
        req.session.value = 17;
        res.json({status:"success"});
      } else {
        //console.log("LOGIN FAIL");
        res.json({status:"fail"});
      }
    }
  });
});

// Schedule Related Routes

app.get('/schedule',function(req, res) {
  if (req.session.value) {  // already logged in
    res.render(__dirname + '/client/schedule.pug');
  } else {
    res.redirect(302, '/login');
  }
});

app.get('/getSchedule',function(req, res) {
  if (req.session.value) {  // already logged in
    var myday = req.query.day;
    // console.log(req.query);
    // update 
    const responsejson = [];
    con.query('SELECT * FROM tbl_events WHERE event_day=? ORDER BY event_start', [myday],function(err,rows,fields) {
      if (err) throw err;
      if (rows.length == 0) {
        res.json(responsejson);
      }
      else {
        for (var i = 0 ; i < rows.length; i++) {
          var myevent ={
            "id": rows[i].event_id,
            "name": rows[i].event_event,
            "start": rows[i].event_start,
            "end": rows[i].event_end,
            "phone": rows[i].event_phone,
            "location": rows[i].event_location,
            "info": rows[i].event_info,
            "url": rows[i].event_url
          };
          responsejson.push(myevent);
        }
        res.json(responsejson);
      }
    });
  } else {
    res.redirect(302, '/login');
  }
});


// Add Event Routes

app.get('/addEvent',function(req, res) {
  if (req.session.value) {  // already logged in
    res.render(__dirname + '/client/addEvent.pug');
  } else {
    res.redirect(302, '/login');
  }
});

app.post('/postEventEntry',function(req, res) {
  if (req.session.value) {  // already logged in
    //res.render(__dirname + '/client/addEvent.html');
    //console.log(req.body);
    var event = req.body.event; var day = req.body.day; var start = req.body.start;
    var end = req.body.end; var phone = req.body.phone; var loc = req.body.location;
    var info = req.body.info; var url = req.body.url;
    var rowToBeInserted = {
      event_day: day,
      event_event: event,
      event_start: start,
      event_end: end,
      event_location: loc,
      event_phone: phone,
      event_info: info,
      event_url: url
    };
    con.query('INSERT INTO tbl_events SET ?', rowToBeInserted, function(err, result) {  //Parameterized insert
      if(err) throw err;
      //console.log("Values inserted");
    });
    res.redirect(302, '/schedule');
  } else {
    res.redirect(302, '/login');
  }
});



// DELETE Routes

app.delete('/deleteEvent',function(req, res) {
  if (req.session.value) {  // already logged in
    var myid = req.query.idvalue;
    const responsejson = [];
    con.query('SELECT * FROM tbl_events WHERE event_id=? ORDER BY event_start', [myid],function(err,rows,fields) {
      if (err) res.sendStatus(404); //if error, just return 404
      if (rows.length == 0) {
        // No event in database found with such id
        res.sendStatus(404);
      }
      else {
        con.query('DELETE FROM tbl_events WHERE event_id=?', [myid],function(err,result) {
          if (err) res.sendStatus(404); //if error, just return 404
          else {
            console.log("Events ("+result.affectedRows+") successfully deleted!");
            res.sendStatus(200);
          }
        }); 
      }
    });
  } else {
    res.redirect(302, '/login');
  }
});



// Editing Routes

app.get('/editEvent',function(req, res) {
  if (req.session.value) {  // already logged in
    var myid = req.query.idvalue;
    if (!myid) {
      res.sendStatus(404);
    }
    con.query('SELECT * FROM tbl_events WHERE event_id=? ORDER BY event_start', [myid],function(err,rows,fields) {
      if (err) res.sendStatus(404); //if error, just return 404
      if (rows.length == 0) {
        // No event in database found with such id
        res.sendStatus(404);
      }
      else {
        let i = 0;
        var myevent ={
          "id": rows[i].event_id,
          "day": rows[i].event_day,
          "name": rows[i].event_event,
          "start": rows[i].event_start,
          "end": rows[i].event_end,
          "phone": rows[i].event_phone,
          "location": rows[i].event_location,
          "info": rows[i].event_info,
          "url": rows[i].event_url
        };
        res.render(__dirname + '/client/updateEvent.pug', {record:myevent});
      }
    });
  } else {
    res.redirect(302, '/login');
  }
});

app.post('/editEventEntry',function(req, res) {
  if (req.session.value) {  // already logged in
    var myid = req.query.idvalue;
    var event = req.body.event; var day = req.body.day; var start = req.body.start;
    var end = req.body.end; var phone = req.body.phone; var loc = req.body.location;
    var info = req.body.info; var url = req.body.url;
    var rowToBeUpdated = {
      event_day: day,
      event_event: event,
      event_start: start,
      event_end: end,
      event_location: loc,
      event_phone: phone,
      event_info: info,
      event_url: url
    };
    con.query('UPDATE tbl_events SET ? WHERE event_id=?', [rowToBeUpdated, myid], function(err, result) {  //Parameterized insert
      if(err) res.sendStatus(422);
      else {
        console.log("Row id "+myid+" updated!");
        res.redirect(302, '/schedule');
      }
    });
    
  } else {
    res.redirect(302, '/login');
  }
});

// middle ware to serve static files
app.use('/client', express.static(__dirname + '/client'));

app.get('/logout', function(req,res) {
  if (req.session.value)
    req.session.destroy((err) => {
      if (err) throw err;
      else console.log("Successfully Destroyed Session!");
    });
  // else {
  //   console.log("Not Logged in: req.session.value not set!");
  // }
  res.redirect(302, '/login');
});

// function to return the 404 message and error to client
app.get('*', function(req, res) {
  // add details
  res.sendStatus(404);
});

