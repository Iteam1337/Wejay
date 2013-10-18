function Hub(nodeUrl, currentRoom, facebookUserId) {

    function handleError(message) {
        message = message ? message : "Sorry, we can not connect to realtime service, try again soon";
        $("#offline").show();
        $("#offline p").text(message);
        $("#online").hide();
    }

    function createConnection() {
        return new io.connect(nodeUrl, { secure: false, rememberTransport: false, transports: ["xhr-polling", "jsonp-polling"] });
    }

    var socket, facebookId;

    console.log("connecting to node server", nodeUrl);

    if (typeof io === "undefined") {
        return handleError();
    }

    socket = createConnection();
    facebookId = facebookUserId;

    socket.on("error", function () {
        console.log("error", arguments);
        socket.disconnect();
        return handleError("Sorry, we lost your connection with our realtime service, try again soon");
    });

    socket.on("userlogout", function () {
        console.log("userlogout", arguments);
        currentRoom.updateUsers();
        currentRoom.updatePlaylist();
    });

    socket.on("connect", function () {
        console.log("connect", arguments);
        currentRoom.clearCurrentSong(true);
        currentRoom.updateUsers();
    });

    socket.on("onSongAdded", function (song) {
        console.log("onSongAdded", arguments);
        if (song) {
            currentRoom.updatePlaylist();
        }
    });

    socket.on("onCheckin", function (data) {
        console.log("onSongAdded", arguments);
        currentRoom.updateUsers();
        app.updateServerTime(data);
    });

    socket.on("onCheckout", function () {
        console.log("onCheckout", arguments);
        currentRoom.updateUsers();
    });

    socket.on("onSongEnded", function () {
        console.log("onSongEnded", arguments);
        currentRoom.clearCurrentSong();
    });

    socket.on("onSongStarted", function (currentSong) {
        console.log("onSongEnded", arguments);
        if (!currentSong) {
            return;
        }
        if (!currentSong.SpotifyId) {
            console.log("No spotify Id, ignoring...");
        } else {
            currentRoom.playSong(currentSong);
            currentRoom.updatePlaylist();
        }
    });

    this.queueSong = function (song, callback) {
        $.ajax({
            url: "http://wejay.org/Room/playSong",
            data: song,
            dataType: "json",
            traditional: true,
            type: "POST",
            success: function (result) {
                socket.emit("addSong", song);
                if (callback) {
                    callback();
                }
            }
        });
    };

    this.checkCurrentSong = function (room, callback) {
        var data;
        data = { room: room };
        $.ajax({
            url: "http://api.wejay.org/NodeJs/CurrentSong",
            data: data,
            dataType: "json",
            traditional: true,
            type: "POST",
            success: function (response) {
                return callback(null, response);
            },
            error: function (response) {
                return callback(response, null);
            }
        });
    };

    this.userLogout = function () {
        socket.emit("ulogout", "");
    };

    this.checkin = function (options) {
        socket.emit("checkin", options);
    };

    this.checkout = function () {
        socket.disconnect();
    };

    this.songSkipped = function (song) {
        socket.emit("songSkipped", song);
    };

}