angular.module('wejay', []);

angular.module('wejay').config(function() {

  'use strict';

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
