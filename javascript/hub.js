function Hub (nodeUrl, currentRoom, facebookUserId){

    console.log('connecting to node server', nodeUrl);
    if (typeof io == "undefined")
        alert('Sorry, we can not connect to realtime service, try again soon');

	var socket = io.connect(nodeUrl, { secure: false, rememberTransport: false, transports: ['xhr-polling', 'jsonp-polling'] });
	var facebookId = facebookUserId;
	
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
	
    // checkin to the room in node server
	this.checkin = function(options)
	{
		console.log('checkin to node');
		socket.emit("checkin", options);
	}
	
    // checkout from the room in the node server
	this.checkout = function(){
		socket.disconnect();
	}

	socket.on('connect', function (data) {
	    console.log('connect');

	    //if (currentRoom)
	    //currentRoom.clearCurrentSong();

	    if (facebookId)		 // TODO: move 
	        currentRoom.checkin(false, function () {
	            currentRoom.updateUsers();
	        });

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


	socket.on('onSongStarted', function (currentSong) {

	    console.log('songStarted', currentSong);

	    if (!currentSong)
	        return;

        currentRoom.playSong(currentSong)

	    currentRoom.updatePlaylist();

	});
    
 }
 
