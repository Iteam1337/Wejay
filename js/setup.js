angular.module('wejay', ['ngSanitize']);

angular.module('wejay').config(function ($compileProvider) {

  'use strict';

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|spotify):/);
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|spotify):/);

});

angular.module('wejay').run(function($rootScope, spotifyAPI, socket) {

  'use strict';

	$rootScope.safeApply = function(fn) {
		var phase = $rootScope.$$phase;
		if (phase === '$apply' || phase === '$digest') {
			if (fn && (typeof(fn) === 'function')) {
				fn();
			}
		} else {
			this.$apply(fn);
		}
	};

  spotifyAPI.on('dropped', function(tracks) {
    console.log('dropped', tracks);

    var songs = tracks.map(function (track) {
      return {
        spotifyId: track.uri,
        user: $rootScope.me
      };
    });
    socket.emit('addSong', songs);

  });

});
