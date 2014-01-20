angular.module('wejay').controller('RoomCtrl',function(socket, $rootScope, $scope, spotifyAPI, User, $window){

  'use strict';

  var toplist, player, Track;

  $scope.toplist       = [];
  $scope.users         = [];
  $scope.authenticated = false;
  $scope.user          = null;
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
    // player.load('track').done(function (p) {
    //   $scope.nowPlaying = p.track;
    // });

    player.addEventListener('change', function (p) {
      console.log('change', p);

      if (p.data.track && $scope.nowPlaying){
        $scope.master = p.data.playing && $scope.nowPlaying.spotifyId === p.data.track.uri;
      }
    });

    // var analyzer = spotifyAPI.audio.RealtimeAnalyzer.forPlayer(player);

    // analyzer.addEventListener('audio', function (evt) {
    //   player.load('position').done(function() {
    //     if(player.position >= ($scope.nowPlaying.duration - 1500)) {
    //       console.log('skip');
    //       socket.emit('skip', {spotifyId: $scope.nowPlaying.uri});
    //     }
    //   });
    // });

    $scope.$watch('nowPlaying', function (np) {
      if (np) {

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

            document.getElementById('background').style.backgroundImage = 'url(' + np.track.image + ')';

            var imageContainer = document.getElementById('now-playing-image');
            
            if (imageContainer.firstChild) {
              imageContainer.removeChild(imageContainer.firstChild);
            }
            
            imageContainer.appendChild(image.node);
          });
      }
    });

    $scope.$watch('room.queue', function (queue) {


      if (queue) {
        $scope.playlist = queue.map(function (song) {
          spotifyAPI.facebook.FacebookUser
          .fromId(song.user.facebookId)
          .load('name')
          .done(function (user) {
            song.user = user;
            $scope.safeApply();
          });

          Track.fromURI(song.spotifyId)
            .load('name')
            .done(function (track) {
              if (!track.local) {
                song.length = track.duration;
                song.time = makeDuration(track.duration);
                song.track = track;
              }
            });
          return song;
        });
        $scope.safeApply();
      }
    });

    $scope.$watch('playlist', function(playlist){
      $scope.totalDuration = playlist && playlist.reduce(function(a,b){
        a = a + (b.length || b.track && b.track.duration) / 60000;
        return a;
      }, 0);
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
    $scope.nowPlaying = song;
    $scope.safeApply();

    if ($scope.master) {
      player.playTrack(Track.fromURI(song.spotifyId));
    }
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
                if ($scope.master){
                  player.playTrack(track, current.position);
                }
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