
angular.module('wejay').service('spotifyAPI',function($rootScope) {

  'use strict';

	var spotifyAPI = {
    events: {}
  };

  spotifyAPI.on = spotifyAPI.addEventListener = function(name, listener) {
    if(!(this.events[name] && this.events[name] instanceof Array)) {
      this.events[name] = [];
    }
    this.events[name].push(listener);
  };

  spotifyAPI.off = spotifyAPI.removeEventListener = function(name, listener) {
    if(this.events[name] instanceof Array) {
      this.events[name] = this.events[name].filter(function(l) { return l !== listener; });
      if(!this.events[name].length) {
        delete this.events[name];
      }
    }
  };

  spotifyAPI.removeEventListeners = function(name) {
    if(name) {
      delete this.events[name];
    } else {
      this.events = {};
    }
  };

  spotifyAPI.emit = function(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    if(this.events[name] instanceof Array) {
      this.events[name].forEach(function(l) {
        l.apply(null, args);
      });
    }
  };

  require(['$api/auth#Auth', '$api/audio', '$api/models','$api/toplists#Toplist', '$views/image#Image','$api/library#Library', '$api/facebook'], function (Auth, audio, models, toplist, image, library, facebook) {
    models.application.addEventListener('dropped', function() {
      spotifyAPI.emit('dropped', models.application.dropped);
    });

    spotifyAPI.auth    = new Auth();
    spotifyAPI.audio   = audio;
    spotifyAPI.models  = models;
    spotifyAPI.toplist = toplist;
    spotifyAPI.image   = image;
    spotifyAPI.library = library;
    spotifyAPI.facebook = facebook;

    $rootScope.$broadcast('appReady');
  });

  /*models.application.addEventListener('dropped', function() {
   var dropped = models.application.dropped; // it contains the dropped elements
  });*/

	return spotifyAPI;
});
