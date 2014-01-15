angular.module('wejay').controller('RoomCtrl',function($rootScope, $scope, spotifyAPI){

  'use strict';

  var toplist;

  $scope.toplist = [];

  $rootScope.$on('appReady', function () {
    toplist = spotifyAPI.toplist.forCurrentUser();

    toplist.tracks.snapshot().done(function (tracks) {
      for (var i = 0; i < 10; i++) {
        $scope.toplist.push(tracks.get(i));
      }

      console.log($scope.toplist);

      $scope.$apply();
    });

  });

});