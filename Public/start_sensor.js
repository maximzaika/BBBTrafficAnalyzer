$(function () {
  var socket = io(); // reads the sockets

  /* ----------------------toggle on/off pir sensor------------------------- */
  $('#toggle_pir').on('click', function() { //identifies the click of the toggle_pir button
    socket.emit('start_sensor');
  });

  socket.on('start_sensor', function(data) { //receives the current state of the sensor from the server
    if (data === "off") { // receives that devices changed state from on to off
      $('#notification').text('PIR Sensor Toggled Off!');
    } else { // receives that devices changed state from off to on
      $('#notification').text('PIR Sensor Toggled On!');
    }
  });

  /* ---------------------toggle on/of led light-------------------------- */
  $('#toggle_led').on('click', function() { //identifies the click of the toggle_led button
    socket.emit('led_state');
  });

  socket.on('led_state', function(data) { //receives the current state of the led light from the server
    if (data === 0) { // 0 (off) changed to 1 (on)
      $('#notification').text('LED Light Toggled On!');
    } else { // 1 (on) changed to 0 (off)
      $('#notification').text('LED Light Toggled Off!');
    }
  });

  /* ----------receives server data and pushes it to the website----------- */
  socket.emit('ped_added', $('#msg1').val());
  socket.emit('short_added', $('#msg2').val());
  socket.emit('long_added', $('#msg3').val());

  socket.on('ped_added', function(msg) {
    $('#msg1').text(msg);
  });

  socket.on('short_added', function(msg) {
    $('#msg2').text(msg);
  });

  socket.on('long_added', function(msg) {
    $('#msg3').text(msg);
  });

  /* ------------------------reset firebase db---------------------------- */
  $('#reset').on('click', function(){
    socket.emit('reset_firebase');
  });

  socket.on('reset_firebase', function(data) {
    $('#notification').text('Firebase Database has been reset!');
  });

});
