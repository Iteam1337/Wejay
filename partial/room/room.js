angular.module('wejay').controller('RoomCtrl',function(socket, $rootScope, $scope, spotifyAPI, User, $window){

  'use strict';

  var toplist, player, Track;

  $scope.toplist       = [];
  $scope.users         = [];
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

    $scope.login(); // autologin


    spotifyAPI.models.Playlist
    .createTemporary()
    .done(function(playlist){

      console.log('history', playlist);
      playlist.load('tracks').done(function(playlist){
        console.log('tracks', playlist);
        $scope.history = playlist;
      });
    });

    /**
     * Toplist
     */
    var toplist = spotifyAPI.toplist.forCurrentUser();

    toplist.tracks.snapshot().done(function (tracks) {
      console.log('tracks', tracks);
      $scope.toplist = tracks._meta.slice(0, 5);
      $scope.safeApply();
    });

    /**
     * Listen for change events and see if the song is changed from the current playing song 
     * which means we are pausing or playing something else
     */
    player.addEventListener('change', function (p) {
      console.log('change', p);

      // next
      if (!p.data.playing)
      {
        if($scope.master && !p.data.track){
          socket.emit('skip', $scope.nowPlaying);
        } 
      } else{
        if (p.data.track && !p.data.track.adversiment){
          if (p.data.track.uri !== $scope.nowPlaying.spotifyId){
            $scope.master = false;
          } else {
            $scope.master = true;
          }
        }
      }
    });

  });


  /**
   * SOCKET
   */

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
    $scope.setCurrent(song); // hängslen

    $scope.safeApply();
    if (!song) {
      player.pause();
    }

  });


  /**
   * WATCH
   */



  $scope.$watch('nowPlaying', function (song) {
    if (song){
      $scope.setCurrent(song);
    }
  });

  $scope.$watch('master', function (master) {
    if (master){
      if ($scope.master) {
        var song = $scope.nowPlaying;
        $scope.setCurrent(song);
      }
    } else {
      player.pause();
    }
  });




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

      // $scope.nowPlaying = playlist[0];
    }
  });


  /**
   *  METHODS
   */

  /**
   * [setCurrent description]
   * @param  {[type]} uri [description]
   * @return {[type]}     [description]
   */
  $scope.setCurrent = function (song) {
    if ( !song || !song.spotifyId ) { return; }

    Track
    .fromURI(song.spotifyId)
    .load('name')
    .done(function (track) {
      song.track = track;
      bind(song.track);

      if ($scope.master){
        if (song.localStarted) { song.position = new Date() - song.localStarted; }
        if (song.position > track.duration || !track.playable) {
          socket.emit('skip', song);
        } else {

          $scope.history.tracks
          .clear()
          .done(function(tracks){
            tracks
            .add(track)
            .done(function(){
              player.playContext($scope.history, 0, song.position);
              player.play();
            });
          });
        }
        song.localStarted = new Date() - song.position; // local time
      }

    });

    if (song.user.facebookId){
      spotifyAPI.facebook.FacebookUser
      .fromId(song.user.facebookId)
      .load('name')
      .done(function (user) {
        song.user = user;
        $scope.safeApply();
      });
    }

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

  $scope.logout = function () {
    socket.emit('logout', {roomName: $scope.roomName, user: $scope.me}, function () {
      $scope.roomName = null;
    });

  };

  $scope.login = function () {

		User.facebookLogin(function(user) {
      $scope.users.push(user);
      $rootScope.me = user;
      $scope.roomName = user.work && user.work.length && user.work[0].employer.name || 'Iteam';
      $scope.safeApply();
		}, function(error) {
			$window.alert('Login failed ' + error);
		});
	};

  $scope.$watch('roomName', function(roomName){
    socket.emit('join', {roomName: roomName, user: $scope.me}, function (room) {
      $scope.room = room;
      $scope.nowPlaying = room.currentSong;
      $scope.safeApply();
    });
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