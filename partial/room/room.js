angular.module('wejay').controller('RoomCtrl',function($rootScope, $scope, spotifyAPI, User){

  'use strict';

  var toplist;

  $scope.toplist = [];

  $scope.loginStatus = 'Ej inloggad';

  $scope.name = "Iteam";

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
		//login via facebook
		//get facebook user
		//use socket.join to login to current room ("Iteam")

		var user = new User();

		user.facebookLogin(function(user) {
			$scope.loginStatus = 'Inloggad som ' + user.name + ', ' + user.facebookId;

		}, function(error) {
			$scope.loginStatus = error;
			$scope.safeApply();
		});
	};
});