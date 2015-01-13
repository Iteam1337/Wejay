angular.module('wejay').directive('playlist', function() {

  'use strict';

  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'directive/playlist/playlist.html',
    link: function($scope) {

      $scope.notStarted = function(song) {
        return !song.position;
      };
      /*
      var dropBoxDropEventListener = function (e) {
        e.preventDefault();
        var droppedUri = e.dataTransfer.getData('text');
        console.log('drop', arguments);
      };

      document.addEventListener('drop', dropBoxDropEventListener, false);
*/

    }
  };
});
