angular.module('wejay').directive('toplist', function(spotifyAPI, $rootScope) {

  'use strict';

	return {
		restrict: 'E',
		replace: true,
		templateUrl: 'directive/toplist/toplist.html',
		link: function(scope, element, attrs, fn) {

		}
	};
});
