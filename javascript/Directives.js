function Directives() {

    this.version = null;
    var self = this;

    this.init = function (version) {
        self.version = version;
        if ((!app.checkIfFBUserExists) && (localStorage.facebookUser !== undefined && localStorage.acceptedLogin !== undefined && localStorage.accessToken !== undefined && localStorage.room !== undefined)) {
            var facebookUser = JSON.parse(localStorage.facebookUser);
            app.user.facebookId = facebookUser.id;
            app.user.facebookUser = facebookUser;
            app.user.accessToken = localStorage.accessToken;
            app.user.authenticate();
            app.loggedIntoRoom = localStorage.room;
            app.userLogoutShow();
        } else {
            app.user.facebookId = "";
            app.user.facebookUser = {};
            app.user.accessToken = "";
            app.userLogoutHide();
            app.clearLocalStorage();
        }

        var acceptedLogin = (localStorage.acceptedLogin) ? localStorage.acceptedLogin : false;

        if (acceptedLogin === "true") {
            app.acceptedLogin = true;
        } else {
            //
            // if the user has not accepted the disclaimer -- he/she will be reverted to the
            // "rooms"-section. Also, the standardroom will be the iteam-room.
            $(".disclaimer:first").hide();
            if (localStorage.room === undefined) {
                localStorage.room = "example";
                document.location = "spotify:app:wejay:choose";
            }
        }

        if (app.user.accessToken) {
            app.loadRooms();
        }

        var ac = sp.require("javascript/AutocompleteForm");
        ac.init(".auto-completeForm");

        //
        // On tutorial open
        $("#tutorialBtn, #tutorialBtnHowDoesItWork").click(function () {
            $("#tutorialWrap").show();

            $(window).scroll(function () {
                b = $(window).scrollTop() + $(window).height();

                $(".tutAdd").each(function () {
                    a = $(this).offset().top + $(this).height();
                    id = $(this).attr('id');
                    (a < b) ? $(this).css('opacity', '1').addClass('open') : $(this).css('opacity', '0').removeClass('open');
                    (a < b) ? $('.queue' + id).fadeIn().addClass('open') : $('.queue' + id).fadeOut().removeClass('open');
                });

                $('#tutorial .open').each(function () {
                    $('#queueLength').html('(' + $('#tutQueue .open').length + ')');
                });

                if (!$('#tutorial .open').length) {
                    $('#queueLength').html('(0)');
                }
            });
        });

        $("#tutClose").click(function () {
            $("#tutorialWrap").fadeOut();
        });

        $("#createRoom").click(function () {
            $("#enterRoomBanner").show();
        });

        $("#getStarted").on("click", function () {
            $("#roomName").focus();
            $("#tutorial").hide();
            $("#loginInformation").show();
            $("#roomsInformation").show();
        });

        //
        // Check footer position on resize
        $(window).resize(function () {
            app.placeFooter();
        });

        //
        // when switching rooms -- the app should not autostart the music ...
        app.isPlayingFromWejay = false;
        $("#start").removeClass("pause");
        $("#onair").hide();

        $("#roomLogin").on("click", function () {
            if (app.acceptedLogin) {
                app.user.authenticate(function (room) {
                    console.log(room);
                    app.loggedIntoRoom = room;
                    $("#leaveRoom").show();
                    app.loadRooms();
                    app.userLogoutShow();
                    $("#overlay").fadeOut();
                    $("#fb-checkbox").removeClass("checked");
                });
            }
        });

        $("#closeNotifierHolder").on("click", function () {
            window.NOTIFIER.hideAll();
        });

        $("#roomSection").on("drop", function (e) {
            e.preventDefault();
            function handleTheLastOutput(inputString) {
                var divID = "#searchInputField"
                $(divID).val(inputString);
                $(divID).trigger("dosearch");
            }
            var id = event.dataTransfer.getData("text"),
            t = e.target,
            tName = "auto-completeForm";
            if (t.className === tName || t.parentNode.className === tName || t.parentNode.parentNode.className === tName) {
                var type = m.Link.getType(id), dropped = false;
                if (type === 2) {
                    m.Album.fromURI(id, function (album) {
                        var tracks = album.data.tracks,
                        inputString = tracks[0].artists[0].name + " " + tracks[0].album.name;
                        return handleTheLastOutput(inputString);
                    });
                }
                if (type === 4) {
                    m.Track.fromURI(id, function (track) {
                        var inputString = track.data.artists[0].name + " " + track.data.name;
                        return handleTheLastOutput(inputString);
                    });
                }
                if (type === 5) {
                    var inputString = m.Playlist.fromURI(id).data.name;
                    handleTheLastOutput(inputString);
                }
            } else {
                app.checkIfUserAcceptedAgreement(function (res) {
                    if (!!res) {
                        app.handleDroppedLinks([id]);
                    }
                });
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
            $("#shareURL").val(app.currentRoom.shareURL);
            $("#shareOnURL").text(value);
        });

        //
        // share popup
        $("#share").on("click", function (e) {
            e.preventDefault();
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    $("#sharePopup").toggleClass("show");
                }
            });
        });

        $("#closeShare").on("click", function () {
            $("#sharePopup").removeClass("show");
        });

        var loginFunction = function (newRoomName) {
            if (/^([a-z0-9\_\-\ ]){2,10}$/i.exec(newRoomName) !== null) {
                app.currentRoom.init(newRoomName, true);
                document.location = 'spotify:app:wejay:room';
            } else if (newRoomName.length >= 16 || newRoomName.length <= 1) {
                alert("Your roomname should contain between 2 and 16 letters.");
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
            var link = $(this).attr("href");
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    app.currentRoom.addTrackUri(link);
                }
            });
        });

        $(document).on("click", ".tracks a", function (e) {
            e.preventDefault();
            var link = $(this).attr("href");
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    app.currentRoom.addTrackUri(link);
                }
            });
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
                app.currentRoom.updateUsers();
            });
            $(this).hide();
            $("#leaveRoom").show();
        });

        $("#leaveRoom").on("click", function () {
            $(this).hide();
            $("#joinRoom").show();
            app.user.logout();
            app.loggedIntoRoom = "";
            document.location = "spotify:app:wejay:choose";
        });

        $("#signoutFromTheApp").on("click", function () {
            app.user.logoutFromFacebook();
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
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    if ((CurrentClassNumber === 3) || (CurrentClassNumber === 5)) {
                        app.currentRoom.liveVote(SpotifyId, element, CurrentClassNumber);
                    }
                }
            });
        });

        //
        // bind space to play-pause
        $(document).on("keydown", function (e) {
            //
            // If user is in tab "wejay", only then space acts as play-pause.
            if (e.target.nodeName !== "INPUT" && e.keyCode === 32 && document.location.hash === "#roomSection") {
                e.preventDefault();
                if (app.isPlayingFromWejay) {
                    app.pauseApp();
                } else {
                    app.playApp();
                }
                return false;
            }
        });

        $("#start").on("click", function () {
            //
            // If the user presses play -- then wejay should force-play each time the track changes
            if ($(this).hasClass("pause")) {
                app.pauseApp();
                $(this).removeClass('onair');
            } else {
                // wejay should play.
                app.playApp();
                $(this).addClass('onair');
            }
        });

        app.showDisplayNameAsLoggedIn();

        $("#fb-checkbox").click(function () {
            if (!$(this).hasClass("checked")) {
                $(this).addClass("checked");
                $("#roomLogin").attr("disabled", false);
            }
            else {
                $(this).removeClass("checked");
                $("#roomLogin").attr("disabled", true);
            }

            app.showDisplayNameAsLoggedIn();
            localStorage.acceptedLogin = "true";
            app.acceptedLogin = true;
            app.loadRooms();
        });

        //
        // initialize the disclaimer
        if (app.acceptedLogin === false) {
            app.showLoginDisclaimer();
        } else {
            $(".disclaimer, #overlay, #overlayLimit").hide();
            app.loadRooms();
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
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    if (!$(this).hasClass("liked")) {
                        app.currentRoom.like();
                    }
                }
            });
        });
        $("#block").on("click", function () {
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    if (!$(this).hasClass("liked")) {
                        app.currentRoom.block();
                    }
                }
            });
        });
        $("#silentBlock").on("click", function () {
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    if (!$(this).hasClass("liked")) {
                        app.currentRoom.silentBlock();
                    }
                }
            });
        });
        $("#skip").on("click", function () {
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    if (!$(this).hasClass("liked")) {
                        app.currentRoom.skip();
                    }
                }
            });
        });
        $("#voteButton").on({
            mouseenter: function () {
                $("#skipHover").show();
            },
            mouseleave: function () {
                $("#skipHover").hide();
            }
        });
        $("#voteButton").on("click", function () {
            app.checkIfUserAcceptedAgreement(function (res) {
                if (!!res) {
                    if (!$(this).hasClass("liked")) {
                        $("#voteOverlay").toggleClass("show");
                    }
                }
            });
        });
        $("#voteOverlay").on("click", function (el) {
            if (el.target.id === "voteOverlay") {
                app.checkIfUserAcceptedAgreement(function (res) {
                    if (!!res) {
                        $(this).toggleClass("show");
                    }
                });
            }
        });
        $("#voteOverlay .close").on("click", function (el) {
            $("#voteOverlay").toggleClass("show");
        });

        // fill default rooms
        app.fillRooms();

        app.currentRoom = new RoomController(unescape(localStorage.room || "example"), app.nodeUrl);

        var tab = m.application.arguments[0];

        app.tabTo(tab);

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
    }
}

exports.init = new Directives().init;