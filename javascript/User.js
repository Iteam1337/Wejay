var auth = sp.require("sp://import/scripts/api/auth");
// user class which handles all authentication with facebook and stores accesstokens, usernames, etc
function User() {
    // properties
    this.facebookId = null;
    this.facebookUser = null;
    this.accessToken = null;

    var self = this;

    // TODO:
    this.logoutFromFacebook = function () {
        var logoutUrl = "https://www.facebook.com/logout.php?next=http://wejay.org/logout&access_token=" + this.accessToken;
        auth.showAuthenticationDialog(logoutUrl, "http://wejay.org/logout", {
            onSuccess: function (response) {
                self.facebookId = null;
                self.facebookUser = null;
                self.accessToken = null;
                $("#rooms").html("");
                app.clearLocalStorage();
                app.loggedIntoRoom = null;
                app.showLoginDisclaimer();
            },
            onFailure: function (error) {
                console.log(error);
            }
        });
    };

    this.logout = function () {
        $.ajax({
            url: "http://wejay.org/Room/logout",
            type: "POST",
            traditional: true,
            success: function (result) {
                app.currentRoom.logoutUser();
                app.currentRoom.updateUsers();
                //app.loggedIntoRoom = null;
            },
            error: function (res) {
                console.log("failed to logout");
            }
        });
    };

    this.loadFriends = function (callback) {
        $.getJSON("https://graph.facebook.com/me/friends?access_token=" + self.accessToken + "&callback=?", function (friends) {
            //console.log(friends);
            var users = new Array();
            if (friends && friends.data) {
                friends.data.forEach(function (friend) {
                    users.push(friend.id);
                });
            }
            self.friends = users;
            localStorage.setItem("friends", users);
            if (callback) {
                callback(users);
            }
        });
    }

    //  login to facebook with the current facebook user account
    this.authenticate = function (callback) {
        console.log("starting authentication");
        //
        // we are already authorized
        if (self.accessToken) {
            console.log("already authenticated");
            app.showDisplayNameAsLoggedIn(app.user.facebookUser);
            app.userLogoutShow();
            if (callback && app.currentRoom) {
                app.currentRoom.checkin(false, function (room) {
                    if (callback) {
                        callback(room);
                    }
                    app.currentRoom.updateUsers();
                });
                return;
            } else {
                return;
            }
        }

        var appID = "154112144637878",
            path = "https://www.facebook.com/dialog/oauth?",
            successUrl = "https://www.facebook.com/connect/login_success.html";

        auth.authenticateWithFacebook(appID, ["email", "read_stream"], {

            onSuccess: function (accessToken, ttl) {
                // get the current facebook user details
                $.getJSON("https://graph.facebook.com/me?access_token=" + accessToken + "&callback=?", function (facebookUser) {
                    console.log("logged in user: ", facebookUser);
                    $(".disclaimer .checkbox").removeClass("checked").css("background-position", "0px 36px");
                    $("#roomLogin").attr("disabled", true);
                    app.showDisplayNameAsLoggedIn(facebookUser);
                    self.facebookUser = facebookUser;
                    self.userName = unescape(facebookUser.name);
                    self.facebookId = facebookUser.id;
                    self.accessToken = accessToken;
                    app.userLogoutShow();
                    app.loadRooms();
                    localStorage.setItem("facebookUser", JSON.stringify(facebookUser));
                    localStorage.setItem("accessToken", accessToken);
                    self.friends = localStorage.getItem("friends");
                    //
                    // facebookUser(this); // inherit all facebook properties to this user class
                    if (!app.currentRoom) {
                        app.currentRoom = new RoomController();
                    }
                    app.currentRoom.checkin(false, function (roomName) {
                        if (!app.currentRoom.roomName) {
                            app.currentRoom.init(unescape(roomName));
                        }
                        app.currentRoom.updateUsers();
                        if (callback) {
                            callback(unescape(roomName));
                        }
                    });
                });
            },

            onFailure: function (error) {
                console.log("Authentication failed with error: " + error);
                app.userLogoutHide();
            },

            onComplete: function () {
            }
        });
    }
}