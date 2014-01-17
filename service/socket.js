angular.module('wejay').service('socket', function(socketIo, $q, $rootScope) {

  'use strict';

  var socket = socketIo.connect('http://node-wejay-415927084.eu-west-1.elb.amazonaws.com');

  function nodeify(func) {
    return function() {
      var response, err;

      // optionally convert response to node conventions with err, response
      if(arguments.length === 0) {
        // no error, no response. That means OK
      } else if(arguments.length === 2) {
        err = arguments[0];
        response = arguments[1];
      } else if('string' === typeof arguments[0]) {
        err = arguments[0];
      } else {
        if(arguments[0].ok) {
          response = arguments[0];
        } else {
          err = arguments[0];
        }
      }

      func.apply(null, [err,response]);
    };
  }

  var service = {
    on: function() {
      var args = Array.prototype.slice.call(arguments);
      
      var promise;

      // If no callback is passed, create and return a promise
      if('function' !== typeof args[args.length-1]) {
        var deferred = $q.defer();
        promise = deferred.promise;

        args.push(function(event) {
          deferred.resolve(event);
        });
      }

      socket.on.apply(socket, args);
      return promise;
    },
    emit: function() {
      var args = Array.prototype.slice.call(arguments);
      var promise;

      // If no callback is passed, create and return a promise
      if('function' !== typeof args[args.length-1]) {
        var deferred = $q.defer();
        promise = deferred.promise;

        args.push(nodeify(function(err, response) {
          if(err) {
            deferred.reject(err);
          } else {
            deferred.resolve(response);
          }
        }));
      }

      socket.emit.apply(socket, args);

      return promise;
    }
  };

  return service;
});