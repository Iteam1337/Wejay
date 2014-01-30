/**
 * A track is a spotify model and a Song is a wejay song coming from the wejay api.
 */
angular.module('wejay').service('Track',function($rootScope, models) {

  'use strict';
  var Track  = models.Track;
	return Track;
});