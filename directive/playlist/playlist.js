angular.module('wejay').directive('playlist', function() {

  'use strict';

  return {
    restrict: 'E',
    replace: true,
    scope: {
      skip: '&'
    },
    templateUrl: 'directive/playlist/playlist.html',
    link: function() {

      // var dropBoxDropEventListener = function (e) {
      //     if (e.preventDefault) {
      //       e.preventDefault();
      //     }
      //     var droppedUri = e.dataTransfer.getData('text');
      //     console.log('drop', arguments);
      // };

      // $(element).addEventListener('drop', dropBoxDropEventListener, false);


    }
  };
});
