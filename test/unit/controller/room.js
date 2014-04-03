describe('RoomCtrl', function() {

	beforeEach(module('wejay'));

	var scope,ctrl;

    beforeEach(inject(function($rootScope, $controller) {
      scope = $rootScope.$new();

      socket = {
        on: sinon.stub(),
        emit: sinon.spy(),
        socket: {
          connect: sinon.spy(),
          connected: true
        }
      };

      spotifyAPI = {
        models: {
          Track: {}
        }
      };

      require = sinon.stub();

      ctrl = $controller('RoomCtrl', {
        $scope: scope,
        socket: socket
      });
    }));

  describe('#setCurrent', function() {
    it('should be a function', function () {
      expect(scope.setCurrent).to.be.instanceof(Function);  
    });
  });

  describe('#queueTrack', function() {
    it('should be a function', function () {
      expect(scope.queueTrack).to.be.instanceof(Function);
    });

    it('should emit a add song', function () {
      var track = {
        uri: 'spotify:track:0gbYQlMzU41qBTUMH5tP8r',
        duration: 5
      };

      scope.me = 'rickard';

      scope.queueTrack(track);

      expect(socket.emit.calledOnce).to.be.true;
      expect(socket.emit.calledWith('addSong', { spotifyId: track.uri, length: track.duration, user: 'rickard'})).to.be.true;
    });
  })

  describe('#star', function() {
    it('should be a function', function () {
      expect(scope.star).to.be.instanceof(Function);
    });
  })

  describe('#skip', function() {
    it('should be a function', function () {
      expect(scope.skip).to.be.instanceof(Function);
    });

    it('should emit a skip', function () {
      scope.nowPlaying = { name: 'Blessed With A Curse' };

      scope.skip();

      expect(socket.emit.calledOnce).to.be.true;
      expect(socket.emit.calledWith('skip', { name: 'Blessed With A Curse' })).to.be.true;
    });
  })

  describe('#logout', function() {
    it('should be a function', function () {
      expect(scope.logout).to.be.instanceof(Function);
    });

    it('should emit a logout', function () {
      scope.roomName = 'iteam';
      scope.me = 'rickard';

      scope.logout();

      expect(socket.emit.calledOnce).to.be.true;
      expect(socket.emit.calledWith('logout', { roomName: 'iteam', user: 'rickard' })).to.be.true;
    });
  })

  describe('#login', function() {
    it('should be a function', function () {
      expect(scope.login).to.be.instanceof(Function);
    });
  })

});