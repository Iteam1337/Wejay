
 // main app logic for Wejay App
 function App (){

		var self = this;
		
		var sp = getSpotifyApi(1);
		var ui = sp.require('sp://import/scripts/dnd');			  
		var m = sp.require("sp://import/scripts/api/models");
		var v = sp.require("sp://import/scripts/api/views");
	    var r = sp.require("sp://import/scripts/react");
		var kbd = sp.require('sp://import/scripts/keyboard');
		


		
		
		var accessToken;
		var facebookId;
		
		var nodeUrl = 'http://wejay.org:81';
		
		//var user = 'Anonymous';
		
		// global connection to node server
		var socket;
		var topTracks = [];
		var topArtists = [];

		// public properties
		this.user = new User();
		this.currentRoom = null;
		
					
	/* Event handlers */
				
				
				
				
				
				// tab switched in ui
		m.application.observe(m.EVENT.ARGUMENTSCHANGED, function () {
		    var tab = m.application.arguments[0];
		    self.currentRoom.currentTab = tab;

		    document.location = "#" + tab + "Section";

		    console.log(m.application.arguments);

		    if (tab == "room") {

		        if (m.application.arguments.length > 1) {
		            var newRoom = m.application.arguments[1].toLowerCase();
		            console.log('new room', newRoom);
		            self.currentRoom.init(unescape(newRoom), true);

		        } else {

		            if (!self.currentRoom.roomName) {
		                document.location = 'spotify:app:wejay';
		                alert('You have to select a room first');
		            }


		        }
		    }

		    if (tab == "queue") {

		        if (!self.currentRoom.roomName) {
		            document.location = 'spotify:app:wejay';
		            alert('You have to select a room first');
		        }
		        else
		            document.location = "#/1/1";

		    }

		    if (tab == "wejays") {
		        if (!self.currentRoom.roomName) {
		            document.location = 'spotify:app:wejay';
		            alert('You have to select a room first');
		        }
		    }

		    console.log(tab);
		});
				
				// when links are dropped to the application we want to add those to the queue
				m.application.observe(m.EVENT.LINKSCHANGED, function() {
				  	
				  	var links = m.application.links;
				  	var droppedLinks = [];
				  	
				  	links.forEach(function(link)
				  	{
					  	console.log('dropped', link);
				  		
				  		var type = m.Link.getType(link);
	    				if (m.Link.TYPE.PROFILE === type || m.Link.TYPE.FACEBOOK_USER === type){
	    		  		
				  			var user = m.User.fromURI(link, function(user){
				  				console.log('found user:', user);
				  				
				  			});
				  		} else {
				  			
				  			self.currentRoom.addTrackUri(link);
							
						}			  		
					  	
				  	});
				  	
				  	history.go(-2);
	
				});
				  
	
	/* helper functions */
	
	
				// load images in the room banner
				function fillRoomToplist(room, div){
					$.ajax({
				        url: 'http://wejay.org/Room/Toplist?room=' + room,
				        type: "GET",
				        processData: false,
				        contentType: "application/json",
				        dataType: "text",
				        success: function (r) {
				            var result = r ? JSON.parse(r).Data : [];
				            
				            
				            var result = r ? JSON.parse(r).Data : [];
				            result = result.sort(function(song){
				            	return -song.Count;
				            })
				            result = result.slice(0, 9);
				            $(div).html($("#roomTopListTemplate").tmpl(result));
				            $(div).append('<a>' + room + '</a>');
				            
				            /*
				            result = result.filter(function(item){
				            	return !!item.Songs[0].SpotifyId;
				            });
				            
				            result = result.sort(function(song){
				            	return -song.Count;
				            });
				            
				            result = result.slice(0, 4);
				            console.log(result);
				            $(div).css('backgroundImage', 'url(spotify:mosaic:' + result.map(function(item){return item.Songs[0].SpotifyId}).join(';') + ') no-repeat');
				            $(div).append('<a>' + room + '</a>');
				*/
				        }
				    });
					
				}
				
				
				// Load all rooms to startpage
		this.loadRooms=function(){
					
					if (!app.user.facebookId)
						return;
					
					$.getJSON('https://graph.facebook.com/me/friends?access_token=' + app.user.accessToken + '&callback=?', function(friends){
		
						console.log(friends);
						var users = new Array();
						
						if (friends && friends.data)
							friends.data.forEach(function(friend){
								users.push(friend.id);
							});
						
						users.push(facebookId); // add current user as well
						
						console.log('sending users: ', users);
						
						$.ajax({
					        url: 'http://wejay.org/room/GetRoomsForUsers',
					        traditional: true,
					        dataType: 'json',
					        data: {facebookIds : users},
					        type: "POST",				       
					        success: function (r) {
					           
				                $('#rooms').html($("#roomListTemplate").tmpl(r));
					            
								self.fillRooms();
					        }
					    });
					});
					
				
				}
				
				
				this.fillRooms = function(){
					$('.rooms li').each(function(){
						var room = this.innerText;
						fillRoomToplist(room, this);
						$(this).click(function(){
							document.location = 'spotify:app:wejay:room:' + room;	
						})
					});
				}
	  			
				
				
				
							// set spotify user link from an facebook image
				this.setUserLinkFromFacebookId = function(facebookId, image){
					// console.log('finding user with facebook id ', facebookId)
					// sp.social.getUserByFacebookUid(facebookId, callbacks);
					
				}
				
				
					
				
	/* INIT */
		
	// init function
	this.init = function() {
		console.log('ready');
		
		if (facebookId)
			this.loadRooms();
			
			
		var ac = sp.require('javascript/AutocompleteForm');
		ac.init('.auto-completeForm', topTracks, topArtists);

		
		$('#login').click(function(){
			self.user.authenticate(function(room){
				
			
				
				// either the user has been in a room before, we will just open it for him. 
				//if (room)
				//	openRoom(room);
				
				// anyhow we want to update the room list
				self.loadRooms();
	
				// go back to startpage			
				document.location = 'spotify:app:wejay';
				
			});
			$(this).hide();
			//$('#logout').show();
		});
		
		$('#share').bind('click', function(event){
			
			event.preventDefault();
			console.log(event.pageX, event.pageY);
			sp.social.showSharePopup(event.pageX, event.pageY, 'http://open.spotify.com/app/wejay' /*+ currentRoom.roomName*/);
		});
		
		
		
		
		$('#logout').hide();
		
		// fill default rooms
		self.fillRooms();
		
		var roomName = localStorage.getItem('room');
		self.user.facebookUser = localStorage.getItem('user');
		self.user.userName = self.user.facebookUser.name;
		
		self.currentRoom = new RoomController(unescape(roomName), nodeUrl);
		
		if (roomName)
			document.location = "spotify:app:wejay:room";
	
	    
	};
 }			


String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

