var auth = sp.require('sp://import/scripts/api/auth');

// user class which handles all authentication with facebook and stores accesstokens, usernames, etc
function User(){

	// properties
	this.facebookId = null;
	this.userName = null;
	this.facebookUser = null;	
	this.accessToken = null;
	
	var self = this;
	
	//  login to facebook with the current facebook user account
	this.authenticate = function(callback){
			
		// we are already authorized
		if (this.accessToken){

			if (callback && app.currentRoom){
				app.currentRoom.checkin(function(room){
					if (callback) callback(room);
				});
				return;
			}
			else
				return;
		}
		
		var appID = "154112144637878";
     	var path = 'https://www.facebook.com/dialog/oauth?';
     	var successUrl = "https://www.facebook.com/connect/login_success.html";
     	

		auth.authenticateWithFacebook(appID, ['email', 'read_stream'], {
		
		    onSuccess : function(accessToken, ttl) {

				// get the current facebook user details						
				$.getJSON('https://graph.facebook.com/me?access_token=' + this.accessToken + '&callback=?', function(facebookUser){
					console.log('logged in user: ', facebookUser);							
					
					self.userName = facebookUser.name;
					self.facebookId = facebookUser.id;
					
					//facebookUser(this); // inherit all facebook properties to this user class
									
					if (!app.currentRoom)
						app.currentRoom = new RoomController();
						
						
					app.currentRoom.checkin(function(roomName){
						
						if (!app.currentRoom.roomName)
							app.currentRoom.init( unescape(roomName));
							
						if (callback)
							callback(unescape(roomName));
					});
				    
				});
		    },
		
		    onFailure : function(error) {
		        console.log("Authentication failed with error: " + error);
		    },
		
		    onComplete : function() { }
		});

	}	
}