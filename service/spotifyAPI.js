
angular.module('wejay').service('spotifyAPI',function($rootScope) {

  'use strict';

	var spotifyAPI = {};

  require(['$api/auth#Auth'], function (Auth) {
    spotifyAPI.auth = new Auth();

    $rootScope.$broadcast('appReady')
  });

	return spotifyAPI;
});
