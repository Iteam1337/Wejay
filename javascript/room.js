var sp = getSpotifyApi(1),
    ui = sp.require("sp://import/scripts/dnd"),
    m = sp.require("sp://import/scripts/api/models"),
    v = sp.require("sp://import/scripts/api/views"),
    accessToken;

function RoomController(roomName, nodeUrl) {
    if (roomName === "null" || roomName === undefined) {
        roomName = "example";
    }
    if (!/^([a-z0-9\_\-\ ]){2,10}$/i.exec(roomName)) {
        return;
    }
    var facebookId, self = this;
    this.roomName = roomName.toLowerCase();

    console.log("New RoomController for room " + roomName);

    this.currentTab = null;

    this.serverTime = null;

    this.stop = function () {
        var player = sp.trackPlayer;
        player.setIsPlaying(false);
    };

    this.addTrackUri = function (uri) {
        if (!uri) {
            return;
        }
        m.Track.fromURI(uri, function (track) {
            self.queueTrack(track);
        });
    };

    this.updateUsersInterval = null;
    this.roomUpdateInterval = null;

    this.queueTrack = function (track) {
        var song = {
            artist: track.data.artists[0].name,
            mbid: "",
            title: track.data.name,
            length: parseInt(track.data.duration / 1000),
            spotifyId: track.data.uri.replace("spotify:track:", "")
        };
        song.room = self.roomName;
        var existsInQueue = $("#queue li a.track").filter(function (int, element) { return (element.href.split(":")[2] === song.spotifyId) }).length > 0;

        if (!existsInQueue) {
            self.hub.queueSong(song);
        } else {
            // TODO: felhantering.
            // Här ska ett meddelande dyka upp till användaren om att låten
            // redan existerar i listan.
            var existingSong = "\"" + song.artist + " - " + song.title + "\" is already in the playlist, let's skip this.";
            NOTIFIER.show(existingSong);
        }
    };

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
            if (!search.tracks || search.tracks.length === 0) {
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
        return ((parseInt(number) < 10) ? "0" : "") + parseInt(number);
    };

    this.forceCheckCurrentSong = function () {
        self.hub.checkCurrentSong(self.roomName, function (error, song) {
            if (error || song === null) {
                self.clearCurrentSong(true);
            }
        });
    };

    this.playSong = function (song, forcePlay) {
        if (!song) return;
        $("#voteOverlay").removeClass("show");
        $("#currentHolder .hover").show();
        if (song.Played) {
            var played = eval(song.Played.replace(/\/Date\(([-\d]+)\)\//gi, "new Date( $1 )")),
                diff = (new Date().getTime() - app.timeDiff) - played.getTime()
            if (diff < 0) { diff = 0; }
            song.position = new Date(diff);
        } else {
            song.position = new Date().setTime(0); // start from 0 seconds if no position was set
        }
        if (!song.SpotifyId) {
            this.skip(true); // no point in waiting for a song at this point with no id
            return;
        }
        self.currentSong = song;
        var trackUri = "spotify:track:" + song.SpotifyId;
        if (song.position && song.position.getMinutes) trackUri += "#" + addLeadingZero(song.position.getMinutes()) + ":" + addLeadingZero(song.position.getSeconds());
        m.Track.fromURI(trackUri, function (track) {
            var tpl = new m.Playlist();

            // search through all songs in the existing playlist and see if the current track is already there
            if (!tpl.data.all().some(function (t) {
                return t === track.uri;
            })) {
                tpl.add(track);
            }

            var player = sp.trackPlayer,
                currentTrack = player.getNowPlayingTrack();

            player.context = tpl;

            //
            // the user controls if the player should force-play every song. This is by pressing the play-icon on the cover.
            if (forcePlay || (currentTrack === null && app.isPlayingFromWejay) || (((currentTrack === null) || (currentTrack.track.uri != track.uri)) && app.isPlayingFromWejay)) {
                sp.trackPlayer.setContextCanSkipPrev(tpl.uri, false);
                sp.trackPlayer.setContextCanSkipNext(tpl.uri, false);
                sp.trackPlayer.setContextCanShuffle(tpl.uri, false);
                sp.trackPlayer.setContextCanRepeat(tpl.uri, false);
                sp.trackPlayer.setRepeat(false);
                sp.trackPlayer.setShuffle(false);
                m.player.play(trackUri, tpl);
            }
            $("#currentArtist").html('<a href="' + track.data.artists[0].uri + '">' + track.data.artists[0].name + '</a>');
            $("#currentArtist").append(' - ');
            $("#currentTrack").html('<a href="' + track.data.uri + '">' + track.data.name + '</a>');
            $("#currentAlbum").attr("src", track.data.album.cover);
            $("#currentLink").attr("href", track.data.album.uri);
            $(".hidden.title").html(track.data.name);
            if (song.PlayedBy) {
                $("#currentPlayedBy").html("Added by " + unescape(song.PlayedBy.UserName));
                $("#currentPlayedBy").show();
            }
            else {
                $("#currentPlayedBy").hide();
            }
        });
    };

    this.nothingPlayingCopy = $("#nothingPlayingTemplate").tmpl();

    this.clearCurrentSong = function (force) {
        $("#roomTitle").html(this.roomName + " Wejay Room");

        $("#currentArtist").html("Nothing playing right now. Drag a track here!");
        $("#currentTrack").html("");
        $("#currentHolder .hover").hide();
        $("#currentAlbum").attr("src", "sp://import/img/placeholders/300-album.png");
        $(".hidden.title").html("");
        $("#currentLink").attr("href", "");
        $("#currentPlayedBy").html("");
        $("#skip").html("Skip");
        $("#block").html("Block");
        $("#like").removeClass("liking liked failed");
        if (force || $("#queue li").length < 2 && $("#queue").html() !== this.nothingPlayingCopy) {
            $("#currentQueueNumber").text("CURRENT QUEUE");
            $("#queue").html(this.nothingPlayingCopy);
        }
    };
    this.dispose = function () {
        this.hub.checkout();
        this.hub = null;
    };
    this.skip = function (noNotification) {
        var thisSong = app.currentRoom.currentSong;
        var voteFunction = function () {
            if (!noNotification) {
                $("#skip").html("Skipping...");
            }
            $.ajax({
                url: "http://wejay.org/Room/next",
                data: { room: self.roomName },
                dataType: "json",
                type: "POST",
                traditional: true,
                success: function (result) {
                    $("#skip").html("Skip");
                    self.hub.songSkipped(thisSong);
                    $("#voteOverlay").removeClass("show");
                },
                error: function (res) {
                    window.NOTIFIER.show("skip failed");
                    console.log("skip failed", res);
                    $("#skip").html("Skip Failed");
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
    };

    this.shareURL = "";
    this.currentSong = {};

    this.like = function () {
        if (!self.currentSong) {
            throw "No current song";
        }
        var voteFunction = function () {
            if ($("#like").hasClass("liking")) {
                return;
            }
            $("#like").addClass("liking");
            console.log("liking song", self.currentSong.Title);
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
                    $("#like").removeClass("liking")
                    $("#like").addClass("liked");
                    var name = (app.user.userName) ? app.user.userName : "Anonymous",
                        obj = { user: name, room: self.roomName, mbId: self.currentSong.SpotifyId, value: 5 };
                },
                error: function () {
                    window.NOTIFIER.show("like failed");
                    $("#like").removeClass("liking")
                    $("#like").addClass("failed");
                    setTimeout(function () {
                        $("#like").removeClass("failed");
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
    };

    this.block = function () {
        if (!this.currentSong) {
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
                    self.skip(true);
                    $("#block").html("Blocked");
                    $("#like").html("Like");
                    console.log("Blocked successfully");
                },
                error: function () {
                    window.NOTIFIER.show("block failed");
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

    };

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
                    window.NOTIFIER.show("vote failed");
                    console.log("vote failed", msg);
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
    };


    this.init = function (roomName, anonymous) {
        if (roomName !== "example") {
            if (roomName === "null" || roomName === undefined) {
                roomName = "null";
            }
            console.log("init", roomName);
            if (!roomName) {
                console.log("Room name must be specified")
                throw "Room name must be specified"
            }
            this.roomName = roomName.toLowerCase();
            this.clearCurrentSong(true);
            var local = this;
            this.getBitlyKey(local.roomName, function (shareURL) {
                local.shareURL = shareURL;
                $("#sharePopup").removeClass("show");
                $("#shareOnURL").text("Share URL");
                $("#manualShare").addClass("hide");
                var userString = (app.user.userName) ? "%0D%0A" + app.user.userName : "%0D%0A",
                mailString = "mailto:?subject=Join our WEJAY room&body=Hi, if you follow the link below you can add music to our WEJAY room \"" + local.roomName + "\" from Spotify.%0D%0A%0D%0A" + shareURL + userString + "%0D%0A%0D%0A%0D%0A%0D%0AWEJAY lets you and your colleagues add music to mixed democratic playlist which means you can all listen to your own favorite music while working. Recent research results shows that you work better when you get to listen to music.\%0D%0ARead more about WEJAY and the research on http://wejay.org";
                $("#shareURL").val(shareURL);
                $("#shareOnMail").attr("href", mailString);
                $("#shareOnFacebook").attr("href", "http://facebook.com/sharer.php?s=100&p[url]=" + shareURL + "&p[title]=" + escape("Play music with me on WEJAY") + "&p[images][0]=" + escape("http://wejay.org/Content/Images/Wejay256transparent.png") + "&p[summary]=" + escape("WEJAY is a Spotify app for playing music together at work. I've created the room " + local.roomName + ", join me there!"));
                localStorage.setItem("room", local.roomName);
                if (!anonymous && !app.user.accessToken) {
                    app.user.authenticate(function () {
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

                //
                // Update the userlist on interval
                if (self.updateUsersInterval !== null) {
                    clearInterval(self.updateUsersInterval);
                }
                self.updateUsersInterval = setInterval(function () {
                    self.updateUsers();
                }, ((60 * 1000) * 2));

                //
                // RoomUpdateInterval
                if (self.roomUpdateInterval !== null) {
                    clearInterval(self.roomUpdateInterval);
                }
                self.roomUpdateInterval = setInterval(function () {
                    self.updatePlaylist();
                    self.forceCheckCurrentSong();
                }, ((60 * 1000) * 10));
            });
        }
    };

    this.loadTopTracks = function (callback) {
        var userName = null; // null means current user
        sp.social.getToplist("track", "user", userName, {
            onSuccess: function (r) {
                var topTracks = r.tracks;
                if (callback) {
                    callback(topTracks);
                }
            }
        });
    };

    this.logoutUser = function () {
        self.hub.userLogout();
    };

    this.getBitlyKey = function (url, callback) {
        var longurl = "http://open.spotify.com/app/wejay/room/" + url;
        $.getJSON(
          "http://api.bitly.com/v3/shorten?callback=?",
          {
              "format": "json",
              "apiKey": app.bitlyKey,
              "login": app.bitlyName,
              "longUrl": longurl
          },
          function (response) {
              if (response.status_code === 200) {
                  callback(response.data.url);
              } else {
                  callback(longurl);
              }
          }
        );
    };

    // checkin the current user to wejay
    this.checkin = function (force, callback) {
        if (!app.user.facebookId) {
            throw "You have not set room and user or facebook details yet";
        }
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
                app.userLogoutShow();
                //self.hub.checkin({ user: app.user.userName, room: self.roomName });
                //console.log(app.user.userName + " logged in to wejay room ", self.roomName);
            }
        });
    }

    // Update playlist ul
    this.updatePlaylist = function () {
        var url = "http://wejay.org/Room/Playlist?room=" + self.roomName;
        $.ajax({
            url: url,
            type: "GET",
            processData: false,
            contentType: "application/json; charset=utf-8",
            dataType: "text json",
            error: function (e) {
                window.NOTIFIER.show("error updating queue");
                console.log("___ - Error updating queue", e);
            },
            success: function (r) {
                var result = r ? r.Playlist.filter(function (song) { return song.SpotifyId; }) : [];
                if (result.length > 0) {
                    // slice the array to limit the playlist to 15 songs.
                    $("#currentQueueNumber").text("Current queue (" + result.length + ")");
                    //var newHtml = $("#queueTemplate").tmpl(result.slice(0, 15));
                    var newHtml = $("#queueTemplate").tmpl(result);
                    if ($("#queue").text() !== newHtml.text()) {
                        var render = $("<ul/>", { id: "queue", html: newHtml });
                        $("#queue").replaceWith(render);
                        return false;
                    } else {
                        return false;
                    }
                } else {
                    var newHtml = this.nothingPlayingCopy;
                    $("#queue").html(newHtml);
                    $("#currentQueueNumber").text("Current queue");
                    if ($("#currentSong").html() === "") {
                        $("#currentHolder .hover").hide();
                        $("#currentSong").html("Drag tracks here to start the room");
                    }
                    return false;
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
                var loggedIn = false,
                    result = r ? JSON.parse(r).Data : [],
                    loggedInUsersTitle = "NO LOGGED IN WEJAYS",
                    loggedInUsersInnerText = $("#noOneIsLoggedInTemplate").tmpl()
                result = result.filter(function (user) { return user.FacebookId && user.FacebookId != "null" && user.Online; });

                if (result.length > 0 && app.user.facebookUser) {
                    result = result.map(function (user) {
                        var newDate = moment(user.CheckedIn).valueOf(),
                            momentDiff = new Date(moment(newDate).add("hours", 1).diff(new Date())),
                            hour = momentDiff.getHours(),
                            timeleft = momentDiff.getMinutes(),
                            newCheckedIn = (hour > 1 || timeleft > 55) ? "Just logged in" : (timeleft < 2 ? "Will logout any second now" : "Logged in for " + timeleft + " minutes");
                        if (user.FacebookId === app.user.facebookUser.id) loggedIn = true;
                        var returnTimeLeft = hour > 1 ? 100 : timeleft;
                        return { UserName: unescape(user.UserName), FacebookId: user.FacebookId, CheckedIn: newCheckedIn, timeleft: returnTimeLeft };
                    }).sort(function (a, b) {
                        return b.timeleft - a.timeleft;
                    });
                    loggedInUsersTitle = "LOGGED IN WEJAYS (" + result.length + ")";
                    loggedInUsersInnerText = $("#usersTemplate").tmpl(result.slice(0, 10));
                }
                if (!loggedIn && self.roomName === app.loggedIntoRoom) {
                    app.userLogoutHide();
                    app.loggedIntoRoom = "";
                }
                $(".logged.in h2").html(loggedInUsersTitle);
                $("#users").html(loggedInUsersInnerText);
            }
        });
    };

    this.hub = new Hub(nodeUrl, self, facebookId);

    if (this.roomName) {
        this.init(roomName, true); // default is anonymous
    }

}