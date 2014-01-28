angular.module('wejay', ['ngSanitize']);

angular.module('wejay').config(function ($compileProvider, $provide) {

  'use strict';

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|spotify):/);
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|spotify):/);

});

require(['$api/auth#Auth', '$api/audio', '$api/models','$api/toplists#Toplist', '$views/image#Image','$api/library#Library', '$api/facebook'], function (Auth, audio, models, toplist, image, library, facebook) {
  var spotify = {};
  spotify.auth    = new Auth();
  spotify.audio   = audio;
  spotify.models  = models;
  spotify.toplist = toplist;
  spotify.image   = image;
  spotify.library = library;
  spotify.facebook = facebook;
  
  $provide.provider('spotify', function() {
    return spotify;
  });
  angular.bootstrap(document, ['wejay']); // start now
});

angular.module('wejay').run(function($rootScope) {

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

});
