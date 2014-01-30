angular.module('wejay').service('player',function(models, $rootScope) {

  'use strict';

	var player = {};

  player.nowPlaying = null;
  player.context = null;

  models.Playlist
  .createTemporary()
  .done(function(playlist){

    console.log('history', playlist);
    playlist.load('tracks').done(function(playlist){
      player.context = playlist;
    });
  });

  player.play = function(song){
    if(!song.track) throw new Error("Track should be initialized before playing");
    
    song.position = new Date().getTime() - (song.localStarted || new Date(song.started).getTime());
    if (song.position > song.track.duration || !song.track.playable) {
      $rootScope.$emit('next');
    } else {

      player.context.tracks
      .clear()
      .done(function(tracks){
        tracks
        .add(song.track)
        .done(function(){
          models.player.playContext(player.context, 0, song.position);
          models.player.play();
        });
      });
    }
  };

  /**
   * Listen for change events and see if the song is changed from the current playing song 
   * which means we are pausing or playing something else
   */
  models.player.addEventListener('change', function (p) {
    var song = player.nowPlaying;
    if (!song) return;
    
    // next
    if (p.data.context.uri === player.context.uri && p.data.index === 1 && p.data.playing ){
      $rootScope.$emit('next');
    } else {
      // new song
      if (p.data.track && !p.data.track.adversiment && song){
        if (p.data.track.uri !== song.spotifyId || !p.data.playing){
          $rootScope.$emit('master', false);
        } else {
          $rootScope.$emit('master', true);
        }
      }
    }
    song.position = new Date().getTime() - (song.localStarted || new Date(song.started).getTime());
    if (Math.floor(p.data.position / 30) !== Math.floor(song.position / 30) )
    {
      console.log('position', song.position, p.data.track.duration);
      models.player.seek(song.position);
      p.preventDefault();
    }

  });

	return player;
});