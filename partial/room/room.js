angular.module('wejay').controller('RoomCtrl',function($rootScope, $scope, spotifyAPI){

  'use strict';

  var toplist;

  $scope.toplist = [];

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

});