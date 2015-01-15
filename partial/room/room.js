angular.module('wejay').controller('RoomCtrl',function(socket, $rootScope, $scope, spotifyAPI, User, moment, $window){

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
      console.log('change', p, p.data);
      if (!$scope.nowPlaying) return;
    
      var command = null;

      // we aren't getting the actual command, just data uri's so we need to figure out what's going on first...
      if (!p.data.track) command = 'unknown';
      else if (p.data.track.adversiment) command = 'advertisment';
      else if ($scope.master && !p.position) command = 'skip';
      else if (p.data.track.uri === $scope.nowPlaying.spotifyId && p.data.playing) command = 'master';
      else command = 'slave';

      console.log('command', command);

      switch(command){
        case 'skip':
          $scope.skip($scope.nowPlaying);
          break;
        case 'master':
          $scope.master = true;
          $scope.nowPlaying.position = new Date().getTime() - ($scope.nowPlaying.localStarted || new Date($scope.nowPlaying.started).getTime());
          if (Math.abs(p.data.position - $scope.nowPlaying.position) > 3000 && Math.abs(p.data.position - $scope.nowPlaying.position) < p.data.duration)
          {
            player.seek($scope.nowPlaying.position);
            p.preventDefault();
          }
          break;
        case 'slave':
          $scope.master = false;
          break;
        default:
          console.log('unkown command', p.data);
          break;
      }
      $scope.safeApply();
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
      if ($scope.room) join($scope.room.roomName);

      var song = $scope.nowPlaying;
      $scope.setCurrent(song);
    } else {
      if (player.track && player.track.uri === $scope.nowPlaying.spotifyId) {
        player.pause();
      }
    }
  });

  $scope.$watch('room.queue', function (queue) {

    if (queue) {
      $scope.playlist = queue.map(function (song) {
        
        if (!song.track) {
          Track.fromURI(song.spotifyId)
            .load('name')
            .done(function (track) {
              if (track.local) return;

              song.length = track.duration;
              song.time = makeDuration(track.duration);
              song.track = track;
              $scope.safeApply();
            });
        }

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

  $scope.$watch('users', function(users){
    $scope.activeUsers = users.filter(function(user){
      return moment(user.lastPlayDate) > moment().subtract(1, 'hour');
    });
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

      song.position = new Date().getTime() - (song.localStarted || new Date(song.started).getTime()) - $scope.serverDiff;
      if (!track.playable || song.position >= song.duration) {
        socket.emit('skip', song);
      } else {

        $scope.history.tracks
        .clear()
        .done(function(tracks){
          console.log('play', tracks);
          //$scope.next = tracks.length > 1 && track[1] || undefined;
          tracks.add([track,track]).done(function(){
            player.playContext($scope.history, 0, song.position);
            player.play();
          });
        });
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

  $scope.skip = function(song){
    socket.emit('skip', song || $scope.nowPlaying, function(message){
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
    join(roomName);
  });


  /**
   *  HELPERS
   */

  function join(roomName){
    socket.emit('join', {roomName: roomName, user: $scope.me}, function (room) {
      if (typeof(room) === 'object'){
        $scope.room = room;
        $scope.users = room.users;
        $scope.nowPlaying = room.currentSong;
        if (room.serverTime){
          $scope.serverDiff = new Date(room.serverTime) - new Date();
          console.log('server diff', $scope.serverDiff);
        }
      }
    });
  }

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