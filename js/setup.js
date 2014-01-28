angular.module('wejay', ['ngSanitize']);

angular.module('wejay').config(function ($compileProvider, $provide) {

  'use strict';

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|spotify):/);
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|spotify):/);

  $provide.provider('models', function() {
    var spotifyModels = {};
    require(['$api/models'], function (models) {
      spotifyModels  = models;
    });
    this.$get = function() {
      return spotifyModels;
    };
  });

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
