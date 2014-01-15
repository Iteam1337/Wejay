angular.module('wejay', ['ui.router', 'ngResource']);

angular.module('wejay').config(function($stateProvider, $urlRouterProvider) {

  'use strict';

  $stateProvider.
  when('/room/:id',{templateUrl: 'partial/room/room.html'}).
	/* Add New Routes Above */
  
  // For any unmatched url, redirect to /
  $urlRouterProvider.otherwise("/");

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
