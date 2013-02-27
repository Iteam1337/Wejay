var auth = sp.require("sp://import/scripts/api/auth");
// user class which handles all authentication with facebook and stores accesstokens, usernames, etc
function User() {
    var self = this;

    self.facebookId = null;
    self.facebookUser = null;
    self.accessToken = null;
    self.userName = null;
    self.friends = null;
    self.checkTokenNext = new Date(null);

    function isValidDate(d) {
        if (Object.prototype.toString.call(d) !== "[object Date]") {
            return false;
        } else {
            return !isNaN(d.getTime());
        }
    }

    if (localStorage.checkTokenNext) {
        var checkDate = new Date(localStorage.checkTokenNext);
        if (isValidDate(checkDate)) {
            self.checkTokenNext = checkDate;
        } else {
            delete localStorage.checkTokenNext;
        } 
    }

    function _checkAccessToken(callback) {
        return callback( new Date() > self.checkTokenNext );
        /*
        $.getJSON("https://graph.facebook.com/debug_token?access_token=" + self.accessToken + "&callback=?", function (res) {
            console.log(res);
            callback(res);
        });
        */
    }

    function checkinToRoom(callback) {
        app.currentRoom.checkin(false, function (roomName) {
            if (!app.currentRoom.roomName) {
                app.currentRoom.init(unescape(roomName));
            }
            app.currentRoom.updateUsers();
            if (callback) {
                callback(unescape(roomName));
            }
        });
    }

    function _loadFriends(callback) {
        $.getJSON("https://graph.facebook.com/me/friends?access_token=" + self.accessToken + "&callback=?", function (friends) {
            var users = [];
            if (friends && friends.data) {
                friends.data.forEach(function (friend) {
                    users.push(friend.id);
                });
                self.friends = users;
                localStorage.setItem("friends", users);
            }
            if (callback) {
                callback(users);
            }
        });
    }

    function _authenticateWithFacebook(callback) {
        var appID = "154112144637878",
            path = "https://www.facebook.com/dialog/oauth?",
            successUrl = "https://www.facebook.com/connect/login_success.html";

        auth.authenticateWithFacebook(appID, ["email", "read_stream"], {

            onSuccess: function (accessToken, ttl) {
                // get the current facebook user details
                $.getJSON("https://graph.facebook.com/me?access_token=" + accessToken + "&callback=?", function (facebookUser) {
                    console.log("logged in user: ", facebookUser);
                    $("#roomLogin").attr("disabled", true);
                    app.showDisplayNameAsLoggedIn(facebookUser);

                    self.userName = unescape(facebookUser.name);
                    self.facebookId = facebookUser.id;
                    self.facebookUser = facebookUser;
                    self.checkTokenNext = moment(new Date()).add("hours", 2)._d;
                    self.accessToken = accessToken;
                    localStorage.checkTokenNext = self.checkTokenNext;
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
                    return checkinToRoom(callback);
                });
            },

            onFailure: function (error) {
                NOTIFIER.show("Authentication failed with error: " + error);
                app.userLogoutHide();
            },

            onComplete: function () {
            }
        });
    }

    // TODO:
    this.logoutFromFacebook = function () {
        var logoutUrl = "https://www.facebook.com/logout.php?next=http://wejay.org/logout&access_token=" + this.accessToken;
        auth.showAuthenticationDialog(logoutUrl, "", {
            onSuccess: function (response) {
                self.checkTokenNext = new Date(null);
                self.facebookUser = null;
                self.accessToken = null;
                self.facebookId = null;
                self.userName = null;
                self.friends = null;
                delete localStorage.checkTokenNext;
                $("#rooms").html("");
                app.clearLocalStorage();
                app.loggedIntoRoom = null;
                app.showLoginDisclaimer();
            },
            onFailure: function (error) {
                NOTIFIER.show(error);
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
                NOTIFIER.show("failed to logout");
            }
        });
    };

    this.loadFriends = function (callback) {
        if (self.accessToken) {
            _checkAccessToken(function (res) {
                if (res.error) {
                    _authenticateWithFacebook(function () {
                        _loadFriends(callback);
                    });
                } else {
                    _loadFriends(callback);
                }
            });
        } else {
            _authenticateWithFacebook(function () {
                _loadFriends(callback);
            });
        }
    }

    //  login to facebook with the current facebook user account
    this.authenticate = function (callback) {
        function continueAuth() {
            console.log("starting authentication");
            app.showDisplayNameAsLoggedIn(app.user.facebookUser);
            app.userLogoutShow();
            if (app.currentRoom) checkinToRoom(callback);
        }
        if (self.accessToken) {
            console.log("already authenticated");
            _checkAccessToken(function (res) {
                if (res) {
                    console.log("Using a old accesstoken");
                    _authenticateWithFacebook(continueAuth);
                } else {
                    continueAuth();
                }
            });
        } else {
            _authenticateWithFacebook(continueAuth);
        }
    }
}