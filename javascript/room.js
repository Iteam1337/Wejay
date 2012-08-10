var sp = getSpotifyApi(1)
  , ui = sp.require("sp://import/scripts/dnd")
  , m  = sp.require("sp://import/scripts/api/models")
  , v  = sp.require("sp://import/scripts/api/views")
  , accessToken;

function RoomController(roomName, nodeUrl) {
    if ( roomName === "null" || roomName === undefined ) {
        roomName = "iteam";
    }
    if ( !/^([a-z0-9\_\-\ ]){3,15}$/i.exec( roomName ) ) {
      return;
    }
    var facebookId, self = this;
    this.roomName = roomName.toLowerCase();

    console.log( "New RoomController for room " + roomName );

    this.currentTab = null;

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
            length   : parseInt( track.data.duration / 1000 ),
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
            //this.skip(); // no point in waiting for a song at this point with no id
            return;
        }
        self.currentSong = song;
        var trackUri = "spotify:track:" + song.SpotifyId;
        if (song.position && song.position.getMinutes) {
            trackUri += "#" + addLeadingZero(song.position.getMinutes()) + ":" + addLeadingZero(song.position.getSeconds());
        }
        m.Track.fromURI(trackUri, function (track) {
            var tpl = new m.Playlist();

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
        $("#roomTitle").html(this.roomName + " Wejay Room");
        $("#currentSong").html("");
        $("#currentSong").html("Nothing playing right now. Drag a track here!");
        $("#currentAlbum").attr("src", "sp://import/img/placeholders/300-album.png");
        $(".hidden.title").html("");
        $("#currentLink").attr("href", "");
        $("#currentPlayedBy").html("");
        $("#queue").html( "<div class=\"nothing playing\"><p><strong>Hello!</strong>This room needs music! Add songs by searching or by dragging tracks or whole playlists to the WEJAY app in the sidebar. Don't forget to invite you colleagues - WEJAY was made to play music together!</p></div>" );
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

    this.shareURL = "";
    this.currentSong = {};

    this.like = function () {
        if (!self.currentSong) {
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
        this.roomName = roomName.toLowerCase();
        this.clearCurrentSong();
        var local = this;
        this.getBitlyKey( local.roomName, function ( shareURL ) {
          local.shareURL = shareURL;
          $( "#sharePopup" ).removeClass( "show" );
          $( "#shareOnURL" ).text( "Share URL" );
          $( "#manualShare" ).addClass( "hide" );
          var userString = ( app.user.userName ) ? "\u2029\u2029" + app.user.userName : "\u2029\u2029";
          var mailString = "mailto:?subject=Join our WEJAY room&body=Hi, if you follow the link below you can add music to our WEJAY room \"" + local.roomName + "\" from Spotify.\u2029\u2029" + shareURL + userString + "\u2029\u2029------------------------------------------------------\u2029\u2029WEJAY lets you and your colleagues add music to mixed democratic playlist which means you can all listen to your own favorite music while working. Recent research results shows that you work better when you get to listen to music.\u2029\u2029Read more about WEJAY and the research on http://wejay.org";
          $( "#shareURL" ).val( shareURL );
          $( "#shareOnMail" ).attr( "href", mailString );
          $( "#shareOnFacebook" ).attr( "href", "http://facebook.com/sharer.php?u=" + shareURL );
          localStorage.setItem("room", local.roomName);
          if (!anonymous && !app.user.accessToken) {
              app.user.authenticate( function () {
                  local.hub.checkin({ user: app.user.userName, room: local.roomName });
                  self.updateUsers();
                  self.updatePlaylist();
              });
          } else {
              var name = (app.user.userName) ? app.user.userName : "Anonymous";
              local.hub.checkin({ user: name, room: local.roomName });
              self.updateUsers();
              self.updatePlaylist();
          }
          // fill the top tracks for this user
          self.loadTopTracks(function (userTopTracks) {
              topTracks = userTopTracks;
          });
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

    this.logoutUser = function () {
        self.hub.userLogout();
    }

    this.getBitlyKey = function ( url, callback ) {
      var longurl = "http://open.spotify.com/app/wejay/room/" + url;
      $.getJSON(
          "http://api.bitly.com/v3/shorten?callback=?",
          {
            "format": "json",
            "apiKey": app.bitlyKey,
            "login": app.bitlyName,
            "longUrl": longurl
          },
          function ( response ) {
            console.log( "bitly", response );
            if ( response.status_code === 200 ) {
              callback( response.data.url );
            } else {
              callback( longurl );
            }
          }
        );
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
                } else {
                    $("#queue").html( "<div class=\"nothing playing\"><p><strong>Hello!</strong>This room needs music! Add songs by searching or by dragging tracks or whole playlists to the WEJAY app in the sidebar. Don't forget to invite you colleagues - WEJAY was made to play music together!</p></div>" );
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
                    $("#users").html("<li class=\"noOneIsLoggedIn\">When you log into this room your best mysic will be mixed into the playlist automatically. You can also invite your colleagues below.</li>");
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