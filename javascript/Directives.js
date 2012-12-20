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

        $("#tutorialBtn, #aboutSection #tutorialBtn").click(function () {
            $("#tutorialWrap").show();
            var controller = $.superscrollorama();
            $('.tutAdd').each(function () {
                var id = $(this).attr('id');
                controller.addTween('#' + id, TweenMax.from($('#' + id), 1, { css: { opacity: 0 }, onComplete: function () { $('#' + id).addClass('open'); $('.queue' + id).addClass('open').fadeIn(); $('#queueLength').html('(' + $('#tutQueue .open').length + ')'); } }));
            });
        });

        $('#tutClose').click(function () {
            $('#tutorialWrap').fadeOut();
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
        app.isPlayingFromWejay = false;
        $("#start").removeClass("pause");
        $("#onair").hide();

        $("#roomLogin").on("click", function () {
            if (app.checkIfUserAcceptedAgreement()) {
                app.user.authenticate(function (room) {
                    app.loggedIntoRoom = room;
                    $("#leaveRoom").show();
                    app.loadRooms();
                    app.userLogoutShow();
                    $("#overlay").fadeOut();
                });
            }
        });

        $("#closeNotifierHolder").on("click", function () {
            window.NOTIFIER.hideAll();
        });

        $("#roomSection").on("drop", function (e) {
            e.preventDefault();
            var id = event.dataTransfer.getData("text"),
                t = e.target,
                tName = "auto-completeForm",
                inputName = "#searchInputField";
            if (t.className === tName || t.parentNode.className === tName || t.parentNode.parentNode.className === tName) {
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
                    $(inputName).val(dropped);
                    $(inputName).trigger("dosearch");
                }
            } else if (app.checkIfUserAcceptedAgreement()) {
                app.handleDroppedLinks([id]);
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
            if (app.checkIfUserAcceptedAgreement()) {
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
            if (app.checkIfUserAcceptedAgreement()) {
                var link = $(this).attr("href");
                app.currentRoom.addTrackUri(link);
            }
        });

        $(document).on("click", ".tracks a", function (e) {
            e.preventDefault();
            var link = $(this).attr("href");
            if (app.checkIfUserAcceptedAgreement()) {
                app.currentRoom.addTrackUri(link);
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

        $(document).on("click", "#queue li .star", function () {
            var element = $(this),
                        CurrentClass = element.attr("class").match(/(no)+(\d){1}/),
                        song = element.parent().find(".track").attr("href"),
                        SpotifyId = song.split(":"),
                        length = SpotifyId.length - 1,
                        CurrentClassNumber = parseInt(CurrentClass[2]);
            CurrentClass = CurrentClass[0];
            SpotifyId = SpotifyId[length];
            if (app.checkIfUserAcceptedAgreement()) {
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


        //
        // initialize the disclaimer
        if (app.acceptedLogin === false) {
            $("#overlay").show().find(".rooms").show();
            $("#login").attr("disabled", true);
            $(".disclaimer .checkbox").hover(
                function () {
                    if (!$(this).hasClass("checked")) {
                        var button = $(".disclaimer.rooms .sp-button");
                        button.attr('disabled', false).addClass("hover");
                        $(this).css("background-position", "0 0");
                    }
                },
                function () {
                    if (!$(this).hasClass("checked")) {
                        var button = $(".disclaimer.rooms .sp-button");
                        $("#roomLogin").attr("disabled", true);
                        button.removeClass("hover");
                        $(this).css("background-position", "0 36px");
                    }
                }

            );
            $(".disclaimer .checkbox").click(function () {
                $(this).css("background-position", "0 0");
                $(this).addClass("checked");
                $("#roomLogin").attr("disabled", false);
                localStorage.acceptedLogin = "true";
                app.acceptedLogin = true;
            });
        } else {
            $(".disclaimer").remove();
            $("#overlay, #overlayLimit").hide();
            app.loadRooms();
        }
        $("#like").on({
            mouseenter: function () {
                $("#likeHover").fadeIn();
            },
            mouseleave: function () {
                $("#likeHover").fadeOut();
            }
        });
        $("#like").on("click", function () {
            if (app.checkIfUserAcceptedAgreement()) {
                app.currentRoom.like();
            }
        });

        $("#block").on("click", function () {
            if (app.checkIfUserAcceptedAgreement()) {
                app.currentRoom.block();
            }
        });
        $("#skip").on("click", function () {
            if (app.checkIfUserAcceptedAgreement()) {
                app.currentRoom.skip();
            }
        });
        $("#voteButton").on({
            mouseenter: function () {
                $("#skipHover").fadeIn();
            },
            mouseleave: function () {
                $("#skipHover").fadeOut();
            }
        });
        $("#voteButton").on("click", function () {
            if (app.checkIfUserAcceptedAgreement()) {
                $("#voteOverlay").toggleClass("show");
            }
        });

        $("#voteOverlay").on("click", function (el) {
            if (el.target.id === "voteOverlay") {
                if (app.checkIfUserAcceptedAgreement()) {
                    $(this).toggleClass("show");
                }
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