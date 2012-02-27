var auth = sp.require('sp://import/scripts/api/auth');

// user class which handles all authentication with facebook and stores accesstokens, usernames, etc
function User(){

	// properties
	this.facebookId = null;
	this.facebookUser = null;
	//this.facebookUser = null;	
	this.accessToken = null;
	
	var self = this;

	this.logout = function () {
	    var logoutUrl = "https://www.facebook.com/logout.php?next=http://wejay.org/logout&access_token=" + this.accessToken;
	    auth.showAuthenticationDialog(logoutUrl, "http://wejay.org/logout", {
	        onSuccess: function () {
	            //app.currentRoom.updateUsers();

	            self.facebookId = null;
	            self.facebookUser = null;
	            self.accessToken = null;

	            $('#rooms').html('');

	            localStorage.removeItem('facebookUser');
	        }
	    });
	};


	this.loadFriends = function (callback) {

	    $.getJSON('https://graph.facebook.com/me/friends?access_token=' + self.accessToken + '&callback=?', function (friends) {

	        //console.log(friends);
	        var users = new Array();

	        if (friends && friends.data)
	            friends.data.forEach(function (friend) {
	                users.push(friend.id);
	            });

	        self.friends = users;

	        localStorage.setItem('friends', users);

	        if (callback)
	            callback(users);
	    });
	}


	//  login to facebook with the current facebook user account
	this.authenticate = function (callback) {
	    console.log('starting authentication');

	    // we are already authorized
	    if (self.accessToken) {
	        console.log('already authenticated');

	        $('#logout').show();
	        $('#login').hide();

	        if (callback && app.currentRoom) {


	            app.currentRoom.checkin(false, function (room) {
	                if (callback) callback(room);
	                app.currentRoom.updateUsers();

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

	        onSuccess: function (accessToken, ttl) {

	            // get the current facebook user details						
	            $.getJSON('https://graph.facebook.com/me?access_token=' + accessToken + '&callback=?', function (facebookUser) {
	                console.log('logged in user: ', facebookUser);

	                self.facebookUser = facebookUser;
	                self.userName = unescape(facebookUser.name);
	                self.facebookId = facebookUser.id;
	                self.accessToken = accessToken;

	                $('#logout').show();
	                $('#login').hide();

	                app.loadRooms();

	                localStorage.setItem('facebookUser', facebookUser);
	                self.friends = localStorage.getItem('friends');

	                //facebookUser(this); // inherit all facebook properties to this user class

	                if (!app.currentRoom)
	                    app.currentRoom = new RoomController();


	                app.currentRoom.checkin(false, function (roomName) {

	                    if (!app.currentRoom.roomName)
	                        app.currentRoom.init(unescape(roomName));

	                    app.currentRoom.updateUsers();

	                    if (callback)
	                        callback(unescape(roomName));
	                });

	            });
	        },

	        onFailure: function (error) {
	            console.log("Authentication failed with error: " + error);
	        },

	        onComplete: function () { }
	    });

	}	
}