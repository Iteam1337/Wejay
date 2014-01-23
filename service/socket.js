angular.module('wejay').service('socket', function(socketIo, $q, $rootScope) {

  'use strict';

  var socket = socketIo.connect('node.wejay.org', {transports:['xhr-polling', 'jsonp-polling']});

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