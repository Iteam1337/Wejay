function Hub (nodeUrl, currentRoom, facebookUserId) {

    console.log("connecting to node server", nodeUrl);

    if (typeof io === "undefined") {
        $( "#offline" ).show();
        $( "#main" ).hide();
        alert("Sorry, we can not connect to realtime service, try again soon");
        return
    }

    var socket = io.connect(nodeUrl, { secure: false, rememberTransport: false, transports: ["xhr-polling", "jsonp-polling"] })
      , facebookId = facebookUserId;

    this.queueSong = function (song, callback) {
        $.ajax({
            url: "http://wejay.org/Room/playSong",
            data: song,
            dataType: "json",
            traditional: true,
            type: "POST",
            success: function (result) {
                console.log( result );
                socket.emit("addSong", song);
                if (callback) {
                    callback();
                }
            }
        });
    }

    this.userLogout = function () {
        socket.emit( "ulogout", "" );
    }

    this.checkin = function(options) {
        console.log("checkin to node", options);
        console.log("currentRoom", currentRoom);
        socket.emit("checkin", options);
    }

    this.checkout = function() {
        socket.disconnect();
    }

    socket.on("userlogout", function ( data ) {
        currentRoom.updateUsers();
        currentRoom.updatePlaylist();
    });

    socket.on("connect", function (data) {
        currentRoom.clearCurrentSong();
        currentRoom.updateUsers();
    });

    socket.on("onSongAdded", function(song) {
        currentRoom.updatePlaylist();
    })

    socket.on("onCheckin", function (data) {
        currentRoom.updateUsers();
    });

    socket.on("onCheckout", function (data) {
        currentRoom.updateUsers();
    });

    socket.on("onSongEnded", function (lastSong) {
        currentRoom.clearCurrentSong();
    });

    socket.on("onSongStarted", function (currentSong) {
        if (!currentSong) {
            return;
        }
        if (!currentSong.SpotifyId) {
            console.log("No spotify Id, ignoring...");
        } else {
            currentRoom.playSong(currentSong)
        }
        currentRoom.updatePlaylist();
    });

}