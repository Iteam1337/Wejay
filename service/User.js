angular.module('wejay').service('User',function(spotifyAPI, $http, $window) {

  'use strict';

  function User(data) {

    this.name = data.name;
    this.id = this.facebookId = data.id;

    $window.localStorage.setItem('facebookUser', this);

  }

  User.facebookLogin = function(success, failure){
    var token = $window.localStorage.getItem('accessToken');
    if (token) {
      return getDetails(token, success, failure);
    } else {
      return facebookAuthenticate(function(token){
        $window.localStorage.setItem('accessToken', token);
        return getDetails(token, success, failure);
      });
    }
  };


  var getDetails = function(accessToken, success){
    //go get facebook user
    return $http.get("https://graph.facebook.com/me?access_token=" + accessToken)
    .success(function(data){
      success(new User(data));
    });
  };

  var facebookAuthenticate = function (success, failure) {

		var permissions = ['user_about_me'];
		var appId = '154112144637878';

    spotifyAPI.auth.authenticateWithFacebook(appId, permissions)
      .done(function(params) {
          if (params.accessToken) {
            success(params.accessToken);
          } else {
            failure('No access token returned');
          }
      }).fail(function(req, error) {
					console.log('not logged in', error);
          failure('The Auth request ' + req + ' failed with error: ' + error);
      }).always(function() {});
	  
  };

	return User;	
});