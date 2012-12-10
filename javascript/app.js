// main app logic for Wejay App
function App() {

    var self = this,
        sp = getSpotifyApi(1),
        ui = sp.require("sp://import/scripts/dnd"),
        m = sp.require("sp://import/scripts/api/models"),
        v = sp.require("sp://import/scripts/api/views"),
        r = sp.require("sp://import/scripts/react"),
        kbd = sp.require("sp://import/scripts/keyboard"),
        accessToken,
        facebookId;

    //
    // Before anything begins loading - the application hinders users who are offline
    m.session.observe(m.EVENT.STATECHANGED, function () {
        if (m.session.state >= 2) {
            $("#offline").show();
            $("#main").hide();
        } else {
            $("#offline").hide();
            $("#main").show();
        }
    });

    if (m.session.state >= 2) {
        $("#offline").show();
        $("#main").hide();
    } else {
        $("#offline").hide();
    }

    //
    // This is used to check if the information
    // saved into localStorage is valid when loading the app.
    var checkLocalStorage = [
        { name: "facebookUser", type: "json" },
        { name: "acceptedLogin", type: "boolean" },
        { name: "friends", type: "commaNumber" },
        { name: "room", type: "room" },
        { name: "accessToken", type: "string" }
    ];
    for (var obj in checkLocalStorage) {
        var check = checkLocalStorage[obj],
            name = check.name,
            type = check.type,
            object = localStorage[name],
            test = true;
        if (object !== undefined) {
            switch (type) {
                case "json":
                    try { JSON.parse(object); }
                    catch (e) { test = false; }
                    break;
                case "boolean":
                    test = (object === "true")
                    break;
                case "commaNumber":
                    test = !isNaN(object.split(",")[0]);
                    break;
                case "room":
                    test = (/^([a-z0-9\_\-\ ]){2,10}$/i.exec(object) !== null)
                    break;
                case "string":
                    test = (typeof object === "string")
                    break;
            }
            if (test === false) {
                delete localStorage[name];
                console.log("deleted " + name + " from localStorage");
            }
        }

    }

    //
    // Global connection to node server
    var socket,
        nodeUrl = "http://81.201.221.135:5000";

    //
    // global Toplist
    var topTracks = [],
        topArtists = [];

    // public properties
    this.user = new User();
    this.currentRoom = null;
    this.isPlayingFromWejay = false;
    this.acceptedLogin = false;
    this.loggedIntoRoom = null;
    this.bitlyName = "ankjevelen";
    this.bitlyKey = "R_147ec88bf32a7d569749440093523de6";
    this.timeDiff = null;
    this.checkIfFBUserExists = false;

    // Event handlers
    if (!m.application) {
        alert("This version of Spotify is not compatible with this App. Please upgrade to a newer version and try again");
        history.back();
        return;
    }

    this.updateServerTime = function (data) {
        self.timeDiff = (self.timeDiff !== null) ? self.timeDiff : ((data.hasOwnProperty("serverTime") ? (new Date().getTime()) - data.serverTime : new Date().getTime()));
    };

    this.tabTo = function (tab) {
        if (self.currentRoom && self.currentRoom.currentTab) {
            self.currentRoom.currentTab = tab;
        }
        var currentTab = document.location = "#" + tab + "Section",
            arg = m.application.arguments;
        $("section").removeClass("current");
        $(currentTab).addClass("current");
        $(currentTab).parents("section").addClass("current");
        $(currentTab).children("section").first().addClass("current");
        if (!localStorage.acceptedLogin) {
            return document.location = "spotify:app:wejay:choose";
        }
        switch (tab) {
            case "choose":
                this.loadRooms();
                if (app.isPlayingFromWejay) {
                    self.pauseApp();
                }
                break;
            case "room":
                if (arg.length > 1) {
                    var newRoom = arg[1].toLowerCase();
                    if (self.currentRoom.roomName != newRoom) {
                        self.currentRoom.init(unescape(newRoom), true);
                    }
                } else {
                    if (!self.currentRoom.roomName) {
                        alert("You have to select a room first");
                        document.location = "spotify:app:wejay:choose";
                    }
                }

                if (self.currentRoom.roomName === "example") {
                    document.location = "spotify:app:wejay:choose";
                }

                if (self.loggedIntoRoom === null) {
                    $("#joinRoom, #leaveRoom").hide();
                } else if (self.loggedIntoRoom === "" || self.currentRoom.roomName !== self.loggedIntoRoom) {
                    app.currentRoom.checkin(false, function (room) {
                        app.loggedIntoRoom = room;
                        app.handleLoginInfo();
                        app.currentRoom.updateUsers();
                    });
                    $("#joinRoom").hide();
                    $("#leaveRoom").show();
                } else {
                    $("#leaveRoom").show();
                    $("#joinRoom").hide();
                }
                self.currentRoom.updatePlaylist();
                break;
            case "wejays":
                if (!self.currentRoom.roomName) {
                    alert("You have to select a room first");
                }
                break;
        }
    };
    //
    // tab switched in ui
    m.application.observe(m.EVENT.ARGUMENTSCHANGED, function () {
        var tab = m.application.arguments[0];
        self.tabTo(tab);
    });

    this.handleDroppedLinks = function (links) {
        console.log("dropped", links);
        var droppedLinks = [];
        if (self.checkIfUserAcceptedAgreement()) {
            app.user.authenticate(function (room) {
                if (self.loggedIntoRoom !== room) {
                    self.loggedIntoRoom = room;
                    self.handleLoginInfo();
                    $("#leaveRoom").show();
                    self.loadRooms();
                    self.userLogoutShow();
                }
                links.forEach(function (link) {
                    var type = m.Link.getType(link),
                        max = 10,
                        i = 0;
                    if (m.Link.TYPE.PROFILE === type || m.Link.TYPE.FACEBOOK_USER === type) {
                        console.log("this is currently not available");
                    } else {
                        if (m.Link.TYPE.TRACK === type) {
                            //
                            // adding single track
                            self.currentRoom.addTrackUri(link);
                        } else if (m.Link.TYPE.PLAYLIST === type) {
                            //
                            // adding user generated playlist
                            var playlist = m.Playlist.fromURI(link),
                                tracks = playlist.data.all();
                            tracks.forEach(function (uri) {
                                if (i < max) { // max tracks that can be added at one time is ... 10. TODO: UI-notification
                                    self.currentRoom.addTrackUri(uri);
                                    i++;
                                }
                            });
                            //self.linkPlaylist(playlist);
                        } else if (m.Link.TYPE.ALBUM === type) {
                            //
                            // adding album
                            m.Album.fromURI(link, function (album) {
                                var albumLink = album.data.uri,
                                    tracks = album.data.tracks;
                                tracks.forEach(function (uri) {
                                    if (i < max) {
                                        self.currentRoom.addTrackUri(uri.uri);
                                        i++;
                                    }
                                });
                            });
                        }
                    }
                });
                self.currentRoom.updatePlaylist();
            });
        }
    };

    // when links are dropped to the application we want to add those to the queue
    m.application.observe(m.EVENT.LINKSCHANGED, function (e) {
        var links = m.application.links;
        console.log("dropped links", links);
        self.handleDroppedLinks(links);
    });

    /* helper functions */
    var getTracksFromPlaylist = function (playlist) {
        var result = [], i = 0,
            length = playlist.data.length;
        for (; i < length; i++) {
            var track = playlist.data.getTrack(i);
            if (track) {
                result.push(track);
            }
        }
        return result;
    };

    // load images in the room banner
    var fillRoomToplist = function (room, div) {
        $.ajax({
            url: "http://wejay.org/Room/GetOnlineUsers?room=" + encodeURI(room),
            type: "GET",
            processData: false,
            contentType: "application/json",
            dataType: "text",
            success: function (r) {
                var result = r ? JSON.parse(r).Data : [];
                result = result.sort(function (user1, user2) {
                    return user1.CheckedIn - user2.CheckedIn;
                });
                result = result.slice(0, 9);
                if (result.length === 0) {
                    $("#enterRoomBanner").show();
                } else {
                    $(div).html($("#roomTopListTemplate").tmpl(result));
                    $(div).append("<a>" + room + "</a>");
                    console.log(room);
                    $("#enterRoomBanner").hide();
                }
            }, error: function (r) {
                $("#enterRoomBanner").show();
            }
        });
    };

    this.currentRoomList = [];
    var loaded = false;

    // Load all rooms to startpage
    this.loadRooms = function () {
        if (!app.user.facebookId) {
            return;
        }
        // Loaded twice
        if (!loaded) {
            $('.loadingIndicator').show();
            app.user.loadFriends(function (users) {
                users.push(app.user.facebookId); // add current user as well
                $.ajax({
                    url: "http://wejay.org/room/GetRoomsForUsers",
                    traditional: true,
                    dataType: "json",
                    data: {
                        facebookIds: users
                    },
                    type: "POST",
                    success: function (r) {
                        var updatedFriendsList = false;
                        r = r.filter(function (i) { return i.Name && i.Name.toLowerCase() !== "null" && i.Name.toLowerCase() !== "example"; });

                        if (r.length === 0) {
                            $("#enterRoomBanner").show();
                            $(".wejayRoomsCopy").hide();
                            $("#rooms").html("");
                        } else {
                            self.currentRoomList = r;
                            $("#enterRoomBanner").hide();
                            $(".wejayRoomsCopy").show();
                            $("#rooms").html($("#roomListTemplate").tmpl(r));
                        }
                    }
                });

                $('.loadingIndicator').hide();
            });

            loaded = true;
        }
    };

    this.fillRooms = function () {
        $(".rooms li ").each(function () {
            var room = this.innerText;
            fillRoomToplist(room, this);
            $(this).click(function () {
                document.location = "spotify:app:wejay:room:" + room;
            });
        });
    };

    //
    // Copy for "Open a room"
    this.loggedInCopy = function (noRoom) {
        $("#overlay").hide();
        var user = app.user.userName,
            room = app.loggedIntoRoom;
        if (noRoom) {
            return "Hi there " + unescape(user) + ", you are currently not logged into any room ...";
        } else if (room === "example") {
            return "Hi there " + unescape(user) + ", please choose a room-name to begin using Wejay!"
        } else {
            return "Hi there " + unescape(user) + ", you are currently logged in to the room: <a href=\"spotify:app:wejay:room:" + room + "\">" + room.toUpperCase() + "</a>";
        }
    };

    this.handleLoginInfo = function (force) {
        var copy = self.loggedInCopy(force);
        $("#disclaimerLoginOriginal p").html(copy);
    }

    this.standardCopyLoggedOut = "I understand that by logging in with my Facebook account I enable WEJAY to use and store information from my Spotify library and listening history. This is done to provide a great listening experience.";

    this.userLogoutShow = function () {
        $("#login, #roomLogin").hide();
        $("#roomLogout, #leaveRoom").show();
    };

    this.userLogoutHide = function () {
        $("#login, #roomLogin").show();
        $("#logout, #leaveRoom, #joinRoom, #roomLogout").hide();
        $("#disclaimerLoginOriginal p").html(self.standardCopyLoggedOut);
    };

    this.checkIfUserAcceptedAgreement = function () {
        var accepted = false;
        if (self.acceptedLogin) {
            accepted = true;
            self.checkIfUserIsLoggedIn();
        } else {
            $(".disclaimer").show();
        }
        return accepted;
    };

    this.checkIfUserIsLoggedIn = function () {
        if (!app.user.accessToken) {
            app.user.authenticate();
        }
    };

    this.playApp = function () {
        app.isPlayingFromWejay = true;
        $("#onair").show();
        $("#start").addClass("pause");
        app.currentRoom.playSong(app.currentRoom.currentSong, true);
    };

    this.pauseApp = function () {
        var player = sp.trackPlayer;
        app.isPlayingFromWejay = false;
        $("#onair").hide();
        $("#start").removeClass("pause");
        player.setIsPlaying(false);
    };

    m.player.observe(m.EVENT.CHANGE, function (event) {
        var player = event.data;
        if (app.isPlayingFromWejay === true) {
            if (player.volume === false && player.shuffle === false && player.repeat === false) {
                if (player.curtrack === false && player.playstate === false) {
                    self.pauseApp();
                } else if (m.player.canPlayNext === true && m.player.canPlayNext === true) {
                    self.pauseApp();
                }
            }
        } else if (m.player.context !== null && m.player.canPlayNext === false && m.player.canPlayNext === false) {
            if (player.volume === false && player.shuffle === false && player.repeat === false) {
                if (player.curtrack === false && player.playstate === false && sp.trackPlayer.getIsPlaying() === false) {
                    if (window.location.hash !== "#chooseSection") {
                        self.playApp();
                    }
                }
            }
        }

    });

    /* INIT */
    // init function
    this.init = function (version) {
        this.version = version;

        if ((!self.checkIfFBUserExists) && (localStorage.facebookUser !== undefined && localStorage.acceptedLogin !== undefined && localStorage.accessToken !== undefined && localStorage.room !== undefined)) {
            var facebookUser = JSON.parse(localStorage.facebookUser);
            app.user.facebookId = facebookUser.id;
            app.user.facebookUser = facebookUser;
            app.user.accessToken = localStorage.accessToken;
            app.user.authenticate();
            app.loggedIntoRoom = localStorage.room;
            self.userLogoutShow();
        } else {
            app.user.facebookId = "";
            app.user.facebookUser = {};
            app.user.accessToken = "";
            self.userLogoutHide();
        }

        var acceptedLogin = (localStorage.acceptedLogin) ? localStorage.acceptedLogin : false;

        if (acceptedLogin === "true") {
            self.acceptedLogin = true;
        } else {
            //
            // if the user has not accepted the disclaimer -- he/she will be reverted to the
            // "open a room"-section. Also, the standardroom will be the iteam-room.
            $(".disclaimer:first").hide();
            $("#disclaimerLoginOriginal").hide();
            if (localStorage.room === undefined) {
                localStorage.room = "example";
                document.location = "spotify:app:wejay:choose";
            }
        }

        if (app.user.accessToken) {
            this.loadRooms();
        }

        var ac = sp.require("javascript/AutocompleteForm");
        ac.init(".auto-completeForm");

        $("#tutorialBtn").on("click", function () {
            $("#getStarted").hide();

            $("#tutorial").show();
            $("#stepOne").show().addClass("open");
            $("#tutorialNavigation .prev").hide();
            $("#tutorialNavigation .next").show();
            $("#loginInformation").hide();
        });

        function tutorialNextPrev(direction) {
            if (direction == "next") {
                $("#tutorialSteps").find(".open").removeClass("open").hide().next().addClass("open").show();
            }
            else {
                $("#tutorialSteps").find(".open").removeClass("open").hide().prev().addClass("open").show();
            }

            var active = $("#tutorialSteps").find(".open").attr("id");

            if (active === "stepTwo" || active === "stepThree") {
                $(".roomQueue li").hide();

                $("#" + active).find(".roomQueue li").each(function (i) {
                    $(this).delay(1000 * i).show(0);
                });

                if (active === "stepThree") {
                    $("#getStarted").show();
                }
                else {
                    $("#getStarted").hide();
                }
            }

            if ($("#stepOne").hasClass("open")) {
                $("#tutorialNavigation .prev").hide();
            }
            else {
                $("#tutorialNavigation .prev").show();
            }

            if ($("#stepThree").hasClass("open")) {
                $("#tutorialNavigation .next").hide();
            }
            else {
                $("#tutorialNavigation .next").show();
            }
        }

        $(".next").on("click", function () {
            tutorialNextPrev("next");
        });

        $(".prev").on("click", function () {
            tutorialNextPrev("prev");
        });

        $("#getStarted").on("click", function () {
            $("#roomName").focus();
            $("#tutorial").hide();
            $("#loginInformation").show();
            $("#roomsInformation").show();
        });

        //
        // when switching rooms -- the app should not autostart the music ...
        self.isPlayingFromWejay = false;
        $("#start").removeClass("pause");
        $("#onair").hide();

        $("#roomLogout").on("click", function () {
            self.user.logoutFromFacebook();
            app.loggedIntoRoom = "";
            self.userLogoutHide();
        });

        $("#login, #roomLogin").on("click", function () {
            if (self.checkIfUserAcceptedAgreement()) {
                self.user.authenticate(function (room) {
                    self.loggedIntoRoom = room;
                    self.handleLoginInfo();
                    $("#leaveRoom").show();
                    self.loadRooms();
                    self.userLogoutShow();
                });
            }
        });

        $("#roomSection").on("drop", function (e) {
            e.preventDefault();
            var id = event.dataTransfer.getData("text");
            if (e.target.id === "searchInputField") {
                var type = m.Link.getType(id), dropped = false;
                if (type === 2) {
                    m.Album.fromURI(id, function (album) {
                        var albumLink = album.data.uri,
                            tracks = album.data.tracks;
                        dropped = tracks[0].artists[0].name + " " + tracks[0].album.name;
                    });
                }
                if (type === 4) {
                    m.Track.fromURI(id, function (track) {
                        dropped = track.data.artists[0].name + " " + track.data.name;
                    });
                }
                if (type === 5) {
                    dropped = m.Playlist.fromURI(id).data.name;
                }
                if (dropped !== false) {
                    e.target.value = dropped;
                    $(e.target).trigger("dosearch");  
                }
            } else if (self.checkIfUserAcceptedAgreement()) {
                self.handleDroppedLinks([id]);
            }
        });

        $("#roomName").on("focus", function (e) {
            $("form.input").addClass("focus");
        });

        $("#roomName").on("blur", function (e) {
            $("form.input").removeClass("focus");
        });

        $("#roomSection").on("dragenter", function (e) {
            e.preventDefault();
            return true;
        });

        $("#roomSection").on("dragover", function (e) {
            return false;
        });

        $("#shareOnURL").on("click", function (e) {
            $("#manualShare").toggleClass("hide");
            var value = ($("#shareOnURL").text() === "Share URL") ? "Hide url share" : "Share URL";
            $("#shareURL").val(self.currentRoom.shareURL);
            $("#shareOnURL").text(value);
        });

        //
        // share popup
        $("#share").on("click", function (e) {
            e.preventDefault();
            if (self.checkIfUserAcceptedAgreement()) {
                $("#sharePopup").toggleClass("show");
            }
        });

        $("#closeShare").on("click", function () {
            $("#sharePopup").removeClass("show");
        });

        var loginFunction = function (newRoomName) {
            if (/^([a-z0-9\_\-\ ]){2,10}$/i.exec(newRoomName) !== null) {
                app.currentRoom.init(newRoomName, true);
                document.location = 'spotify:app:wejay:room';
            } else if (newRoomName.length >= 11 || newRoomName.length <= 1) {
                alert("Your roomname should contain between 2 and 10 letters.");
            } else {
                var temp = newRoomName.match(/([^a-z0-9\_\-\ ])/ig, "$1"),
                    matchString = temp.join(" ");
                alert("Something went wrong with the roomname. You used the following characters which is not allowed:\n" + matchString);
            }
        };

        $("#roomSelect").on("submit", function (e) {
            e.preventDefault();
            var newRoomName = $("#roomName").val().toLowerCase();
            loginFunction(newRoomName);
            return false;
        });

        $("#roomSelectBanner").on("submit", function (e) {
            e.preventDefault();
            var newRoomName = $("#roomNameBanner").val().toLowerCase();
            loginFunction(newRoomName);
            return false;
        });

        $(document).on("click", "#userToplist a.addSongToQueue", function (e) {
            e.preventDefault();
            if (self.checkIfUserAcceptedAgreement()) {
                var link = $(this).attr("href");
                self.currentRoom.addTrackUri(link);
            }
        });

        $(document).on("click", ".tracks a", function (e) {
            e.preventDefault();
            var link = $(this).attr("href");
            if (self.checkIfUserAcceptedAgreement()) {
                self.currentRoom.addTrackUri(link);
            }
            $(".auto-complete").removeClass("show");
        });

        //
        // one way to correct the auto-completeForm show/hide-function
        $("body").on("click", function (e) {
            var parentClass = $(e.target).parent().parent().hasClass("auto-completeForm");
            if ($(".auto-complete").hasClass("show")) {
                if (!parentClass) {
                    $(".auto-complete").removeClass("show");
                }
            } else {
                if (parentClass) {
                    $(".auto-complete").addClass("show");
                }
            }
        });

        $("#joinRoom").on("click", function () {
            app.currentRoom.checkin(false, function (room) {
                app.loggedIntoRoom = room;
                self.handleLoginInfo();
                app.currentRoom.updateUsers();
            });
            $(this).hide();
            $("#leaveRoom").show();
        });

        $("#leaveRoom").on("click", function () {
            $(this).hide();
            self.user.logout();
            self.handleLoginInfo(true);
            app.loggedIntoRoom = "";
            $("#joinRoom").show();
            document.location = "spotify:app:wejay:choose";
        });

        $(document).on("click", "#queue li .star", function () {
            var element = $(this),
                CurrentClass = element.attr("class").match(/(no)+(\d){1}/),
                song = element.parent().find(".track").attr("href"),
                SpotifyId = song.split(":"),
                length = SpotifyId.length - 1,
                CurrentClassNumber = parseInt(CurrentClass[2]);
            CurrentClass = CurrentClass[0];
            SpotifyId = SpotifyId[length];
            if (self.checkIfUserAcceptedAgreement()) {
                if ((CurrentClassNumber === 3) || (CurrentClassNumber === 5)) {
                    app.currentRoom.liveVote(SpotifyId, element, CurrentClassNumber);
                }
            }
        });

        //
        // bind space to play-pause
        $(document).on("keydown", function (e) {
            //
            // If user is in tab "wejay", only then space acts as play-pause.
            if (e.target.nodeName !== "INPUT" && e.keyCode === 32 && document.location.hash === "#roomSection") {
                e.preventDefault();
                if (app.isPlayingFromWejay) {
                    self.pauseApp();
                } else {
                    self.playApp();
                }
                return false;
            }
        });

        $("#start").on("click", function () {
            //
            // If the user presses play -- then wejay should force-play each time the track changes
            if ($(this).hasClass("pause")) {
                self.pauseApp();
            } else {
                // wejay should play.
                self.playApp();
            }
        });


        //
        // initialize the disclaimer
        if (self.acceptedLogin === false) {
            $("#overlay").show().find(".rooms").show();
            $("#login").attr("disabled", true);
            $(".disclaimer .checkbox").hover(
                function () {
                    var button = $(".disclaimer.rooms .sp-button");
                    $("#login").attr("disabled", false);
                    button.addClass("hover");
                },
                function () {
                    var button = $(".disclaimer.rooms .sp-button");
                    $("#login").attr("disabled", true);
                    button.removeClass("hover");
                }
            );
            $(".disclaimer .checkbox").click(function () {
                $(".disclaimer").remove();
                $("#login").attr("disabled", false);
                localStorage.acceptedLogin = "true";
                $(".disclaimerRooms").removeClass("disclaimerRooms");
                $("#disclaimerLoginOriginal").show();
                self.acceptedLogin = true;
            });
        } else {
            $(".disclaimer").remove();
            $("#overlay").hide();
            self.loadRooms();
        }
        $("#like").on({
            mouseenter: function () {
                $("#likeHover").show();
            },
            mouseleave: function () {
                $("#likeHover").hide();
            }
        });
        $("#like").on("click", function () {
            if (self.checkIfUserAcceptedAgreement()) {
                app.currentRoom.like();
            }
        });

        $("#block").on("click", function () {
            if (self.checkIfUserAcceptedAgreement()) {
                app.currentRoom.block();
            }
        });
        $("#skip").on("click", function () {
            if (self.checkIfUserAcceptedAgreement()) {
                app.currentRoom.skip();
            }
        });

        $("#voteButton").on("click", function () {
            if (self.checkIfUserAcceptedAgreement()) {
                $("#voteOverlay").toggleClass("show");
            }
        });

        $("#voteOverlay").on("click", function (el) {
            if (el.target.id === "voteOverlay") {
                if (self.checkIfUserAcceptedAgreement()) {
                    $(this).toggleClass("show");
                }
            }
        });

        $("#voteOverlay .close").on("click", function (el) {
            $("#voteOverlay").toggleClass("show");
        });

        // fill default rooms
        self.fillRooms();

        self.currentRoom = new RoomController(unescape(localStorage.room || "example"), nodeUrl);

        var tab = m.application.arguments[0];

        this.tabTo(tab);

        // Toplist
        var toplist = new m.Toplist();
        toplist.toplistType = m.TOPLISTTYPE.USER;
        toplist.matchType = m.TOPLISTMATCHES.TRACKS;
        toplist.userName = m.TOPLISTUSER_CURRENT;
        toplist.observe(m.EVENT.CHANGE, function () {
            var i = 0, max = 10;
            for (; i < max; i++) {
                $("#userToplist").append($("#userToplistTemplate").tmpl(toplist.results[i]));
            }
        });
        toplist.run();
    };
}

String.prototype.format = function () {
    var formatted = this, i = 0,
        arg = arguments.length;
    for (; i < arg; i++) {
        var regexp = new RegExp("\\{' + i + '\\}', 'gi");
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};