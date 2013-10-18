// main app logic for Wejay App
function App() {


    function handleError(showReconnect, message) {
        if (showReconnect) {
            $("#offline button").show();
        } else {
            $("#offline button").hide();
        }
        message = message ? message : "Sorry, we can not connect to realtime service, try again soon";
        $("#offline").show();
        $("#offline p").text(message);
        $("#online").hide();
    }

    function hideOfflineContent(reset) {
        $("#offline").hide();
        $("#online").show();
        if (reset) {
            //TODO: Handle reset
        }
    }

    function checkInToWejayAndSql(callback) {
        app.currentRoom.checkin(false, function () {
            app.currentRoom.updateUsers();
            return callback(true);
        });
    }

    function checkIfUserIsLoggedIn(callback) {
        if (!!app.user.accessToken || new Date() < app.user.checkTokenNext) {
            checkInToWejayAndSql(callback);
        } else {
            app.user.authenticate(function () {
                checkInToWejayAndSql(callback);
            });
        }
    }

    function checkLocalVariables() {
        var checkLocalStorage, obj,
            check, name, type, object, test;
        //
        // This is used to check if the information
        // saved into localStorage is valid when loading the app.
        checkLocalStorage = [
            { name: "facebookUser", type: "json" },
            { name: "acceptedLogin", type: "boolean" },
            { name: "friends", type: "commaNumber" },
            { name: "room", type: "room" },
            { name: "accessToken", type: "string" }
        ];
        for (obj in checkLocalStorage) {
            check = check = checkLocalStorage[obj];
            name = check.name;
            type = check.type;
            object = localStorage[name];
            test = true;
            if (object !== undefined) {
                switch (type) {
                    case "json":
                        try { JSON.parse(object); }
                        catch (e) { test = false; }
                        break;
                    case "boolean":
                        test = (object === "true");
                        break;
                    case "commaNumber":
                        test = !isNaN(object.split(",")[0]);
                        break;
                    case "room":
                        test = (/^([a-z0-9\_\-\ ]){2,10}$/i.exec(object) !== null);
                        break;
                    case "string":
                        test = (typeof object === "string");
                        break;
                }
                if (test === false) {
                    delete localStorage[name];
                    NOTIFIER.show("deleted " + name + " from localStorage");
                }
            }

        }
        obj = null;
        checkLocalStorage = null;
    }

    var self, sp, ui, m, v, r, kbd, accessToken, facebookId, newCheck;

    self = this;
    sp = getSpotifyApi();
    ui = sp.require("sp://import/scripts/dnd");
    m = sp.require('$api/models');
    v = sp.require("sp://import/scripts/api/views");
    r = sp.require("sp://import/scripts/react");
    kbd = sp.require("sp://import/scripts/keyboard");
    newCheck = null;

    //
    // Global connection to node server
    this.nodeUrl = "http://81.201.221.135:5000";

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
    this.loaded = false;

    // Event handlers
    if (!m.application) {
        alert("This version of Spotify is not compatible with this App. Please upgrade to a newer version and try again");
        history.back();
        return;
    }

    this.updateServerTime = function (data) {
        self.timeDiff = (self.timeDiff !== null) ? self.timeDiff : ((data.hasOwnProperty("serverTime") ? (new Date().getTime()) - data.serverTime : new Date().getTime()));
    };

    this.placeFooter = function () {
        var contentHeight, windowHeight;
        contentHeight = $('.current section').height();
        windowHeight = $(window).height() - $('.current footer').height() - 90;

        if (windowHeight < contentHeight) {
            $('.current footer').css('position', 'relative');
            $('#aboutSection, #roomSection, #chooseSection').css('box-sizing', 'content-box');
        }
        else {
            $('footer').css('position', 'absolute');
            $('#aboutSection, #roomSection, #chooseSection').css('box-sizing', 'border-box');
        }
    };

    this.tabTo = function (tab) {
        var currentTab, newRoom, arg;
        if (self.currentRoom && self.currentRoom.currentTab) {
            self.currentRoom.currentTab = tab;
        }
        currentTab = document.location = "#" + tab + "Section";
        arg = m.application.arguments;
        if (arg.length > 1) {
            if (self.currentRoom.roomName != newRoom) {
                newRoom = arg[1].toLowerCase();
                self.currentRoom.init(unescape(newRoom), true);
            }
        }
        if (self.currentRoom.roomName === "example" && tab === "room") {
            document.location = "spotify:app:wejay:choose";
            return;
        }
        $("section").removeClass("current");
        $(currentTab).addClass("current");
        $(currentTab).parents("section").addClass("current");
        $(currentTab).children("section").first().addClass("current");

        if (!localStorage.acceptedLogin) {
            document.location = "spotify:app:wejay:choose";
            return;
        }

        switch (tab) {
            case "choose":
                this.loadRooms();
                if (app.isPlayingFromWejay) {
                    self.pauseApp();
                    $('#start').removeClass('onair');
                }
                $("#enterRoomBanner").hide();
                break;
            case "room":
                if (self.loggedIntoRoom === null) {
                    app.userLogoutHide();
                } else if (self.loggedIntoRoom === "" || self.currentRoom.roomName !== self.loggedIntoRoom) {
                    app.currentRoom.checkin(false, function (room) {
                        app.loggedIntoRoom = room;
                        app.currentRoom.updateUsers();
                    });
                    app.userLogoutShow();
                } else {
                    app.userLogoutShow();
                }
                self.currentRoom.updatePlaylist();
                break;
            case "wejays":
                if (!self.currentRoom.roomName) {
                    alert("You have to select a room first");
                }
                break;
        }

        self.placeFooter();
    };

    this.clearLocalStorage = function () {
        var obj;
        for (obj in localStorage) {
            delete localStorage[obj];
        }
        localStorage.room = "example";
    };

    this.showDisplayNameAsLoggedIn = function (FBUser) {
        if (FBUser) {
            $("#signedInAs").html("Logged in as <span>" + FBUser.name + "</span>");
        }
    };

    this.showLoginDisclaimer = function () {
        self.loaded = false;
        delete localStorage.acceptedLogin;
        app.acceptedLogin = false;
        $("#overlay").show().find(".rooms").show();
        $("#facebook").show();
        $("#roomLogin").attr("disabled", true);
    };

    this.handleDroppedLinks = function (links) {
        function addSong(room) {
            var max, i, count;
            if (app.loggedIntoRoom !== room) {
                app.loggedIntoRoom = room;
                $("#leaveRoom").show();
                app.loadRooms();
                app.userLogoutShow();
            }
            max = 10;
            i = 0;
            count = links.length;
            if (count < max) {
                links.forEach(function (link) {
                    var type, playlist, tracks, albumLink, count;
                    max = 10;
                    i = 0;
                    type = m.Link.getType(link);
                    if (m.Link.TYPE.PROFILE === type || m.Link.TYPE.FACEBOOK_USER === type) {
                        NOTIFIER.show("this is currently not available");
                    } else {
                        if (m.Link.TYPE.TRACK === type) {
                            //
                            // adding single track
                            self.currentRoom.addTrackUri(link);
                        } else if (m.Link.TYPE.PLAYLIST === type) {
                            //
                            // adding user generated playlist
                            playlist = m.Playlist.fromURI(link);
                            tracks = playlist.data.all();
                            count = tracks.length;
                            tracks = tracks.splice(0, 10);
                            if (count < max) {
                                tracks.splice(0, 10);
                                tracks.forEach(function (uri) {
                                    self.currentRoom.addTrackUri(uri);
                                });
                            } else {
                                self.handleUserDroppingToManyObjects(tracks, max, "tracks");
                            }
                        } else if (m.Link.TYPE.ALBUM === type) {
                            //
                            // adding album
                            m.Album.fromURI(link, function (album) {
                                albumLink = album.data.uri;
                                tracks = album.data.tracks;
                                count = tracks.length;
                                tracks = tracks.splice(0, 10);
                                if (count < max) {
                                    tracks.forEach(function (uri) {
                                        self.currentRoom.addTrackUri(uri.uri);
                                    });
                                } else {
                                    self.handleUserDroppingToManyObjects(tracks, max, "tracks");
                                }
                            });
                        }
                    }
                });
            } else {
                links.splice(0, 10);
                self.handleUserDroppingToManyObjects(links, max, "links");
            }
            // HACK: handle the async callbacks for each added track and run update after all items are added. Now we wait 1s instead..
            setTimeout(function () {
                self.currentRoom.updatePlaylist();
            }, 1000);
        }
        self.checkIfUserAcceptedAgreement(function (response) {
            if (!!response) {
                addSong(app.currentRoom.roomName);
            } else {
                app.user.authenticate(function (room) {
                    addSong(room);
                });
            }
        });
    };

    this.handleUserDroppingToManyObjects = function (objects, max, isItTracks) {
        var newHtml;
        isItTracks = (isItTracks !== undefined && isItTracks.toLowerCase() === "tracks") ? true : false;
        newHtml = $("#addedTracksLimitReachedTemplate").tmpl({ max: max });
        $("#addedTracksLimitReached").html(newHtml);
        $("#overlayLimit").show();
        $("#addedTracksLimitReached").on("click", ".accept", function (e) {
            if (isItTracks) {
                objects.forEach(function (uri) {
                    app.currentRoom.addTrackUri(uri);
                });
            } else {
                app.handleDroppedLinks(objects);
            }
            app.removeUserDroppedTemplate();
        });
        $("#addedTracksLimitReached").on("click", ".cancel", function (e) {
            app.removeUserDroppedTemplate();
        });
    };

    this.removeUserDroppedTemplate = function () {
        $("#addedTracksLimitReached").html("");
        $("#overlayLimit").hide();
    };

    // load images in the room banner
    this.fillRoomToplist = function (room, div) {
        $.ajax({
            url: "http://wejay.org/Room/GetOnlineUsers?room=" + encodeURI(room),
            type: "GET",
            processData: false,
            contentType: "application/json",
            dataType: "text",
            success: function (r) {
                var result;
                result = r ? JSON.parse(r).Data : [];
                result = result.sort(function (user1, user2) {
                    return user1.CheckedIn - user2.CheckedIn;
                });
                result = result.slice(0, 9);
                if (result.length === 0) {
                    $("#enterRoomBanner").show();
                } else {
                    $(div).html($("#roomTopListTemplate").tmpl(result));
                    $(div).append("<a>" + room + "</a>");
                    $("#enterRoomBanner").hide();
                }
            }, error: function (r) {
                $("#enterRoomBanner").show();
            }
        });
    };

    // Load all rooms to startpage
    this.loadRooms = function () {
        if (!app.user.facebookId) {
            return;
        }
        // Loaded twice
        if (!self.loaded) {
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
                            $("<p><strong>No rooms found</strong></p>").insertBefore("#createRoom");
                        } else {
                            $("#enterRoomBanner").hide();
                            $(".wejayRoomsCopy").show();
                            $("#rooms").html($("#roomListTemplate").tmpl(r));
                        }
                    }
                });

                $('.loadingIndicator').hide();
            });

            self.loaded = true;
        }
    };

    this.fillRooms = function () {
        $(".rooms li ").each(function () {
            var room;
            room = this.innerText;
            self.fillRoomToplist(room, this);
            $(this).click(function () {
                document.location = "spotify:app:wejay:room:" + room;
            });
        });
    };

    this.userLogoutShow = function () {
        $("#joinRoom, #facebook").hide();
        $("#leaveRoom").show();
    };

    this.userLogoutHide = function () {
        $("#joinRoom").show();
        $("#leaveRoom").hide();
    };

    this.checkIfUserAcceptedAgreement = function (callback) {
        if (self.acceptedLogin) {
            checkIfUserIsLoggedIn(function () {
                return callback(true);
            });
        } else {
            $(".disclaimer").show();
            return callback(false);
        }
    };

    this.playApp = function () {
        app.isPlayingFromWejay = true;
        $("#onair").show();
        app.currentRoom.playSong(app.currentRoom.currentSong, true);
        $("#start").addClass("pause").addClass("onair");
    };

    this.pauseApp = function () {
        var player;
        player = sp.trackPlayer;
        app.isPlayingFromWejay = false;
        $("#onair").hide();
        player.setIsPlaying(false);
        $("#start").removeClass("pause").removeClass("onair");
    };

    /* INIT */
    this.init = function (version) {
        var directives;
        directives = sp.require("javascript/Directives");
        directives.init(version);
        window.onerror = function (errorMsg, url, lineNumber) {
            NOTIFIER.show(errorMsg + ' @' + url + ':' + lineNumber);
        };
    };

    checkLocalVariables();

    if (m.session.state >= 2) {
        handleError();
    } else {
        hideOfflineContent();
    }

    //
    // Before anything begins loading - the application hinders users who are offline
    m.session.observe(m.EVENT.STATECHANGED, function () {
        if (m.session.state >= 2) {
            return handleError(true);
        } else {
            return hideOfflineContent(true);
        }
    });

    //
    // tab switched in ui
    m.application.observe(m.EVENT.ARGUMENTSCHANGED, function () {
        var tab;
        tab = m.application.arguments[0];
        self.tabTo(tab);
    });

    // when links are dropped to the application we want to add those to the queue
    m.application.observe(m.EVENT.LINKSCHANGED, function (e) {
        var links;
        links = m.application.links;
        console.log("dropped links", links);
        self.handleDroppedLinks(links);
    });

    m.player.observe(m.EVENT.CHANGE, function (event) {
        function runAfterTimeout() {
            app.currentRoom.hub.checkCurrentSong(app.loggedIntoRoom, function (error, data) {
                if (!!data && !!app.isPlayingFromWejay) {
                    if (!player.curtrack && !player.playstate) {
                        self.pauseApp();
                    } else if (!!m.player.canPlayNext) {
                        self.pauseApp();
                    } else if (!sp.trackPlayer.getIsPlaying()) {
                        canWePlayNextSong(true);
                    }
                } else if (event.data.context !== null && !m.player.canPlayNext) {
                    canWePlayNextSong();
                }
            });
        }
        function canWePlayNextSong(playingFromWejay) {
            playingFromWejay = !playingFromWejay ? !sp.trackPlayer.getIsPlaying() : false;
            if (window.location.hash === "#chooseSection") {
                return;
            } else if (!playingFromWejay) {
                self.playApp();
            }
        }
        var player;

        player = event.data;

        if (!!player.volume || !!player.shuffle || !!player.repeat) {
            return;
        }

        window.clearTimeout(newCheck);
        newCheck = window.setTimeout(runAfterTimeout, 5000);
    });
}
