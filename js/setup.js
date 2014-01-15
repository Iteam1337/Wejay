angular.module('wejay', []);

angular.module('wejay').config(function ($compileProvider) {

  'use strict';

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(spotify):/);
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(spotify):/);

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
