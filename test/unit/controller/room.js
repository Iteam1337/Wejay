describe('RoomCtrl', function() {

	beforeEach(module('wejay'));

	var scope,ctrl;

    beforeEach(inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      ctrl = $controller('RoomCtrl', {$scope: scope});
    }));	

	xit('should have tests', inject(function() {
		
	}));

});