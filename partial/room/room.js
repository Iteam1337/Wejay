angular.module('wejay').controller('RoomCtrl',function(socket, $rootScope, $scope, spotifyAPI, User, $window){

  'use strict';

  var toplist, player, Track;

  $scope.toplist       = [];
  $scope.users         = [];
  $scope.authenticated = false;
  $scope.user          = null;

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

    player = spotifyAPI.models.player;
    Track  = spotifyAPI.models.Track;

    /**
     * Toplist
     */
    var toplist = spotifyAPI.toplist.forCurrentUser();

    toplist.tracks.snapshot().done(function (tracks) {
      for (var i = 0; i < 5; i++) {
        $scope.toplist.push(tracks.get(i));
      }
      
      $scope.safeApply();
    });

    /**
     * Now playing
     * @param  {[type]} p [description]
     * @return {[type]}   [description]
     */
    player.load('track').done(function (p) {
      $scope.nowPlaying = p.track;
    });

    player.addEventListener('change', function (p) {
      $scope.nowPlaying = p.data.track;
      $scope.safeApply();
    });

    var analyzer = spotifyAPI.audio.RealtimeAnalyzer.forPlayer(player);

    analyzer.addEventListener('audio', function (evt) {
      player.load('position').done(function() {
        if(player.position >= ($scope.nowPlaying.duration - 1500)) {
          console.log('skip');
          socket.emit('skip', {spotifyId: $scope.nowPlaying.uri});
        }
      });
    });

    $scope.$watch('nowPlaying', function (np) {
      if (np) {
        console.log($scope.playlist);
        if ($scope.playlist && np.uri === $scope.playlist[0].uri) {
          $scope.playlist.splice(0,1);
        }

        Track
          .fromURI(np.uri)
          .load('name')
          .done(function (track) {
            var image = spotifyAPI.image.forTrack(track, {player: true});

            spotifyAPI.models.Artist.fromURI(track.artists[0].uri)
              .load(artist_metadata_properties)
              .done(function (meta) {
                $scope.nowPlaying.meta = meta;
                $scope.safeApply();
              });

            document.getElementById('background').style.backgroundImage = 'url(' + track.image + ')';

            var imageContainer = document.getElementById('now-playing-image');
            
            if (imageContainer.firstChild) {
              imageContainer.removeChild(imageContainer.firstChild);
            }
            
            imageContainer.appendChild(image.node);
          });
      }
    });

    $scope.$watch('room.queue', function (list) {
      $scope.totalDuration = 0;

      if (list) {
        $scope.playlist = [];

        list.map(function (track) {
          Track.fromURI(track.spotifyId)
            .load('name')
            .done(function (spotifyTrack) {
              if (!spotifyTrack.local) {
                var duration = spotifyTrack.duration;

                spotifyAPI.facebook.FacebookUser
                  .fromId(track.user.facebookId)
                  .load('name')
                  .done(function (user) {
                    spotifyTrack.user = user;
                    console.log('user', user);

                    $scope.safeApply();
                  });

                $scope.totalDuration = $scope.totalDuration + Math.round(duration/60000);

                spotifyTrack.time = makeDuration(duration);
                $scope.playlist.push(spotifyTrack);

                $scope.safeApply();
              }
            });
        });
      }
    });
  });

  socket.on('queue', function (queue) {
    console.log('queue', queue);
    $scope.room.queue = queue;
    $scope.safeApply();
  });

  socket.on('userJoined', function (users) {
    console.log('userJoined', users);
    $scope.room.users = users;
    $scope.safeApply();
  });

  socket.on('nextSong', function (song) {
    console.log('nextSong', song);
    player.playTrack(Track.fromURI(song.spotifyId));
  });

  /**
   * [playTrack description]
   * @param  {[type]} uri [description]
   * @return {[type]}     [description]
   */
  $scope.playTrack = function (uri) {
    Track.fromURI(uri).load('name').done(function (track) {
      player.playTrack(track);
    });
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
              $scope.safeApply();
            });
        } else {
          spotifyAPI.library
            .forCurrentUser()
            .star(track)
            .done(function() {
              $scope.safeApply();
            });          
        }
      });
  };

  $scope.login = function () {
		var user = new User();

		user.facebookLogin(function(user) {
      $scope.users.push(user);
      $rootScope.me = user;

      socket.emit('join', {roomName: 'Iteam', user: user}, function (room) {
        $scope.room = room;

        var current = room.currentSong;

        if (current) {
          Track
            .fromURI(current.spotifyId)
            .load('name')
            .done(function (track) {
              if (current.position > track.duration) {
                socket.emit('skip', {spotifyId: current.spotifyId});
              } else {
                player.playTrack(track, current.position);
              }
            });
        }
      });

			$scope.authenticated = true;
			$scope.safeApply();
		}, function(error) {
			$window.alert('Login failed ' + error);
		});
	};

  /**
   * Makes a more readable duration from ms to m:ss
   * @param  {int} duration Duration in milliseconds
   * @return {string} m:ss
   */
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

});