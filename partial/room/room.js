angular.module('wejay').controller('RoomCtrl',function($scope, User, $window){

  'use strict';

  $scope.loginStatus = 'Ej inloggad';

  $scope.name = "Iteam";

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