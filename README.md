# Background Information

It is Traffic Analyzer using Beaglebone Black (BBB) and PRI Motion 
Sensor connected to it. This project was completed long ago but wasn't 
posted to github. Due to no longer having access to BBB, there isn't any
video to show its functionality.

## Description

Application the counts the number of pedestrians walking through
the door or a corridor. The server and clients communicate in real-time
using cloud-based storage.

- 4 consecutive motions of sequence Long Short Long Long = new person

    - Long and short motions are the motions that have length of more
      or less than a threshold of 3 seconds

The server, connected to IoT kit (BBB) sends the motion sensor's data to
the Firebase DB. The client is listening to any update that happens
to the same DB.

## Languages & Libraries Used

HTML, CSS, jQuery, JavaScript, Socket.IO, ExpressJS, 
Firebase-Admin, BBB API

## Server Side Features

- Receive data from the motion sensor
- Send data (motion object) to the Firebase DB
- Listen to commands

    - LED on/off
  
      - LED will turn on for 15 seconds if person passes (motion is detected)
      - If another person is detected within 15 seconds, then extend the LEO duration for another 5 seconds
  
    - Sensor on/off
    - Reset the DB

## Client Side Features

- Fetch old data from Firebase if it exists
- Listen to new updates from the server (new motions)
- Display the following messages:

    1. Total number of long messages
    2. Total number of short messages
    3. Total number of visitors (where 1 person = 4 consecutive motions LSLL)
    4. Send Reset DB command to the server
    5. Send LED on/off command to the server
    6. Send Sensor on/off to the server

## Installation & Beaglebone and PIR Motion Configuration

## Installation 

1. Configure BBB based on the LED and PIR Motions Sensor pins described below
2. Run ```npm install```
3. Update serviceAccountKey.json (these keys are no longer functional)
4. In the ```server.js``` replace the following line with your Firebase DB URL (the one given is no longer functional):

    ```javascript
    admin.initializeApp({ 
      credential : admin.credential.cert(serviceAccount),
      databaseURL: "https://pir-motion-sensor-68847.firebaseio.com"
    });
    ```

5. Run ```node server.js```
6. Access the dashboard via ```localhost:5000```

### LED Pins:

1. Ground: P8_2
2. Input/Output: P8_8

### PIR Motions Sensor Pins:

1. Ground: P9_1
2. VCC: P9_7
3. Input/Output: P8_19
