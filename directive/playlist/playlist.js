angular.module('wejay').directive('playlist', function(playlist) {

  'use strict';

	return {
		restrict: 'E',
		replace: true,
		scope: {

		},
		templateUrl: 'directive/playlist/playlist.html',
		link: function(scope, element, attrs, fn) {


		}
	};
});
