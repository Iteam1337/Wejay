angular.module('wejay').service('playlist',function($rootScope, spotifyAPI) {

  'use strict';

	var playlist = {
    pending: [],
    played: []
  };

  spotifyAPI.on('dropped', function(track) {
    playlist.pending.push(track);
    console.log('dropped', track);

    $rootScope.$broadcast('playlistUpdated');
  });

	return playlist;
});