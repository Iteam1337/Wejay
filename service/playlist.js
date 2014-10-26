angular.module('wejay').service('playlist',function($rootScope, spotifyAPI, User, socket, models) {

  'use strict';

	var playlist = {
    pending: [],
    played: []
  };



	return playlist;
});