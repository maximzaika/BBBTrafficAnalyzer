var admin = require("firebase-admin");
var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 5000; // assigns the port

var serviceAccount = require("./serviceAccountKey.json"); // Gets the service account key JSON file contents

admin.initializeApp({ // Grand admin access, and start the app with a service account
  credential : admin.credential.cert(serviceAccount),
  databaseURL: "https://pir-motion-sensor-68847.firebaseio.com"
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db  = admin.database();
var ref_ped = db.ref("/pedestrians"); // stores all the pedestrian data in db
var ref_long = db.ref("/long"); // stores all the long data in db
var ref_short = db.ref("/short"); // stores all the short data in db
var start = "off"; //initially the sensor is off

/** @desc allows access to a static directory, which can be used to search
          folders/files, such as .css, .js, .php etc. */
app.use(express.static(path.join(__dirname, '/Public')));

app.get('/', function(req, res){ //access to the main page, a.k.a. index.htm
  res.sendFile(__dirname + '/index.html');
});

http.listen(port, function() { //listens to the port, and displays on server console
  console.log('listening on *: ' + port);
});

io.on('connection', function(socket) {
	console.log('PASS: user connected '); //detects connected user

  /* ----------------------toggle on/off pir sensor------------------------- */
  /** @desc 1. sensor is off by default
            2. when it detectes that it is off, it will power on the sensor (execute the code)
               and will send "on" to the client, saying that state changed from "off" to "on"
            3. client will receive it, and will update notification on the website (to on)
            p.s. same for off */
  socket.on('start_sensor', function(data) {
      if (start === "off") { // client receives "off", meaning devices has been powered on, and updates the website
        stop_short = setInterval(check_short_PIR, short_motion); // executes check_short_PIR funciton every 4 seconds
        stop_test = setTimeout(start_long,2000); // executes the function start_long after 2 seconds
        start = "on"; // changes state to "on"
        io.emit("start_sensor", start);
        console.log('PASS: PIR Motion Sensor toggled on')
      } else {
        clearInterval(start_long_interval); //shuts off the code for long (in the previous function)
        clearInterval(stop_short); //shuts off the code for short (in the previous function)
        start = "off";// changes state back to "off"
        io.emit("start_sensor", start);
        console.log('PASS: PIR Motion Sensor toggled off')
      }
  });

   /* ---------------------toggle on/of led light-------------------------- */
   /** @desc 1. receives state of the led light (state.value). If 0 = off, if 1 = on.
             2. sends 0 or 1 to the client, and client sets the notification on the website
                accordingly. */
   socket.on('led_state', function(data) {
     b_script.digitalRead(led, function (state) {
       if (state.value === 0) {
         toggle_on_led();
         console.log('PASS: LED light has been toggled on.')
         io.emit('led_state', state.value);
       } else {
         toggle_off_led();
         console.log('PASS: LED light has been toggled off.')
         io.emit('led_state', state.value);
       };
     });
    });

   /* -------------receive data from the firebase databases----------------- */
  ref_ped.on("child_added", function (data) { //from pedestian parent, receives all the child nodes
      var pedGet = data.val();
      var pedIS = pedGet.pedestrians_crossed; //gets just the number we need (0,1,2,3)
      io.emit('ped_added', pedIS);
  });

  ref_long.on("child_added", function (data) { //from long parent, receives all the child nodes
      var longGet = data.val();
      var longIS = longGet.long_motions; //gets just the number we need (0,1,2,3)
      io.emit('long_added', longIS);
  });

  ref_short.on("child_added", function (data) { //from long parent, receives all the child nodes
      var shortGet = data.val();
      var shortIS = shortGet.short_motions; //gets just the number we need (0,1,2,3)
      io.emit('short_added', shortIS);
  });

  /* ----------------------------reset firebase db---------------------------- */
  socket.on('reset_firebase', function(data){
    console.log('PASS: Firebase db has been reset')
    admin.database().ref().remove(); //reset database
    motion = [] //resets the array

    count_short = 0; // resets the counter
    count_long = 0;
    pedestrians_crossed = 0; // resets the counter

    ref_short.push( { // resets the counter in the db
      short_motions: 0
    });

    ref_long.push( { //resets the counter in the db
      long_motions: 0 // resets the counter
    });

    ref_ped.push( { // resets the counter in the db
      pedestrians_crossed: 0
    });
    io.emit("reset_firebase");
   });
});

/* ----------------------read data from the sensor--------------------------- */

/** @desc Intervals between Short and Long explained:

   Short starts immediately upon execution of the code. Long
   starts 2 seconds later. Short motion repeats every 4 seconds.
   Long motion repeates every 4 seconds. Eventually difference between
   two motions become 2 seconds. Example provided below.

   SS = Short Start    |     S = Short Motion
   LS = Long Start     |     L = Long Motion

   Short  :  SS       S           S
   Seconds:  1  2  3  4  5  6  7  8  9  10
   Long   :    LS           L           L */

/*** @desc hiddent counter which increments each second. Activates whenever
           pedestrian passes the sensor. */
function startSeconds() {
  seconds++;
};

function stopSeconds() { //used for resetting the startSeconds() function
  seconds = 0;
};

/*** @desc separate function for executing the long counter. Previously,
           timeout is used, but timeout reads functions only, therefore this whole
           thing has been moved to a function. **/
start_long = function () {
  start_long_interval = setInterval(check_long_PIR, long_motion) // executes check_long_PIR function every 4 seconds
}

/*** @desc the line of code inside the function is called by the interval, but
           interval accepts functions only so it has been moved inside the function */
function check_short_PIR() {
  b_script.digitalRead('P8_19', print_short_Status);
}

/*** @desc the line of code inside the function is called by the interval, but
           interval accepts functions only so it has been moved inside the function */
function check_long_PIR() {
  b_script.digitalRead('P8_19', print_long_Status);
}

/*** @desc counts short motions. If motion has been detected, it gets pushed
           to a firebase db, otherwise ignored. 'X' is the value 0 or 1 that
           is identified by PIR sensor. 1 = detected. 0 = not detected. */
function print_short_Status(x) {
  if(x.value === 1){
    count_short++;
    motion.push("short");

    ref_short.push( { //pushes the count_short data to a server
      short_motions: count_short
    });

    console.log("[" + count_short + " SHORT] Motion Detected");
    verify_pedestrian(); // checks the set of motions to identify the pedestrian
  } else {
    console.log("[SHORT] No motion Detected");
  }
}

/*** @desc counts long motions. If motion has been detected, it gets pushed
           to a firebase db, otherwise ignored. 'X' is the value 0 or 1 that
           is identified by PIR sensor. 1 = detected. 0 = not detected. */
function print_long_Status(x) {
  if(x.value === 1) {
    count_long++;
    motion.push("long");

    ref_long.push( { //pushes the count_long data to a server
      long_motions: count_long
    });

    console.log("[" + count_long + " LONG] Motion Detected");
    var check_cross = verify_pedestrian(); // checks the set of motions to identify the pedestrian

    /** @desc Whenever pedestrian crosses in more than 15 seconds, it Toggles On the LED
      light for 15 seconds (with auto shutdown), enables the timer for 15 seconds
      (with auto shutdown in case another person crosses in 15 seconds). */
    if (check_cross === true && seconds === 0) {
      toggle_on_led();

      timer = setInterval(startSeconds,1000); // every second increases the counter to imitate the timer

      stopTimer = function () { // used for shutting down the timer
        clearInterval(timer);
      };

      setTimeout(stopTimer, 15000); // shuts off the timer after 15 seconds
      ledTimeout = setTimeout(toggle_off_led, 15000); // shuts off the LED aftet 15 seconds
      secondsTimeout = setTimeout(stopSeconds, 15000); // resets the timer to 0 after 15 seconds

      check_cross = false;
    };

    /** @desc Whenever another person crosses within 15 seconds, it extends the time of
      the LED light for 5 seconds. Used formula: 15 seconds-current_seconds+5 seconds.
      It automatically shuts off the light, stops the timer, and resets the seconds
      based on a new time. */
    if (check_cross === true && (seconds > 0 && seconds < 15)) {
      clearTimeout(ledTimeout); // shuts off previous LED timer immediately
      clearTimeout(secondsTimeout); // shuts off previous seconds timer immediately

      var new_seconds = ((15000-(seconds * 1000)) + 5000);

      seconds = 0; // resets seconds, to start the count again later on
      new_timer = setInterval(startSeconds,1000);

      stop_newTimer = function () { // used for shutting down the new timer
        clearInterval(new_timer);
      };

      setTimeout(stop_newTimer, new_seconds); // shuts off the timer after NEW seconds
      ledTimeout = setTimeout(toggle_off_led, new_seconds); // shuts off LED after NEW seconds
      secondsTimeout = setTimeout(stopSeconds, new_seconds); // resets seconds after NEW seconds

      check_cross = false;
    };
    } else {
      console.log("[LONG] No motion Detected");
    };
};

function toggle_on_led() {
  b_script.digitalWrite(led, 1);
};

function toggle_off_led() {
  b_script.digitalWrite(led, 0);
};

function verify_pedestrian() {
  var motion_0 = false;
  var motion_1 = false;
  var motion_2 = false;
  var motion_3 = false;
  console.log(motion);

  for (i=0; i < motion.length; i++) {
    // reset the motions if the sequence is broken
    if ((i === 0 && motion[i] === 'short') || (i === 1 && motion[i] === 'long') || (i === 2 && motion[i] === 'short') || (i === 3 && motion[i] === 'short')) {
      motion = [];
      break;
    };

    if ((i === 0)  && (motion[i] === 'long')) { // if 1st motion = long then pass
      motion_0 = true;
    };

    if ((i === 1)  && (motion[i] === 'short')) { // if 2nd motion = short then pass
      motion_1 = true;
    };

    if ((i === 2)  && (motion[i] === 'long')) { // if 3rd motion = long then pass
      motion_2 = true;
    };

    if ((i === 3)  && (motion[i] === 'long')) { // if 4th motion = long then pass
      motion_3 = true;

      /* if all the motions above are combined into a series of long, short, long, long then
         pedestrian has crossed */
      if ((i === 3) && (motion_0 === true) && (motion_1 === true) && (motion_2 === true) && (motion_3 === true)) {
        count_pedestrian++;
        console.log('Pedestrian Crossed: ' + count_pedestrian)
        ref_ped.push( {
          pedestrians_crossed: count_pedestrian,
        });
        motion = []
        return true;
      };
    };

    /* if all 4 motions are wrong, then resets the motion */
    if ((i === 3) && ((motion_0 === false) || (motion_1 === false) || (motion_2 === false) || (motion_3 === false))) {
      motion = []
      console.log("RESET TABLE")
    };
  };
};

var b_script = require('bonescript'); //calls the BeagleBone Black script
var led = "P8_8"; //input for led light
var pir = "P8_19"; //input for pir motion sensor
var short_motion = 4000; // Check sensor for short motion every 2 Seconds
var long_motion = 4000; // Check sensor for long motion every 3 Seconds
var seconds = 0; // used for couting the time whenver pedestrian crosses
motion = []; //stores the motions, and compares for the right motions

/* gets the value of the latest short in firebase db. A.k.a count_short = x */
ref_short.on("child_added", function (data) {
    var shortGet = data.val();
    var shortIS = shortGet.short_motions;
    count_short = shortIS;
});

/* gets the value of the latest long in firebase db. A.k.a count_long = x */
ref_long.on("child_added", function (data) {
    var longGet = data.val();
    var longIS = longGet.long_motions;
    count_long = longIS;
});

/* gets the value of the latest pedestrian crossed in firebase db. A.k.a count_pedestrin = x */
ref_ped.on("child_added", function (data) {
    var pedGet = data.val();
    var pedIS = pedGet.pedestrians_crossed;
    count_pedestrian = pedIS;
});

b_script.pinMode(led, 'out'); //uses the script to identify the out of the led
b_script.pinMode(pir, b_script.INPUT); //uses the script to identify the input of pir
