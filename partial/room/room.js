angular.module('wejay').controller('RoomCtrl',function($rootScope, $scope, spotifyAPI, User, $window, socket){

  'use strict';

  var toplist;

  $scope.toplist = [];

  $scope.name = "Iteam";
  $scope.authenticated = false;
  $scope.user = null;

  var artist_metadata_properties = [
    'biography',
    'genres',
    'name',
    'popularity',
    'portraits',
    'related',
    'uri',
    'years'
  ];

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

      spotifyAPI.models.Artist.fromURI(track.artists[0].uri)
        .load(artist_metadata_properties)
        .done(function (meta) {
          $scope.nowPlaying.meta = meta;
          $scope.$apply();
        });

      document.getElementById('background').style.backgroundImage = 'url(' + track.image + ')';

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
      for (var i = 0; i < 5; i++) {
        $scope.toplist.push(tracks.get(i));
      }
      $scope.$apply();
    });
  });

  /**
   * [playTrack description]
   * @param  {[type]} uri [description]
   * @return {[type]}     [description]
   */
  $scope.playTrack = function (uri) {
    spotifyAPI.models.player.playTrack(spotifyAPI.models.Track.fromURI(uri));
  };

  /**
   * [star description]
   * @param  {[type]} track [description]
   * @return {[type]}       [description]
   */
  $scope.star = function (track) {
    spotifyAPI.models.Track
      .fromURI(track.uri)
      .load('starred')
      .done(function (track) {
        if (track.starred) {
          spotifyAPI.library
            .forCurrentUser()
            .unstar(track)
            .done(function() {
              $scope.$apply();
            });
        } else {
          spotifyAPI.library
            .forCurrentUser()
            .star(track)
            .done(function() {
              $scope.$apply();
            });          
        }
      });
  };

  $scope.login = function() {
		var user = new User();

		user.facebookLogin(function(user) {
      console.log('user', user);
      console.log(socket.emit('join', {roomName: 'Iteam', user: {id: user.facebookId}}));

			$scope.user = user;
			$scope.authenticated = true;
			$scope.safeApply();
		}, function(error) {
			$window.alert('Login failed ' + error);
		});
	};
});