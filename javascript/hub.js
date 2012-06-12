function Hub (nodeUrl, currentRoom, facebookUserId) {

    console.log('connecting to node server', nodeUrl);

    if (typeof io === "undefined") {
        alert('Sorry, we can not connect to realtime service, try again soon');
    }

    var socket = io.connect(nodeUrl, { secure: false, rememberTransport: false, transports: ['xhr-polling', 'jsonp-polling'] }),
        facebookId = facebookUserId;

    this.queueSong = function (song, callback) {
        $.ajax({
            url: 'http://wejay.org/Room/playSong',
            data: song,
            dataType: 'json',
            traditional: true,
            type: 'POST',
            success: function (result) {
                socket.emit('addSong', song);
                if (callback) {
                    callback();
                }
            }
        });
    }

    this.checkin = function(options) {
        //console.log('checkin to node', options);
        socket.emit("checkin", options);
    }

    this.checkout = function() {
        socket.disconnect();
    }

    socket.on('connect', function (data) {
        //console.log(':::   connect', data);
        
        currentRoom.clearCurrentSong();
        currentRoom.updateUsers();
    });

    socket.on('onSongAdded', function(song) {
        //console.log(':::   onSongAdded', song);

        currentRoom.updatePlaylist();
    })
    
    socket.on('onCheckin', function (data) {
        //console.log(':::   onCheckin', data);

        currentRoom.updateUsers();
    });

    socket.on('onCheckout', function (data) {
        //console.log(':::   checkout', data);

        currentRoom.updateUsers();
    });

    socket.on('onSongEnded', function (lastSong) {
        //console.log(':::   onSongEnded', lastSong);

        currentRoom.clearCurrentSong();
    });

    socket.on('onSongStarted', function (currentSong) {
        //console.log(':::   songStarted', currentSong);

        if (!currentSong) {
            return;
        }
        if (!currentSong.SpotifyId) {
            console.log('No spotify Id, ignoring...');
        } else {
            currentRoom.playSong(currentSong)
        }
        currentRoom.updatePlaylist();
    });

}