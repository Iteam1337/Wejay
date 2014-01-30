angular.module('wejay').service('Room',function(socket, User, spotifyAPI, $rootScope) {

  'use strict';

	function Room(roomName){
    var self = this;
    socket.emit('join', {roomName: roomName, user: User.current}, function (room) {
      if (typeof(room) === "object"){
        angular.extend(self, room);
      }
    });

    socket.on('queue', function (queue) {
      self.queue = queue;
    });

    socket.on('userJoined', function (users) {
      self.users = users;
    });

    socket.on('nextSong', function (song) {
      console.log('nextSong', song);
      self.nowPlaying = song;

      if (!song) {
        self.context.tracks.clear();
        $rootScope.$emit("empty");
      }
    });
  }

  Room.prototype.skip = function(done){
    socket.emit('skip', this.nowPlaying, function(message){
      if (/Error:/.test(message)) {
        return done && done(message);
      } 
    });
  };

  Room.prototype.logout = function () {
    socket.emit('logout', {roomName: this.roomName, user: this.me}, function () {
      this.roomName = null;
    });
  };

	return Room;
});