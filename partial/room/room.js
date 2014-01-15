angular.module('wejay').controller('RoomCtrl',function($rootScope, $scope, spotifyAPI, User, $window){

  'use strict';

  var toplist;

  $scope.toplist = [];

  $scope.name = "Iteam";
  $scope.authenticated = false;
  $scope.user = null;

  $rootScope.$on('appReady', function () {
    toplist = spotifyAPI.toplist.forCurrentUser();

    toplist.tracks.snapshot().done(function (tracks) {
      for (var i = 0; i < 10; i++) {
        $scope.toplist.push(tracks.get(i));
      }

      console.log($scope.toplist);

      $scope.$apply();
    });

  });

  $scope.login = function() {
		var user = new User();

		user.facebookLogin(function(user) {
			$scope.user = user;
			$scope.authenticated = true;
			$scope.safeApply();
		}, function(error) {
			$window.alert('Login failed ' + error);
		});
	};
});