angular.module('wejay').service('playlist',function($rootScope, spotifyAPI, User, socket, models) {

  'use strict';

	var playlist = {
    pending: [],
    played: []
  };

  spotifyAPI.on('dropped', function(tracks) {
    console.log('dropped', tracks);

    var songs = tracks.map(function (track) {
      return {spotifyId: track.uri, user: $rootScope.me};
    });
    console.log('addSong', songs);
    
    socket.emit('addSong', songs);

  });

	return playlist;
});