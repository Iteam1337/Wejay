
angular.module('wejay').service('spotifyAPI',function($rootScope) {

  'use strict';

	var spotifyAPI = {};

  require(['$api/auth#Auth','$api/toplists#Toplist'], function (Auth, toplist) {
    spotifyAPI.auth = new Auth();
    spotifyAPI.toplist = toplist;

    $rootScope.$broadcast('appReady');
  });

	return spotifyAPI;
});
