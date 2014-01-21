angular.module('wejay').service('socket', function(socketIo, $q, $rootScope) {

  'use strict';

  var socket = socketIo.connect('54.194.197.163');

  console.log('connecting...');

  socket.on('connect', function(){
    console.log('connected!');
  });

  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
  
});