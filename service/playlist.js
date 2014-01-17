angular.module('wejay').service('playlist',function($rootScope, spotifyAPI, socket) {

  'use strict';

	var playlist = {
    pending: [],
    played: []
  };

  spotifyAPI.on('dropped', function(tracks) {
    console.log('dropped', tracks);

    tracks.map(function (track) {
      socket.emit('addSong', {spotifyId: track.uri, user: {id: 767015528 }});
    });

    $rootScope.$broadcast('playlistUpdated');
  });

	return playlist;
});