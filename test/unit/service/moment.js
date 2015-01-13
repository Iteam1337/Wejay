describe('moment', function () {

  var moment;

  beforeEach(function () {
    module('wejay');
    inject(function (_moment_) {
      moment = _moment_;
    });
  });

  xit('should have tests', function () {
    //expect(moment.doSomething()).to.equal('something');
  });

});