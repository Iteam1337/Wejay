function Hub (nodeUrl, currentRoom){
	
	console.log('connecting to node server', nodeUrl);
	var socket = io.connect(nodeUrl, { secure: false, rememberTransport: false, transports: ['xhr-polling', 'jsonp-polling'] });

	this.queueSong = function(song, callback){
		$.ajax({
            url: 'http://wejay.org/Room/playSong',
            data: song,
            dataType: 'json',
            traditional: true,
            type: 'POST',
            success: function (result) {
                socket.emit('addSong', song);
             	if (callback){
             		callback();
             	}
            }
        });	
	}
	
	this.checkin = function(options)
	{
		console.log('checkin to node');
		socket.emit("checkin", options);
	}
	
	this.checkout = function(){
		socket.disconnect();
	}
	

	socket.on('connect', function (data) {
		console.log('connect');
		
		//if (currentRoom)
			//currentRoom.clearCurrentSong();
		
		if (facebookId)		 // TODO: move 
			currentRoom.checkin();
		
    });		
    
    socket.on('onSongAdded', function(song){
    	console.log('onSongAdded');
    	currentRoom.updatePlaylist();
    })
    
    socket.on('onCheckin', function (data) {
    	console.log('onCheckin');
        currentRoom.updateUsers();
    });		

    socket.on('onCheckout', function (data) {
    	console.log('checkout');
        currentRoom.updateUsers();
    });		
    	
    socket.on('onSongEnded', function(lastSong){
		currentRoom.clearCurrentSong();
		console.log('onSongEnded');
	});
	
		            			
    socket.on('onSongStarted', function(currentSong){
	
		console.log('songStarted', currentSong);
		
		
		if (!currentSong.SpotifyId) {
			// if it is an old song we don't have the spotifyId, we have to look it up..
            $.ajax({
                url: "http://ws.spotify.com/search/1/track.xml?q=" + (currentSong.MbId ? 'isrc:' + currentSong.MbId : currentSong.Artist + ',' + currentSong.Title),
                dataType: 'xml',
                traditional: true,
                type: 'GET',
                success: function (result) {
                    //Parse spotify link id
                    if ($(result).find("track").length > 0) {
                        var parsedValue = $(result).find("track")[0].attributes[0].value; //"spotify:track:2b712q3E27nyW6LGsZxr0y"
                        currentSong.SpotifyId = parsedValue.split(':')[2];
                    }

                    currentRoom.playSong(currentSong);
                }
            });
		} else {
			currentRoom.playSong(currentSong)
		}
		
		currentRoom.updatePlaylist();
		
    });
    
 }
 
