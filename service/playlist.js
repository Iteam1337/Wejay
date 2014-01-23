angular.module('wejay').service('playlist',function($rootScope, spotifyAPI, User, socket) {

  'use strict';

	var playlist = {
    pending: [],
    played: []
  };

  spotifyAPI.on('dropped', function(tracks) {
    console.log('dropped', tracks);

    var songs = tracks.map(function (track) {
      return {spotifyId: track.uri, length: track.duration, user: $rootScope.me};
    });
    
    socket.emit('addSong', songs);

  });

	return playlist;
});