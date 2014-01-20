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
     * Listen for change events and see if the song is changed from the current playing song 
     * which means we are pausing or playing something else
     */
    player.addEventListener('change', function (p) {
      console.log('change', p);

      if (p.data.track && p.data.track.advertisement && $scope.nowPlaying){
        $scope.master = p.data.playing && $scope.nowPlaying.spotifyId === p.data.track.uri;
        $scope.safeApply();
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

    $scope.$watch('nowPlaying', function (song) {
      if (song){
        Track
        .fromURI(song.spotifyId)
        .load('name')
        .done(function (track) {
          song.track = track;
          bind(song.track);

          if (song.position > track.duration) {
            socket.emit('skip', song);
          } else {
            if ($scope.master){
              player.playTrack(track, song.position);
              song.started = new Date(); // local time
            }
          }

        });

        spotifyAPI.facebook.FacebookUser
        .fromId(song.user.facebookId)
        .load('name')
        .done(function (user) {
          song.user = user;
          $scope.safeApply();
        });
      }
    });

    $scope.$watch('master', function (master) {
      if (master){
        if ($scope.master) {
          player.playTrack($scope.nowPlaying.track, new Date() - $scope.nowPlaying.started);
        }
      } else {
        player.pause();
      }
    });


    // directive?
    var bind = function(track){


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
    };


    $scope.$watch('room.queue', function (queue) {

      console.log('queue', queue);
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
                $scope.safeApply();
              }
            });
          return song;
        });
      }
    });

    $scope.$watch('playlist', function(playlist){
      if (playlist){
        var duration = playlist.reduce(function(a,b){
          return a + (b.length - (b.position || 0) );
        }, 0);

        if (duration) { 
          $scope.totalDuration = makeDuration(duration);
          console.log('duration', duration, $scope.totalDuration);
        }

        $scope.nowPlaying = playlist[0];
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
    $scope.nowPlaying = song;
    $scope.safeApply();

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

  $scope.skip = function(){
    socket.emit('skip', $scope.nowPlaying, function(message){
      if (/Error:/.test(message)) {
        $window.alert(message);
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
        $scope.nowPlaying = room.currentSong;
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