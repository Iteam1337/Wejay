angular.module('wejay').controller('RoomCtrl',function($rootScope, $scope, spotifyAPI, User, $window){

  'use strict';

  var toplist;

  $scope.toplist = [];

  $scope.name = "Iteam";
  $scope.authenticated = false;
  $scope.user = null;

  $rootScope.$on('appReady', function () {

    /**
     * Now playing
     * @param  {[type]} p [description]
     * @return {[type]}   [description]
     */
    spotifyAPI.models.player.load('track').done(function (p) {
      $scope.nowPlaying = p.track;
    });

    spotifyAPI.models.player.addEventListener('change', function (p) {
      $scope.nowPlaying = p.data.track;

      $scope.$apply();
    });

    $scope.$watch('nowPlaying', function (np) {
      var track = spotifyAPI.models.Track.fromURI(np.uri);
      var image = spotifyAPI.image.forTrack(track, {player: true});

      var imageContainer = document.getElementById('now-playing-image');
      
      if (imageContainer.firstChild) {
        imageContainer.removeChild(imageContainer.firstChild);
      }
      
      imageContainer.appendChild(image.node);
    });

    /**
     * Toplist
     * @type {[type]}
     */
    toplist = spotifyAPI.toplist.forCurrentUser();

    toplist.tracks.snapshot().done(function (tracks) {
      for (var i = 0; i < 10; i++) {
        $scope.toplist.push(tracks.get(i));
      }

      console.log($scope.toplist);

      $scope.$apply();
    });

    $scope.playTrack = function (uri) {
      spotifyAPI.models.player.playTrack(spotifyAPI.models.Track.fromURI(uri));
    };

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