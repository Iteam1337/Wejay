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
      $scope.toplist = tracks.toArray().slice(0, 5);
      $scope.safeApply();
    });

    /**
     * Listen for change events and see if the song is changed from the current playing song 
     * which means we are pausing or playing something else
     */
    player.addEventListener('change', function (p) {
      var song = $scope.nowPlaying;
      if (!song) return;
      
      console.log('change', p, song);

      // next
      if (p.data.context.uri === $scope.history.uri && p.data.index === 1 && p.data.playing ){
        socket.emit('skip', song);
      } else {
        // new song
        if (p.data.track && !p.data.track.adversiment && song){
          if (p.data.track.uri !== song.spotifyId || !p.data.playing){
            $scope.master = false;
            console.log('no longer master', p);
          } else {
            $scope.master = true;
            console.log('resume', song);
          }
          $scope.safeApply();
        }
      }
      song.position = new Date().getTime() - (song.localStarted || new Date(song.started).getTime());
      if (Math.floor(p.data.position / 30) !== Math.floor(song.position / 30) )
      {
        console.log('position', song.position, p.data.track.duration);
        player.seek(song.position);
        p.preventDefault();
      }

    });

  });


  /**
   * SOCKET
   */

  socket.on('queue', function (queue) {
    console.log('queue', queue);
    $scope.room.queue = queue;
  });

  socket.on('userJoined', function (users) {
    console.log('userJoined', users);
    $scope.users = users;
  });

  socket.on('nextSong', function (song) {
    console.log('nextSong', song);
    $scope.nowPlaying = song;
    $scope.setCurrent(song); // hängslen

    if (!song) {
      $scope.history.tracks.clear();
      player.pause();
    }

  });

  /**
   * WATCH
   */

  $scope.$watch('nowPlaying', function (song) {
    if (song) {
      $scope.setCurrent(song);
    }
  });

  $scope.$watch('master', function (master) {
    if (master) {
      var song = $scope.nowPlaying;
      $scope.setCurrent(song);
    } else {
      if (player.track.uri === $scope.nowPlaying.spotifyId) {
        player.pause();
      }
    }
  });

  $scope.$watch('room.queue', function (queue) {

    if (queue) {
      $scope.playlist = queue.map(function (song) {

      // tmp
      if (song.length) song = song[0];

      console.log('queue', song);

        Track.fromURI(song.spotifyId)
          .load('name')
          .done(function (track) {
            if (track.local) return;

            song.length = track.duration;
            song.time = makeDuration(track.duration);
            song.track = track;
            $scope.safeApply();
          });

        if (song.user && song.user.facebookId){
          var user = spotifyAPI.facebook.FacebookUser.fromId(song.user.facebookId);
          if (user) song.user = user;
          $scope.safeApply();
        }
        return song;
      });
    }
  });

  $scope.$watch('playlist', function (playlist) {
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
        song.position = new Date().getTime() - (song.localStarted || new Date(song.started).getTime());
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
              $scope.history.tracks.add(track);
            });
          });
        }
      }
      song.localStarted = new Date().getTime() - (song.position || 0);

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

  $scope.queueTrack = function (track){
    console.log('queueTrack', track);
    socket.emit('addSong', {spotifyId: track.uri, length: track.duration, user: $scope.me}, function (queue) {
       console.log('queue', queue); 
    });
  };

  /**
   * Star or unstar a track
   * @param  {Track} track Spotify Track
   */
  $scope.star = function (track) {
    if (!track) return;

    spotifyAPI.models.Track
      .fromURI(track.uri)
      .load('starred')
      .done(function (track) {
        var user = spotifyAPI.library.forCurrentUser();

        if (track.starred) {
          user
            .unstar(track)
            .done(function() {
              $scope.safeApply();
            });
        } else {
          user
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
      if (typeof(room) === "object"){
        $scope.room = room;
        $scope.users = room.users;
        $scope.nowPlaying = room.currentSong;
      }
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
   * Makes a more readable duration from ms to mm:ss
   * @param  {int} duration Duration in milliseconds
   * @return {string} mm:ss
   */
  function makeDuration (duration) {
    var minutes, seconds;

    duration = duration / 1000;
    minutes  = duration / 60;
    seconds  = Math.round((minutes % 1) * 60);
    minutes  = ~~minutes;

    if (seconds < 10) {
      seconds = '0' + seconds;
    }

    return minutes + ':' + seconds;
  }

});