angular.module('wejay').directive('playlist', function($rootScope, playlist, spotifyAPI) {

  'use strict';

  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'directive/playlist/playlist.html',
    link: function(scope, element, attrs, fn) {
      $rootScope.$on('playlistUpdated', function () {
        scope.playlist      = [];
        scope.totalDuration = 0;

        console.log(playlist.pending);

        function makeDuration (duration) {
          var minutes, seconds;

          duration = duration / 1000;
          minutes  = duration/60;
          seconds  = Math.round((minutes % 1) * 60);
          minutes  = ~~minutes;

          if (seconds < 10) {
            seconds = '0' + seconds;
          }

          return minutes + ':' + seconds;
        }

        playlist.pending.map(function (track) {
          spotifyAPI.models.Track.fromURI(track)
            .load('name')
            .done(function (spotifyTrack) {
              if (!spotifyTrack.local) {
                var user = spotifyAPI.models.User.fromUsername('believer');

                user
                  .load('username','name')
                  .done(function (user) {   
                    spotifyTrack.user = user;
                    scope.$apply();
                  });

                var duration = spotifyTrack.duration;
                scope.totalDuration = scope.totalDuration + Math.floor(duration/60000);

                spotifyTrack.time = makeDuration(duration);
                scope.playlist.push(spotifyTrack);
                console.log('in', scope.playlist);
                scope.$apply();
              }
            });
        });
      });
    }
  };
});
