var sp, ui, m, v, accessToken;

sp = getSpotifyApi(1);
ui = sp.require("sp://import/scripts/dnd");
m = sp.require("sp://import/scripts/api/models");
v = sp.require("sp://import/scripts/api/views");

function RoomController(roomName, nodeUrl) {
    function addLeadingZero(number) {
        return ((parseInt(number,10) < 10) ? "0" : "") + parseInt(number, 10);
    }

    function voteFunction(noNotification, player) {
        var thisSong;
        if (player && self.skipping) {
            return false;
        }
        self.skipping = true;
        thisSong = app.currentRoom.currentSong;
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
                self.skipping = false;
            },
            error: function (res) {
                NOTIFIER.show("skip failed ", res);
                $("#skip").html("Skip Failed");
                setTimeout(function () {
                    $("#skip").html("Skip");
                    self.skipping = false;
                }, 1000);
            }
        });
    }

    var facebookId, self, updateTimeout;

    self = this;
    updateTimeout = null;

    if (roomName === "null" || roomName === undefined) {
        roomName = "example";
    }
    if (!/^([a-z0-9\_\-\ ]){2,10}$/i.exec(roomName)) {
        return;
    }

    this.lastCheckin = new Date(null);
    this.maxSongLength = 10;

    this.skipping = false;

    this.roomName = roomName.toLowerCase();

    console.log("New RoomController for room " + roomName);

    this.currentTab = null;

    this.serverTime = null;
    this.lastPlayed = null;

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
        var song, existsInQueue;
        song = {
            artist: track.data.artists[0].name,
            mbid: "",
            title: track.data.name,
            length: parseInt(track.data.duration / 1000, 10),
            spotifyId: track.data.uri.replace("spotify:track:", "")
        };
        song.room = self.roomName;
        existsInQueue = $("#queue li a.track").filter(function (int, element) { return (element.href.split(":")[2] === song.spotifyId); }).length > 0;

        if (!!existsInQueue) {
            // The song is in the playlist already
            return NOTIFIER.show("\"" + song.artist + " - " + song.title + "\" is already in the playlist, let's skip this.");
        } else if ((song.length / 60) >= self.maxSongLength) {
            // The song is 10 minutes or longer
            return NOTIFIER.show("\"" + song.artist + " - " + song.title + "\" exeeds the " + self.maxSongLength + " minute limitation.");
        } else {
            self.hub.queueSong(song);
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

    this.forceCheckCurrentSong = function () {
        self.hub.checkCurrentSong(self.roomName, function (error, song) {
            if (error || song === null) {
                self.clearCurrentSong(true);
            }
        });
    };

    this.playSong = function (song, forcePlay) {
        var trackUri, played, diff, songPlayed, oneHour, zeroTime, timeout;
        if (!song || !song.Length || !song.Length.TotalMinutes) return;
        // if its longer than 10 minutes, let's just skip it
        if (song.Length.TotalMinutes >= self.maxSongLength) {
            return voteFunction(true, true);
        }
        $("#voteOverlay").removeClass("show");
        $("#currentHolder .hover").show();

        oneHour = +(60*60*1000);

        if (song.Played) {
            played = eval(song.Played.replace(/\/Date\(([-\d]+)\)\//gi, "new Date( $1 )"));
            diff = (new Date().getTime() - app.timeDiff) - played.getTime();

            if (diff < 0) {
                diff = 0;
            }
            song.position = new Date(diff);
            song.position = new Date(song.position.getTime() - (2*oneHour));
        } else {
            song.position = new Date().setTime(0); // start from 0 seconds if no position was set
        }

        if (!song.SpotifyId) {
            this.skip(true); // no point in waiting for a song at this point with no id
            return;
        }

        self.currentSong = song;
        trackUri = "spotify:track:" + song.SpotifyId;
        if (song.position && song.position.getMinutes) {
            trackUri += "#" + addLeadingZero(song.position.getMinutes()) + ":" + addLeadingZero(song.position.getSeconds());
        }

        songPlayed = new Date(song.Length.TotalMilliseconds);
        zeroTime = new Date(0);

        if (song.position > songPlayed) { // the position is after the song has ended.
            console.log("stopped", songPlayed, song.position);
            return;
        } else if (song.position < zeroTime) { // the song has not even begun.
            timeout = new Date(Math.abs(zeroTime - song.position)).getTime();
            setTimeout(function() {
                self.playSong(song, forcePlay);
            }, timeout);
            return;
        }

        return m.Track.fromURI(trackUri, function (track) {
            var tpl, player, currentTrack, position, currentTrackHasNotSameUriOrIsBeforeCurrentTime;
            tpl = new m.Playlist();

            // search through all songs in the existing playlist and see if the current track is already there
            if (!tpl.data.all().some(function (t) {
                return t === track.uri;
            })) {
                tpl.add(track);
            }

            player = sp.trackPlayer;
            currentTrack = player.getNowPlayingTrack();
            position = new Date(song.position).getTime();
            currentTrackHasNotSameUriOrIsBeforeCurrentTime = true;

            if (!!currentTrack && !!currentTrack.hasOwnProperty("track") && currentTrack.track.uri === track.uri) {
                currentTrackHasNotSameUriOrIsBeforeCurrentTime = (position < currentTrack.position);
            }

            player.context = tpl;

            //
            // the user controls if the player should force-play every song. This is by pressing the play-icon on the cover.
            if (forcePlay || (currentTrack === null && app.isPlayingFromWejay) || (((currentTrack === null) || !!currentTrackHasNotSameUriOrIsBeforeCurrentTime) && app.isPlayingFromWejay)) {
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

    this.clear = function() {
        app.isPlayingFromWejay = false;
    };

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
        if (!!app.user.accessToken || new Date() < app.user.checkTokenNext) {
            voteFunction(noNotification);
        } else {
            app.user.authenticate(function () {
                voteFunction(noNotification);
            });
        }
    };

    this.shareURL = "";
    this.currentSong = {};

    this.like = function () {
        if (!self.currentSong) {
            throw "No current song";
        }
        function voteFunction() {
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
                    var name, obj;
                    self.hub.checkCurrentSong(app.currentRoom.roomName, function (error, song) {
                        var currentVote;
                        currentVote = (Math.round((37 + song.Vote - 3) * 10) / 10).toFixed(1);
                        $('#likeAverage').html(currentVote + '&deg;');
                    });
                    $("#like").removeClass("liking");
                    $("#like").addClass("liked");
                    name = (app.user.userName) ? app.user.userName : "Anonymous";
                    obj = { user: name, room: self.roomName, mbId: self.currentSong.SpotifyId, value: 5 };

                    console.log('liked', obj);
                },
                error: function () {
                    NOTIFIER.show("Could not like song");
                    $("#like").removeClass("liking");
                    $("#like").addClass("failed");
                    setTimeout(function () {
                        $("#like").removeClass("failed");
                    }, 1000);
                }
            });
        }

        if (!!app.user.accessToken || new Date() < app.user.checkTokenNext) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }
    };

    this.block = function () {
        function voteFunction () {
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
                    NOTIFIER.show("block failed");
                    $("#block").html("Failed");
                    setTimeout(function () {
                        $("#block").html("Block");
                    }, 1000);
                }
            });
        }
        if (!this.currentSong) {
            throw "No current song";
        }

        if (!!app.user.accessToken || new Date() < app.user.checkTokenNext) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }

    };

    this.silentBlock = function () {
        function voteFunction () {
            $("#silentBlock").html("Blocking...");
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
                    $("#silentBlock").html("Silent Block");
                    console.log("Blocked successfully");
                },
                error: function () {
                    NOTIFIER.show("block failed");
                    $("#silentBlock").html("Failed");
                    setTimeout(function () {
                        $("#silentBlock").html("Silent Block");
                    }, 1000);
                }
            });
        }

        if (!this.currentSong) {
            throw "No current song";
        }

        if (!!app.user.accessToken || new Date() < app.user.checkTokenNext) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }

    };

    this.liveVote = function (SpotifyId, element, number) {
        var vote;
        if (!SpotifyId || !element || !number) {
            throw "No song selected";
        }
        if (number === 3) {
            vote = 5;
        } else if (number === 5) {
            vote = 3;
        } else {
            throw "This is not allowed";
        }
        function voteFunction() {
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
                    var newClass;

                    newClass = (number === 5) ? "no3" : "no5";
                    element.removeClass("no" + number).addClass(newClass);
                },
                error: function (msg) {
                    NOTIFIER.show("vote failed ", msg);
                }
            });
        }

        if (!!app.user.accessToken || new Date() < app.user.checkTokenNext) {
            voteFunction();
        } else {
            app.user.authenticate(function () {
                voteFunction();
            });
        }
    };

    this.init = function (roomName, anonymous) {
        var local;
        if (roomName === "example") {
            return;
        }
        if (roomName === "null" || roomName === undefined) {
            roomName = "null";
        }
        if (!roomName) {
            NOTIFIER.show(msg);
            throw msg;
        }

        local = this;

        this.roomName = roomName.toLowerCase();
        this.clearCurrentSong(true);
        this.getBitlyKey(local.roomName, function (shareURL) {
            var userString, mailString, name;
            local.shareURL = shareURL;
            $("#sharePopup").removeClass("show");
            $("#shareOnURL").text("Share URL");
            $("#manualShare").addClass("hide");
            userString = (app.user.facebookUser.name) ? "%0D%0A" + app.user.facebookUser.name : "%0D%0A";
            mailString = "mailto:?subject=Join our WEJAY room&body=Hi, if you follow the link below you can add music to our WEJAY room \"" + local.roomName + "\" from Spotify.%0D%0A%0D%0A" + shareURL + userString + "%0D%0A%0D%0A%0D%0A%0D%0AWEJAY lets you and your coworkers add music to mixed democratic playlist which means you can all listen to your own favorite music while working. Recent research results shows that you work better when you get to listen to music.%0D%0ARead more about WEJAY and the research on http://wejay.org";
            $("#shareURL").val(shareURL);
            $("#shareOnMail").attr("href", mailString);
            $("#shareOnFacebook").attr("href", "http://facebook.com/sharer.php?s=100&p[url]=" + shareURL + "&p[title]=" + escape("Play music with me on WEJAY") + "&p[images][0]=" + escape("http://wejay.org/Content/Images/Wejay256transparent.png") + "&p[summary]=" + escape("WEJAY is a Spotify app for playing music together at work. I've created the room " + local.roomName + ", join me there!"));
            localStorage.setItem("room", local.roomName);

            if (!anonymous && !app.user.accessToken) {
                app.user.authenticate(function () {
                    local.hub.checkin({
                        user: app.user.facebookUser.name,
                        room: local.roomName
                    });
                    self.updateUsers();
                    self.updatePlaylist();
                });
            } else {
                name = (app.user.facebookUser.name) ? app.user.facebookUser.name : "Anonymous";
                local.hub.checkin({
                    user: name,
                    room: local.roomName
                });
                self.updateUsers();
                self.updatePlaylist();
            }

            app.user.authenticate();

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
    };

    this.loadTopTracks = function (callback) {
        var userName;
        userName = null; // null means current user
        sp.social.getToplist("track", "user", userName, {
            onSuccess: function (r) {
                var topTracks;
                topTracks = r.tracks;
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
        var longurl;
        longurl = "http://open.spotify.com/app/wejay/room/" + url;
        $.getJSON("http://api.bitly.com/v3/shorten?callback=?", {
            "format": "json",
            "apiKey": app.bitlyKey,
            "login": app.bitlyName,
            "longUrl": longurl
        }, function (response) {
            if (response.status_code === 200) {
                callback(response.data.url);
            } else {
                callback(longurl);
            }
        });
    };

    // checkin the current user to wejay
    this.checkin = function (force, callback) {
        var msg, self, userObject;
        if (!app.user.facebookId) {
            msg = "You have not set room and user or facebook details yet";
            NOTIFIER.show(msg);
            throw msg;
        }
        self = this;
        userObject = {
            userName: app.user.facebookUser.name,
            facebookId: app.user.facebookId,
            room: self.roomName
        };

        $.ajax({
            url: "http://wejay.org/Room/checkin",
            data: userObject,
            dataType: "json",
            type: "POST",
            traditional: true,
            success: function (result) {
                self.lastCheckin = new Date();
                app.userLogoutShow();
                if (callback) {
                    return callback(self.roomName);
                }
            }
        });
    };

    // Update playlist ul
    this.updatePlaylist = function () {

        // prevent many simultaneous updates to flicker the playlist
        clearTimeout(updateTimeout);

        updateTimeout = setTimeout(function () {
            var url;
            url = "http://wejay.org/Room/Playlist?room=" + self.roomName;
            $.ajax({
                url: url,
                type: "GET",
                processData: false,
                contentType: "application/json; charset=utf-8",
                dataType: "text json",
                error: function (e) {
                    NOTIFIER.show("Error updating queue:", e.statusText);
                },
                success: function (r) {
                    var result, newHtml, render;
                    self.hub.checkCurrentSong(app.currentRoom.roomName, function (error, song) {
                        var currentVote;
                        currentVote = (Math.round((37 + (song?song.Vote:3) - 3) * 10) / 10).toFixed(1);
                        $('#likeAverage').html(currentVote + '&deg;');
                    });
                    result = r ? r.Playlist.filter(function (song) { return song.SpotifyId; }) : [];
                    if (result.length > 0) {
                        // slice the array to limit the playlist to 15 songs.
                        $("#currentQueueNumber").text("Current queue (" + result.length + ")");
                        //var newHtml = $("#queueTemplate").tmpl(result.slice(0, 15));
                        newHtml = $("#queueTemplate").tmpl(result);
                        if ($("#queue").text() !== newHtml.text()) {
                            render = $("<ul/>", { id: "queue", html: newHtml });
                            $("#queue").replaceWith(render);
                            return false;
                        } else {
                            return false;
                        }
                    } else {
                        newHtml = this.nothingPlayingCopy;
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

            app.placeFooter();
        }, 500);

    };

    // Update users online list
    this.updateUsers = function () {
        $.ajax({
            url: "http://wejay.org/Room/GetOnlineUsers?room=" + self.roomName,
            type: "GET",
            processData: false,
            contentType: "application/json",
            dataType: "text",
            success: function (r) {
                var loggedIn, result, loggedInUsersTitle, loggedInUsersInnerText;

                loggedIn = false;
                result = r ? JSON.parse(r).Data : [];
                loggedInUsersTitle = "NO LOGGED IN WEJAYS";
                loggedInUsersInnerText = $("#noOneIsLoggedInTemplate").tmpl();
                result = result.filter(function (user) { return user.FacebookId && user.FacebookId != "null" && user.Online; });

                if (result.length > 0 && app.user.facebookUser) {
                    result = result.map(function (user) {
                        var newDate, momentDiff, hour, timeleft, newCheckedIn;

                        newDate = moment(user.CheckedIn).valueOf();
                        momentDiff = new Date(moment(newDate).add("hours", 1).diff(new Date()));
                        hour = momentDiff.getHours();
                        timeleft = momentDiff.getMinutes();
                        newCheckedIn = (hour > 1 || timeleft > 55) ? "Just logged in" : (timeleft < 2 ? "Will logout any second now" : "Logged in for " + timeleft + " minutes");
                        if (user.FacebookId === app.user.facebookUser.id) {
                            loggedIn = true;
                        }
                        returnTimeLeft = hour > 1 ? 100 : timeleft;
                        return { UserName: unescape(user.UserName), FacebookId: user.FacebookId, CheckedIn: newCheckedIn, timeleft: returnTimeLeft };
                    }).sort(function (a, b) {
                        return b.timeleft - a.timeleft;
                    });
                    loggedInUsersTitle = "LOGGED IN WEJAYS (" + result.length + ")";
                    loggedInUsersInnerText = $("#usersTemplate").tmpl(result.slice(0, 10));
                } else {
                    sp.trackPlayer.setIsPlaying(false);
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