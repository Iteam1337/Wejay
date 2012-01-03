
			
 	function RoomController (roomName){
 		
 		console.log('New RoomController for room ' + roomName);
 		
 		var self = this;
		
		if (roomName)
			this.roomName = roomName.toLowerCase();
		
		this.currentTab = null;
		
		this.stop = function(){
  			var player = sp.trackPlayer;
			player.setIsPlaying(false);
		}
		
		this.addTrackUri = function(uri){
			m.Track.fromURI(uri, function(track){
				console.log('found track', track)
				var song = { artist: track.data.artists[0].name, mbid: "", title: track.data.name, length: parseInt(track.data.duration / 1000), spotifyId : track.data.uri.replace('spotify:track:', '') };
				song.room = self.roomName;
				console.log('adding track->song', track, song);
				
				login(function(){
					self.updateUsers();
					self.hub.queueSong(song, function(){
		             	self.updatePlaylist();  
		             	document.location = 'spotify:app:wejay:queue';
					});
				});

			});

		}
			
		this.playSong = function(song, forcePlay){
							
				console.log('Playing ', song);
							
			    if (song.Played) {
			        var played = eval(song.Played.replace(/\/Date\(([-\d]+)\)\//gi, "new Date($1)"));
			        var diff = new Date().getTime() - played.getTime();
			        song.position = new Date(diff);
			    } else {
			        song.position = new Date().setTime(0); // start from 0 seconds if no position was set
			    }
			    
			    this.currentSong = song;
			
			    var trackUri = "spotify:track:" + song.SpotifyId;
			
			    if (song.position && song.position.getMinutes)
			        trackUri += "#" + addLeadingZero(song.position.getMinutes()) + ':' + addLeadingZero(song.position.getSeconds());

		    	m.Track.fromURI(trackUri, function(track){
			    	//$('currentSong').html(track.node);	
			    	var tpl = new m.Playlist();
			    	tpl.add(track);

         			var player = sp.trackPlayer;
         			
					var currentTrack = player.getNowPlayingTrack();
					

					if (forcePlay || ((typeof currentTrack == 'undefined' || currentTrack  == null || currentTrack.track.uri != track.uri))){
						
						player.playTrackFromUri(trackUri, {
							onSuccess : function(s){
								//console.log(s, 'played correctly');
								
								
								// only autostart player if we are in the current playing view
								/*if (self.currentTab == 'room')
									player.setIsPlaying(true);*/
									
							},
							onError : function(s){
								console.log(s, 'play error');
							}
						});
						//document.body.appendChild(player.node);
					}
					
					$("#currentSong").html(track.data.artists[0].name + " - " + track.data.name);
					$("#currentAlbum").attr('src', track.data.album.cover);
					$("#currentAlbum").show();

					//$("#currentLink").attr('href', track.data.uri);
					$("#currentPlayedBy").html('by ' + song.PlayedBy.UserName);

					console.log('playing track', track);
					
		    	});
			}

		this.clearCurrentSong = function(){
			$('#roomTitle').html(this.roomName + ' ROOM');

	       	$("#currentSong").html('');

	       	$("#currentSong").html('Loading...');

	       	$("#currentAlbum").hide();

	       	//$("#currentLink").attr('href', '');
	       	$("#currentPlayedBy").html('');
	       	
	       	//this.stop();
		}

		this.dispose = function() {
			console.log('dispose', this);
			
			this.hub.checkout();
			
			this.hub = null;
			//this = null;
		}

		this.skip = function() {
			$.ajax({
		        url: 'http://wejay.org/Room/next',
		        data: { room: self.roomName },
		        dataType: 'json',
		        type: 'POST',
		        traditional: true,
		        success: function (result) {
		        	
		        	console.log('skipped successfully');
		        }
		    });	
		}

		this.init = function(roomName, anonymous)		{
			console.log('init');
			
			if (!roomName)
				throw "Room name must be specified"
			/*if (!room) // if no room was specified, go back to the starting page
			{
				document.location = '#/0';
				return;
			}*/
				
			// document.location = 'spotify:app:wejay:room:' + room;
			this.roomName = roomName.toLowerCase();
			
			this.clearCurrentSong();
			
			//this.stop();
	      
	       	$("#roomLink").val('http://open.spotify.com/app/wejay:room:' + this.roomName );
	       	//$("#roomLink").html('spotify:app:wejay:room:' + room);
			
			$("#shareFacebook").attr('href', "http://www.facebook.com/sharer.php?u={0}&t={1}".format($("#roomLink").val(), this.roomName.toUpperCase() + " WEJAY ROOM on Spotify. Join this room and control the music together. We are the DJ."));
			

			
			
			// start listening to commands from node server
			//this.hub.checkin();
			this.hub.checkin({ user: user, room: this.roomName });
			
			
			localStorage.setItem('room', this.roomName);
			
			if (!anonymous && !facebookId)
				login(function(){
		            self.updateUsers();
		            self.updatePlaylist();
					localStorage.setItem('user', user);
				});
			else
			{
	            self.updateUsers();
	            self.updatePlaylist();
			}
		}	
            
		
// checkin the current user to wejay
		this.checkin = function(callback)
		{
			//if (!room || !user || !facebookId )
			//	throw "You have not set room and user or facebook details yet";
			var self = this;
				
			$.ajax({
		        url: 'http://wejay.org/Room/checkin',
		        data: { userName: escape(user), facebookId: facebookId, room: self.roomName },
		        dataType: 'json',
		        type: 'POST',
		        traditional: true,
		        success: function (result) {
		        	
		        	
		        	//self.init(result.room); // save the last connected room for this user
		        								        		
		            if (callback)
		                callback(self.roomName);
		                
		            console.log(user + ' logged in to wejay room ', self.roomName);
		
		            //self.hub.checkin({ user: user, room: self.roomName });
		        }
		    });
			
		}
			



		// Update playlist ul
		this.updatePlaylist = function() {
		    $.ajax({
		        url: 'http://wejay.org/Room/Playlist?room=' + self.roomName,
		        type: 'GET',
		        processData: false,
		        contentType: 'application/json',
		        dataType: 'text',
		        success: function (r) {

		            var result = r ? JSON.parse(r).Playlist : [];

					/*var list = m.Collection();
					
					// only show songs with SpotifyId
					result.filter(function(song){return song.SpotifyId}).forEach(function(song){
						list.add("spotify:track:" + song.SpotifyId);
					});
					
					* TODO: switch to a Spotify List instead of custom template
					* */
					
					
		            if (result.length > 0) {
		                $('#queue').html($("#queueTemplate").tmpl(result));
		                // playSong(result[0]);
		            }
		            else {
		                $('#queue').html('<li>Queue is empty, add tracks by dragging them below.</li>');
		                $("#currentSong").html('Nothing playing right now');
		            }
		        }
		    });	
			
		}

		// Update users online list
		this.updateUsers = function()
		{
			$.ajax({
                url: 'http://wejay.org/Room/GetOnlineUsers?room=' + self.roomName,
                type: 'GET',
                processData: false,
                contentType: 'application/json',
                dataType: 'text',
                success: function (r) {
                	
                	var result = r ? JSON.parse(r).Data : [];
                	
                	if (result.length > 0)
	                	$('#users').html($("#usersTemplate").tmpl(result));
	                else
	                	$('#users').html('<li>No users are online in this room. Login by adding this app to the sidebar and drag a track to the app.</li>');
                }
            });	
			
		}
	

		this.hub = new Hub(nodeUrl, self);
	
		if (this.roomName)
			this.init(roomName);
		

  
	}  
			
