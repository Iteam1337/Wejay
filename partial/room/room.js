angular.module('wejay').controller('RoomCtrl',function(socket, Room, Track, Song, player, $rootScope, $scope, spotifyAPI, User, $window){

  'use strict';

  $scope.room = null;
  $scope.toplist       = [];
  $scope.master        = true; // default to play the room directly (being master)

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
    $scope.login(); // autologin
  });

  // reconnect
  socket.on('connect', function () {
    $scope.room = new Room($scope.roomName);
  });

  /**
   * WATCH
   */
  $scope.$watch('room.nowPlaying', function (song) {
    if (song){
      bind(song.track);
      if ($scope.master) player.play(song);
      song.localStarted = new Date().getTime() - (song.position || 0);
    }
  });

  $scope.$watch('master', function (master) {
    if (master){
      var song = $scope.room.nowPlaying;
      player.play(song);
    }
  });

  $scope.$watch('room.queue', function (queue) {
    if (queue) {
      $scope.playlist = queue.map(function (song) {
        return new Song(song);
      });

      var duration = $scope.playlist.reduce(function(a,b){
        return a + (b.length - (b.position || 0) );
      }, 0);

      $scope.totalDuration = Song.makeDuration(duration);
    }
  });

  /**
   *  METHODS
   */
  $scope.queueTrack = function (track){
    var song = new Song({spotifyId: track.uri, track:track, length: track.duration, user: User.current});
    $scope.room.addSong(song);
  };

  $scope.login = function () {
		User.facebookLogin(function(user) {
      $scope.roomName = user.work && user.work.length && user.work[0].employer.name || 'Iteam';
      $scope.safeApply();
		}, function(error) {
			$window.alert('Login failed ' + error);
		});
	};

  $scope.$watch('roomName', function(roomName){
    $scope.room = new Room(roomName);
    $scope.safeApply();
  });


  /**
   *  HELPERS
   */

  // directive?
  function bind(track){

    spotifyAPI.models.Artist.fromURI(track.artists[0].uri)
      .load(artist_metadata_properties)
      .done(function (meta) {
        $scope.nowPlaying.meta = meta;
        $scope.safeApply();
      });

    var image = spotifyAPI.image.forTrack(track, {player: true});
    document.getElementById('background').style.backgroundImage = 'url(' + track.image + ')';
    var imageContainer = document.getElementById('now-playing-image');
    if (imageContainer.firstChild) {
      imageContainer.removeChild(imageContainer.firstChild);
    }
    imageContainer.appendChild(image.node);
  }


});