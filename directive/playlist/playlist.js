angular.module('wejay').directive('playlist', function($rootScope, playlist, spotifyAPI) {

  'use strict';

  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'directive/playlist/playlist.html',
    link: function(scope, element, attrs, fn) {
      
    }
  };
});
