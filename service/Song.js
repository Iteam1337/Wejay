angular.module('wejay').service('Song',function(spotifyAPI, Track, $rootScope) {

  'use strict';

	function Song(song){
    angular.extend(this, song);
    var self = this;

    Track
    .fromURI(song.spotifyId)
    .load('name')
    .done(function (track) {
      self.length = track.duration;
      self.time = Song.makeDuration(track.duration);
      self.track = track;
    });

    if (self.user && self.user.facebookId){
      spotifyAPI.facebook.FacebookUser
      .fromId(song.user.facebookId)
      .load('name')
      .done(function (user) {
        self.user = user;
      });
    }
  }

  /**
   * [star description]
   * @param  {[type]} track [description]
   * @return {[type]}       [description]
   */
  Song.prototype.star = function (done) {

    spotifyAPI.models.Track
      .fromURI(this.spotifyId)
      .load('starred')
      .done(function (track) {
        if (track.starred) {
          spotifyAPI.library
            .forCurrentUser()
            .unstar(track)
            .done(function() {
              $rootScope.safeApply(done);
            });
        } else {
          spotifyAPI.library
            .forCurrentUser()
            .star(track)
            .done(function() {
              $rootScope.safeApply(done);
            });          
        }
      });
  };


  /**
   * Makes a more readable duration from ms to m:ss
   * @param  {int} duration Duration in milliseconds
   * @return {string} m:ss
   */
  Song.makeDuration = function(duration) {
    var minutes, seconds;

    duration = duration / 1000;
    minutes  = duration/60;
    seconds  = Math.round((minutes % 1) * 60);
    minutes  = ~~minutes;

    if (seconds < 10) {
      seconds = '0' + seconds;
    }

    return minutes + ':' + seconds;
  };

	return Song;
});