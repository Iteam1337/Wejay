angular.module('wejay').service('playlist',function($rootScope, spotifyAPI) {

  'use strict';

	var playlist = {
    pending: [],
    played: []
  };

  spotifyAPI.on('dropped', function(tracks) {
    console.log('dropped', tracks);

    tracks.map(function (track) {
      playlist.pending.push(track.uri);
    });

    $rootScope.$broadcast('playlistUpdated');
  });

	return playlist;
});