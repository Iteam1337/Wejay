var sp = getSpotifyApi(1)
  , ui = sp.require("sp://import/scripts/dnd")
  , m  = sp.require("sp://import/scripts/api/models")
  , v  = sp.require("sp://import/scripts/api/views")
  , accessToken;

function RoomController(roomName, nodeUrl) {
    if ( roomName === "null" || roomName === undefined ) {
        roomName = "iteam";
    }
    console.log( "New RoomController for room " + roomName );
    var facebookId, self = this;
    if ( roomName ) {
        this.roomName = unescape( roomName ).trim().toLowerCase();
    }

    this.currentTab = null;

    this.queue = new m.Playlist();

    this.stop = function () {
        var player = sp.trackPlayer;
        player.setIsPlaying( false );
    }

    this.addTrackUri = function (uri) {
        console.log( "adding track uri: " + uri );
        if ( !uri ) {
            return;
        }
        m.Track.fromURI( uri, function ( track ) {
            self.queueTrack( track );
        });
    }

    this.queueTrack = function ( track ) {
        var song = {
            artist   : track.data.artists[ 0 ].name,
            mbid     : "",
            title    : track.data.name,
            length   : parseInt( track.data.duration / 100 ),
            spotifyId: track.data.uri.replace( "spotify:track:", "" )
        };
        song.room = self.roomName;
        self.hub.queueSong( song );
    }

    this.getTrack = function (searchString, callback, errorCallback) {
        if (!callback) {
            throw "No callback provided";
        }
        var search = new m.Search(searchString);
        search.localResults = m.LOCALSEARCHRESULTS.IGNORE;
        search.pageSize = 1;
        // only tracks
        search.searchTracks = true;
        search.searchAlbums = false;
        search.searchArtists = false;
        search.searchPlaylists = false;
        search.observe(m.EVENT.CHANGE, function () {
            if (!search.tracks || search.tracks.length == 0) {
                callback(null);
            } else {
                callback(search.tracks[0].data);
            }
        });
        // start search
        try {
            search.appendNext();
        } catch (err) {
            errorCallback(err);
        }
    };

    var addLeadingZero = function (number) {
        return (parseInt(number) < 10 ? "0" : "") + parseInt(number);
    }

    this.playSong = function (song, forcePlay) {
        if (!song)
            return;
        if (song.Played) {
            var played = eval(song.Played.replace(/\/Date\(([-\d]+)\)\//gi, "new Date($1)"))
              , diff = new Date().getTime() - played.getTime();
            if (diff < 0) diff = 0;
            song.position = new Date(diff);
        } else {
            song.position = new Date().setTime(0); // start from 0 seconds if no position was set
        }
        if (!song.SpotifyId) {
            this.skip(); // no point in waiting for a song at this point with no id
            return;
        }
        this.currentSong = song;
        var trackUri = "spotify:track:" + song.SpotifyId;
        if (song.position && song.position.getMinutes) {
            trackUri += "#" + addLeadingZero(song.position.getMinutes()) + ":" + addLeadingZero(song.position.getSeconds());
        }
        m.Track.fromURI(trackUri, function (track) {
            var tpl = self.queue;
            
            // search through all songs in the existing playlist and see if the current track is already there
            if (!tpl.data.all().some(function (t) { 
                return t === track.uri;
            })) {
                tpl.add(track);
            }

            var player = sp.trackPlayer
              , currentTrack = player.getNowPlayingTrack();
           
            player.context = tpl;

            console.log("");
            console.log("******************************************************");
            console.log("TrackURI", trackUri);
            console.log("currentTrack", currentTrack);
            //
            // the user controls if the player should force-play every song. This is by pressing the play-icon on the cover.
            if (forcePlay || (currentTrack === null && app.isPlayingFromWejay) || (((currentTrack === null) || (currentTrack.track.uri != track.uri)) && app.isPlayingFromWejay)) {
                m.player.play(trackUri, tpl);
            }

            var curr = track.data.artists[0].name + " - " + track.data.name;
            $("#currentSong").html(curr);
            $("#currentAlbum").attr("src", track.data.album.cover);
            $("#currentLink").attr("href", track.data.uri);
            $(".hidden.title").html(track.data.name);
            if (song.PlayedBy) {
                $("#currentPlayedBy").html("Added by " + song.PlayedBy.UserName);
                $("#currentPlayedBy").show();
            }
            else {
                $("#currentPlayedBy").hide();
            }
            console.log("******************************************************");
        });
    }
    this.clearCurrentSong = function () {
        $("#roomTitle").html(encodeURI(this.roomName) + " Wejay Room");
        $("#currentSong").html("");
        $("#currentSong").html("Nothing playing right now. Drag a track here!");
        $("#currentAlbum").attr("src", "sp://import/img/placeholders/300-album.png");
        $(".hidden.title").html("");
        $("#currentLink").attr("href", "");
        $("#currentPlayedBy").html("");
        $("#queue").html("");
        $("#skip").html("Skip");
        $("#block").html("Block");
        $("#like").html("Like");
        //this.stop();
    }
    this.dispose = function () {
        console.log("dispose", this);
        this.hub.checkout();
        this.hub = null;
        //this = null;
    }
    this.skip = function () {
        var voteFunction = function () {
            $("#skip").html("Skipping...");
            $.ajax({
                url: "http://wejay.org/Room/next",
                data: { room: self.roomName },
                dataType: "json",
                type: "POST",
                traditional: true,
                success: function (result) {
                    $("#skip").html("Skip");
                    console.log("skipped successfully");
                },
                error: function (res) {
                    console.log("skip failed", res);
                    $("#skip").html("Failed");
                    setTimeout(function () {
                        $("#skip").html("Skip");
                    }, 1000);
                }
            });
        };

        if (app.user.accessToken) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }
    }

    this.like = function () {
        if (!this.currentSong) {
            throw "No current song";
        }
        var voteFunction = function () {
            $("#like").html("Liking...");
            $.ajax({
                url: "http://wejay.org/Room/vote",
                data: {
                    mbId: self.currentSong.SpotifyId,
                    value: 5
                },
                dataType: "json",
                type: "POST",
                traditional: true,
                success: function (result) {
                    $("#like").html("Liked");
                    $("#block").html("Block");
                    var name = (app.user.userName) ? app.user.userName : "Anonymous";
                    var obj = { user: name, room: self.roomName, mbId: self.currentSong.SpotifyId, value: 5 };
                    console.log("liked successfully");
                },
                error: function () {
                    $("#like").html("Failed");
                    setTimeout(function () {
                        $("#like").html("Like");
                    }, 1000);
                }
            });
        }

        if (app.user.accessToken) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }
    }

    this.block = function () {
        if ( !this.currentSong ) {
            throw "No current song";
        }
        var voteFunction = function () {
            $("#block").html("Blocking...");
            $.ajax({
                url: "http://wejay.org/Room/vote",
                data: {
                    mbId: self.currentSong.SpotifyId,
                    value: 1
                },
                dataType: "json",
                type: "POST",
                traditional: true,
                success: function (result) {
                    $("#block").html("Blocked");
                    $("#like").html("Like");
                    console.log("Blocked successfully");
                },
                error: function () {
                    $("#block").html("Failed");
                    setTimeout(function () {
                        $("#block").html("Block");
                    }, 1000);
                }
            });
        };

        if (app.user.accessToken) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }

    }

    this.liveVote = function (SpotifyId, element, number) {
        if (!SpotifyId || !element || !number) {
            throw "No song selected";
        }
        var vote = null;
        if (number === 3) {
            vote = 5;
        } else if (number === 5) {
            vote = 3;
        } else {
            throw "This is not allowed";
        }
        var voteFunction = function () {
            $.ajax({
                url: "http://wejay.org/Room/vote",
                data: {
                    mbId: SpotifyId,
                    value: vote
                },
                dataType: "json",
                type: "POST",
                tradition: true,
                success: function (result) {
                    var newClass = (number === 5) ? "no3" : "no5";
                    element.removeClass("no" + number).addClass(newClass);
                },
                error: function (msg) {
                    console.log(msg);
                }
            });
        }

        if (app.user.accessToken) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }
    }

    this.init = function (roomName, anonymous) {
        if ( roomName === "null" || roomName === undefined ) {
            roomName = "iteam";
        }
        console.log("init");
        if (!roomName) {
            console.log("Room name must be specified")
            throw "Room name must be specified"
        }
        this.roomName = unescape(roomName).trim().toLowerCase();
        this.clearCurrentSong();
        $("#roomLink").val("http://wejay.org/" + encodeURI(this.roomName));
        $("#roomLink").bind("click", function () { this.select(); });
        $("#shareFacebook").attr("href", "http://www.facebook.com/sharer.php?u={0}&t={1}".format($("#roomLink").val(), this.roomName.toUpperCase() + " WEJAY ROOM on Spotify. Join this room and control the music together. We are the DJ."));
        localStorage.setItem("room", this.roomName);
        if (!anonymous && !app.user.accessToken) {
            app.user.authenticate(function () {
                this.hub.checkin({ user: app.user.userName, room: this.roomName });
                self.updateUsers();
                self.updatePlaylist();
            });
        } else {
            var name = (app.user.userName) ? app.user.userName : "Anonymous";
            this.hub.checkin({ user: name, room: this.roomName });
            self.updateUsers();
            self.updatePlaylist();
        }
        // fill the top tracks for this user
        self.loadTopTracks(function (userTopTracks) {
            topTracks = userTopTracks;
        });
    }

    this.loadTopTracks = function (callback) {
        var userName = null; // null means current user
        sp.social.getToplist("track", "user", userName, {
            onSuccess: function (r) {
                var topTracks = r.tracks;
                console.log("topTracks Loaded");
                if (callback) {
                    callback(topTracks);
                }
            }
        });
    }

    // checkin the current user to wejay
    this.checkin = function (force, callback) {
        if (!app.user.facebookId)
            throw "You have not set room and user or facebook details yet";
        var self = this,
            userObject = { userName: app.user.userName, facebookId: app.user.facebookId, room: self.roomName };
        $.ajax({
            url: "http://wejay.org/Room/checkin",
            data: userObject,
            dataType: "json",
            type: "POST",
            traditional: true,
            success: function (result) {
                self.lastCheckin = new Date();
                //self.init(result.room); // save the last connected room for this user
                if (callback) {
                    callback(self.roomName);
                }
                console.log(app.user.userName + " logged in to wejay room ", self.roomName);
                //self.hub.checkin({ user: user, room: self.roomName });
            }
        });
    }

    // Update playlist ul
    this.updatePlaylist = function () {
        console.log("updating queue...");
        $.ajax({
            url: "http://wejay.org/Room/Playlist?room=" + self.roomName,
            type: "GET",
            processData: false,
            contentType: "application/json",
            dataType: "text",
            error: function (e) {
                console.log("Error updating queue", e);
            },
            success: function (r) {
                var result = r ? JSON.parse(r).Playlist : [];
                //  , playlistUri = localStorage.getItem("playlistUri")
                //  , pl = new m.Playlist();
                result = result.filter(function (song) { return song.SpotifyId; });
                if (result.length > 0) {
                    $("#queue").html($("#queueTemplate").tmpl(result));
                }
                else {
                    $("#queue").html("<span class=\"nothing playing\">Nothing in the playlist right now. Add songs either by searching or draggin an album, track or playlist to this app.</span>");
                    if ($("#currentSong").html() === "") { $("#currentSong").html("Drag tracks here to start the room"); }
                }
            }
        });
    }

    // Update users online list
    this.updateUsers = function () {
        $.ajax({
            url: "http://wejay.org/Room/GetOnlineUsers?room=" + self.roomName,
            type: "GET",
            processData: false,
            contentType: "application/json",
            dataType: "text",
            success: function (r) {
                var result = r ? JSON.parse(r).Data : [];
                result = result.filter(function (user) { return user.FacebookId && user.FacebookId != "null"; });
                var loggedInUsersInnerText = "NO LOGGED IN WEJAYS";
                if (result.length > 0) {
                    var onlineUsers = 0;
                    for (var i in result) {
                        var newDate = parseInt(result[i].CheckedIn.replace(/\/Date\(/, "").replace(/\/\)/, ""));
                        result[i].CheckedIn = "Logged in since " + moment(new Date(newDate)).format("HH:mm MM/DD");
                        if (result[i].Online !== false) onlineUsers++;
                    }
                    $("#users").html($("#usersTemplate").tmpl(result));
                    if (onlineUsers !== 0) {
                        loggedInUsersInnerText = "LOGGED IN WEJAYS (" + onlineUsers + ")";
                    }
                } else {
                    $("#users").html("<li class=\"noOneIsLoggedIn\">When you log into this room your best mysic will be mixed into the playlist automatically. You can also invite your friends below.</li>");
                }
                $(".logged.in h2").html(loggedInUsersInnerText);
            }
        });
    }

    this.hub = new Hub(nodeUrl, self, facebookId);

    if (this.roomName) {
        this.init(roomName, true); // default is anonymous
    }

}