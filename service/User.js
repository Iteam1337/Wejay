angular.module('wejay').service('User',function(spotifyAPI, $http, $window) {

  'use strict';

  function User(data) {

    this.facebookId = "";
    this.name = "";
  }

  User.prototype.facebookLogin = function (success, failure) {
		var user = new User();

		var permissions = ['user_about_me'];
		var appId = '154112144637878';

	    spotifyAPI.auth.authenticateWithFacebook(appId, permissions)
	      .done(function(params) {
	          if (params.accessToken) {

							//go get facebook user
							$http.get("https://graph.facebook.com/me?access_token=" + params.accessToken)
								.success(function(facebookUser) {
									var user = new User();

									user.name = facebookUser.name;
									user.id = user.facebookId = facebookUser.id;

									$window.localStorage.setItem('facebookUser', JSON.stringify(facebookUser));
									$window.localStorage.setItem('accessToken', params.accessToken);
									success(user);
								});
	          } else {
              failure('No access token returned');
	          }
	      }).fail(function(req, error) {
						console.log('not logged in', error);
	          failure('The Auth request ' + req + ' failed with error: ' + error);
	      }).always(function() {});
	  
	  return user;
  };

	return User;	
});