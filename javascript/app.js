// main app logic for Wejay App
function App () {

    var self    = this
      , sp      = getSpotifyApi(1)
      , ui      = sp.require("sp://import/scripts/dnd")
      , m       = sp.require("sp://import/scripts/api/models")
      , v       = sp.require("sp://import/scripts/api/views")
      , r       = sp.require("sp://import/scripts/react")
      , kbd     = sp.require("sp://import/scripts/keyboard")
      , accessToken
      , facebookId;

    //
    // Global connection to node server
    var socket
      , nodeUrl = "http://81.201.221.135:5000";

    //
    // global Toplist
    var topTracks = []
      , topArtists = [];

    // public properties
    this.user               = new User();
    this.currentRoom        = null;
    this.isPlayingFromWejay = true;

    /* Event handlers */
    if (!m.application) {
        alert("This version of Spotify is not compatible with this App. Please upgrade to a newer version and try again");
        history.back();
        return;
    }

    this.tabTo = function (tab) {
        self.currentRoom.currentTab = tab;

        var currentTab = document.location = "#" + tab + "Section";
        $("section").removeClass("current");

        $(currentTab).addClass("current");
        $(currentTab).parents("section").addClass("current");
        $(currentTab).children("section").first().addClass("current");

        console.log("tabTo =>", m.application.arguments, "this.user =>", self.user.facebookId);

        if (tab == "choose") {
            this.loadRooms();
        }

        if (tab == "room") {
            if (m.application.arguments.length > 1) {
                var newRoom = m.application.arguments[1].toLowerCase();
                if (self.currentRoom.roomName != newRoom) {
                    console.log("new room", newRoom);
                    self.currentRoom.init(unescape(newRoom), true);
                }
            } else {
                if (!self.currentRoom.roomName) {
                    alert("You have to select a room first");
                }
            }

            self.currentRoom.updatePlaylist();

        }

        if (tab == "wejays") {
            if (!self.currentRoom.roomName) {
                alert("You have to select a room first");
            }
        }
    }

    // tab switched in ui
    m.application.observe(m.EVENT.ARGUMENTSCHANGED, function () {
        var tab = m.application.arguments[0];
        self.tabTo(tab);
    });

    this.handleDroppedLinks = function (links) {
        console.log("dropped", links);
        var droppedLinks = [];
        app.user.authenticate(function () {
            links.forEach(function (link) {
                var type = m.Link.getType(link);
                if (m.Link.TYPE.PROFILE === type || m.Link.TYPE.FACEBOOK_USER === type) {
                    var user = m.User.fromURI(link, function (user) {
                        console.log("found user: ", user);
                        alert("You can not yet invite people by dragging them, please share the link to the room instead, you will find it on the Wejays tab");
                    });
                } else {
                    if (m.Link.TYPE.TRACK === type) {
                        //
                        // adding single track
                        self.currentRoom.addTrackUri(link);
                    } else if (m.Link.TYPE.PLAYLIST === type) {
                        //
                        // adding user generated playlist
                        var playlist = m.Playlist.fromURI(link)
                          , tracks = playlist.data.all();
                        console.log("playlist: ", tracks);
                        tracks.forEach(function (uri) {
                            self.currentRoom.addTrackUri(uri);
                        });
                        self.currentRoom.updatePlaylist();
                        self.linkPlaylist(playlist);
                    } else if (m.Link.TYPE.ALBUM === type) {
                        //
                        // adding album
                        m.Album.fromURI(link, function (album) {
                            console.log("album: ", album);
                            var albumLink = album.data.uri
                              , tracks = album.data.tracks;
                            tracks.forEach(function (uri) {
                                self.currentRoom.addTrackUri(uri.uri);
                            });
                        });
                    }
                }
            });
        });
    }


    // listen to changes in a playlist and automatically add all new tracks added
    this.linkPlaylist = function (playlist) {
        var tracks = before = playlist.data.all();
        playlist.observe(m.EVENT.CHANGE, function (changedPlaylist) {
            console.log("Found changes in playlist");
            var after = changedPlaylist.data.all() // get tracks from playlist
              , newTracks = after.filter(function (track) {
                    return !before.some(function (b) { return b == track }); // only keep the tracks that wasn't there before == added
                 });
            if (newTracks.length) {
                app.user.authenticate(function () {
                    /*
                    newTracks.forEach(function (track) {
                        self.currentRoom.addTrackUri(track);
                    });
                    */
                    self.currentRoom.updatePlaylist();
                });
            }
            before = after; // update the history so we can understand next change
        });
    }

    // when links are dropped to the application we want to add those to the queue
    m.application.observe(m.EVENT.LINKSCHANGED, function () {
        var links = m.application.links;
        console.log("dropped links", links);
        self.handleDroppedLinks(links);
    });

    /* helper functions */
    function getTracksFromPlaylist(playlist) {
        var result = [];
        for (var i = 0; i < playlist.data.length; i++) {
            var track = playlist.data.getTrack(i);
            if (track) {
                result.push(track);
            }
        }
        return result;
    }

    // load images in the room banner
    function fillRoomToplist(room, div){
        $.ajax({
            url: "http://wejay.org/Room/GetOnlineUsers?room=" + encodeURI(room),
            type: "GET",
            processData: false,
            contentType: "application/json",
            dataType: "text",
            success: function (r) {
                var result = r ? JSON.parse(r).Data : [];
                result = result.sort(function (user1, user2) {
                    return user1.CheckedIn-user2.CheckedIn;
                });
                result = result.slice(0, 9);
                $(div).html($("#roomTopListTemplate").tmpl(result));
                $(div).append("<a>" + room + "</a>");
            }
        });
    }

    // Load all rooms to startpage
    this.loadRooms = function () {
        if (!app.user.facebookId) {
            return;
        }
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
                    console.log("loadRooms // app.user.loadFriends()", r);
                    r = r.filter(function (i) { return i.Name && i.Name.toLowerCase() != "null" })
                    $("#rooms").html($("#roomListTemplate").tmpl(r));
                    self.fillRooms();
                }
            });
        });
    }

    this.fillRooms = function(){
        $(".rooms li").each(function(){
            var room = this.innerText;
            fillRoomToplist(room, this);
            $(this).click(function(){
                document.location = "spotify:app:wejay:room:" + room;	
            })
        });
    }

    /* INIT */
    // init function
    this.init = function (version) {
        this.version = version;
        console.log("ready");

        if (app.user.accessToken) {
            this.loadRooms();
        }

        var ac = sp.require("javascript/AutocompleteForm");
        ac.init(".auto-completeForm", topTracks, topArtists);

        //
        // when switching rooms -- the app should not autostart the music ...
        self.isPlayingFromWejay = false;
        $("#start").removeClass("pause");

        var userLogoutShow = function () {
            $("#login").hide();
            $("#roomLogin").hide();
            $("#logout").show();
            $("#roomLogout").show();
        };

        var userLogoutHide = function () {
            $("#login").show();
            $("#roomLogin").show();
            $("#logout").hide();
            $("#roomLogout").hide();
        };

        $("#logout").click(function () {
            self.user.logout();
            userLogoutHide();
        });

        $("#roomLogout").click(function () {
            self.user.logout();
            userLogoutHide();
        });

        $("#roomLogin").click(function () {
            self.user.authenticate(function (room) {
                self.loadRooms();
            });
            userLogoutShow();
        });

        $("#login").click(function () {
            self.user.authenticate(function (room) {
                self.loadRooms();
            });
            userLogoutShow();
        });

        $("#roomSection").bind("drop", function (e) {
            e.preventDefault();
            var id = event.dataTransfer.getData("text");
            console.log("dropped to section ", id);
            self.handleDroppedLinks([id]);
        });

        $("#roomName").bind("focus", function (e) {
            $("form.input").addClass("focus");
        });

        $("#roomName").bind("blur", function (e) {
            $("form.input").removeClass("focus");
        });

        $("#roomSection").bind("dragenter", function (e) {
            e.preventDefault();
            // e.dataTransfer.dropEffect = "copy";
            return true;
        });

        $("#roomSection").bind("dragover", function (e) {
            return false;
        });

        $("#share").bind("click", function (event) {
            event.preventDefault();
            console.log(event.pageX, event.pageY);
            m.application.showSharePopup(document.getElementById("share"), "spotify:app:wejay" /*+ currentRoom.roomName*/);
        });

        $(document).on("click", "#userToplist a", function (e) {
            e.preventDefault();
            var link = $(this).attr("href");
            self.currentRoom.addTrackUri(link);
        });

        //
        // one way to correct the auto-completeForm show/hide-function
        $("body").click(function (e) {
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

        $(document).on("click", "#queue li .star", function () {
            var element = $(this)
              , CurrentClass = element.attr("class").match(/(no)+(\d){1}/)
              , song = element.parent().find(".track").attr("href")
              , SpotifyId = song.split(":")
              , length = SpotifyId.length - 1
              , CurrentClassNumber = parseInt(CurrentClass[2]);

            CurrentClass = CurrentClass[0];
            SpotifyId = SpotifyId[length];

            if ((CurrentClassNumber === 3) || (CurrentClassNumber === 5)) {
                app.currentRoom.liveVote(SpotifyId, element, CurrentClassNumber);
            }
        });


        $("#start").click(function () {
            var element = $(this);
            //
            // If the user presses play -- then wejay should force-play each time the track changes
            if (element.hasClass("pause")) {
                // wejay is playing -- and removes the play-clause
                app.isPlayingFromWejay = false;
                element.removeClass("pause");
            } else {
                // wejay should play.
                app.isPlayingFromWejay = true;
                app.currentRoom.playSong(app.currentRoom.currentSong, true);
                element.addClass("pause");
            }
        });


        userLogoutHide();

        // fill default rooms
        self.fillRooms();

        // This generated a error before. Earlier the localStorage version of facebookUser was "[object Object]".
        // ... In the never version it's a stringified JSON-object.
        var roomName = localStorage.getItem("room")
          , localFacebookUser = localStorage.getItem("facebookUser");
        self.user.facebookUser = (localFacebookUser === "[object Object]") ? "" : JSON.parse(localFacebookUser);

        if (self.user.facebookUser) {
            self.user.userName = self.user.facebookUser.name;
        }

        self.currentRoom = new RoomController(unescape(roomName), nodeUrl);

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
    var formatted = this
      , i = 0
      , arg = arguments.length;
    for (; i < arg; i++) {
        var regexp = new RegExp("\\{' + i + '\\}', 'gi");
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};