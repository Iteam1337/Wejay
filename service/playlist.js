angular.module('wejay').service('playlist',function($rootScope, spotifyAPI, User, socket) {

  'use strict';

	var playlist = {
    pending: [],
    played: []
  };

  spotifyAPI.on('dropped', function(tracks) {
    console.log('dropped', tracks);

    tracks.map(function (track) {
      console.log('me', $rootScope.me, track);
      socket.emit('addSong', {spotifyId: track.uri, length: track.duration, user: $rootScope.me});
    });

    $rootScope.$broadcast('playlistUpdated');
  });

	return playlist;
});