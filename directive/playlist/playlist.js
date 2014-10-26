angular.module('wejay').directive('playlist', function($rootScope) {

  'use strict';

  return {
    restrict: 'E',
    replace: true,
    templateUrl: 'directive/playlist/playlist.html',
    link: function(scope, element, attrs, fn) {


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
