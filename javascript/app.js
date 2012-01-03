  			
			
			var sp = getSpotifyApi(1);
			var dom = sp.require('sp://import/scripts/dom');
			var ui = sp.require('sp://import/scripts/dnd');			  
			var m = sp.require("sp://import/scripts/api/models");
			var v = sp.require("sp://import/scripts/api/views");
			var ac = sp.require('javascript/autocomplete');
		    var r = sp.require("sp://import/scripts/react");
			var kbd = sp.require('sp://import/scripts/keyboard');
			
			

			
			
			var accessToken;
			var facebookId;
			
			var nodeUrl = 'http://wejay.org:81';
			
			var user = 'Anonymous';
			var currentRoom;
			
			// global connection to node server
			var socket;
			var topTracks = [];
			var topArtists = [];
			
			
	function initAutoComplete(){
		
			
			// Set up autocomplete. ripped from radio.js - I hope it is OK. ---------------------------------------------------------
	
		var createStation = dom.queryOne('#create-station');
		var showingAutocomplete = false;
		var autocompleteForm = dom.queryOne('.auto-completeForm'),
			searchInput = ac.tokenInput.input,
			outputElement = ac.setupAutoComplete(ac.tokenInput, function(){
	            //loadStation(searchInput.value, "spotify:app:radio", "", "search", true);
	            //hideAutocomplete();
	            currentRoom.addTrackUri(searchInput.value);
	            searchInput.focus();
	        });
	
	
	   searchInput.type = 'text';
	   searchInput.placeholder = 'Add tracks to the queue by searching or drop them here';
	
		// Creating the method that runs the autocomplete search and updates the table.
		// Take some default methods defined in autocomplete.js and curry them
		var searchHandler = partial(ac.searchResultHandler, ac.tokenInput, outputElement);
		var autocomplete = partial(ac.autoComplete, searchHandler, function() {return {tracks: topTracks, artists: topArtists}});

	
		dom.adopt(autocompleteForm, ac.tokenInput.node);
	
		r.fromDOMEvent(searchInput, 'input').subscribe(ac.throttle(autocomplete, 500));
		
		// fill the top tracks for this user
		loadTopTracks();
	}


	// Finished setting up auto complete ---------------------------------------------------------
			
	
				
/* Event handlers */
			
			
			// tab switched in ui
			sp.core.addEventListener("argumentsChanged", function (data) {
			    var tab = sp.core.getArguments()[0];
	            currentRoom.currentTab = tab;
	
		        document.location = "#" + tab + "Section";

	
			    if (tab == "room") {
			        
			        if (sp.core.getArguments().length > 1) {
						var newRoom = sp.core.getArguments()[1].toLowerCase();
						
						if (newRoom != currentRoom.roomName){
			                
			                // open new room
			                currentRoom.init(newRoom, true);
				            
						} else{
							// currentRoom.init(currentRoom.roomName); // force nowplaying to be sent
						}
			        } else {
							
						if (!currentRoom.roomName)
						{
							document.location = 'spotify:app:wejay';
							alert('You have to select a room first');
						}						
						

					}
			    }

			    if (tab == "queue"){

					if (!currentRoom.roomName)
					{
						document.location = 'spotify:app:wejay';
						alert('You have to select a room first');
					}
					else
			        	document.location = "#/1/1";

			    }

			    if (tab == "wejays"){
					if (!currentRoom.roomName){
						document.location = 'spotify:app:wejay';
						alert('You have to select a room first');
					}
			    }

			    console.log(tab);
			});
			
			// when links are dropped to the application we want to add those to the history
			sp.core.addEventListener("linksChanged", function(data){
			  	
			  	var links = sp.core.getLinks();
			  	
			  	for(var i in links)
			  	{
			  		var link = links[i];
				  	console.log('dropped', link);
			  		
			  		var type = m.Link.getType(link);
    				if (m.Link.TYPE.PROFILE === type || m.Link.TYPE.FACEBOOK_USER === type){
    		  		
			  			var user = m.User.fromURI(link, function(user){
			  				console.log('found user:', user);
			  			});
			  		} else {
			  			
			  			currentRoom.addTrackUri(link);
						
					}			  		
				  	
			  	}

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
			function loadRooms(){
				
				if (!facebookId)
					return;
				
				$.getJSON('https://graph.facebook.com/me/friends?access_token=' + accessToken + '&callback=?', function(friends){
	
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
				            
							fillRooms();
				        }
				    });
				});
				
			
			}
			
			
			//  login to facebook with the current facebook user account
			function login(callback) {
				
				// we are already authorized
				if (accessToken){

					if (callback && currentRoom){
						currentRoom.checkin(function(room){
							if (callback) callback(room);
						});
						return;
					}
					else
						return;
				}
				
				var appID = "154112144637878";
	         	var path = 'https://www.facebook.com/dialog/oauth?';
	         	var successUrl = "https://www.facebook.com/connect/login_success.html";
	         	
		   		var queryParams = [
		   			'client_id=' + appID,
		     		'redirect_uri=' + successUrl,
		     		'display=popup',
		     		'scope=email,read_stream',
		     		'response_type=token'
		     		];
		     		
			   var query = queryParams.join('&');
			   var url = path + query;			


				// show facebook login popup
				sp.core.showAuthDialog(url, successUrl, {					
					onSuccess : function(response) {
						console.log('success', response);
						
						var queryPart = response.split("#")[1];
						var queryStrings = queryPart.split("&");
						accessToken = queryStrings[0].split('=')[1];
						
						// get the current facebook user details						
						$.getJSON('https://graph.facebook.com/me?access_token=' + accessToken + '&callback=?', function(facebookUser){
							console.log('logged in user: ', facebookUser);							
							
							user = facebookUser.name;
							facebookId = facebookUser.id;
							
							if (!currentRoom)
								currentRoom = new RoomController();
								
								
							currentRoom.checkin(function(roomName){
								
								if (!currentRoom.roomName)
									currentRoom.init(roomName);
									
								if (callback)
									callback(roomName);
							});
						    
						});
						
						
					}
				}); 
			}
			
			function fillRooms(){
				$('#rooms li').each(function(){
					var room = this.innerText;
					fillRoomToplist(room, this);
					$(this).click(function(){
						document.location = 'spotify:app:wejay:room:' + room;	
					})
				});
			}
  			
			function addLeadingZero(number){
				return (parseInt(number) < 10 ? "0" : "") + parseInt(number);
			}
			
			
						// set spotify user link from an facebook image
			function setUserLinkFromFacebookId(facebookId, image){
				// console.log('finding user with facebook id ', facebookId)
				// sp.social.getUserByFacebookUid(facebookId, callbacks);
				
			}
			
			function loadTopTracks(callback) {
				
				var userName = sp.core.user ? sp.core.user.canonicalUsername : "urvader"; // TODO: how should you get the username??
				sp.social.getToplist('track', 'user', userName, {
					onSuccess: function (r) {
						topTracks = r.tracks;
						if (callback)
							callback(topTracks);
					}
				});
			}
				
			
/* INIT */
	
// init functions
$(document).ready(function () {
	console.log('ready');
	
	if (facebookId)
		loadRooms();
		
		
	initAutoComplete();
	
	$('#login').click(function(){
		login(function(room){
			
		
			
			// either the user has been in a room before, we will just open it for him. 
			//if (room)
			//	openRoom(room);
			
			// anyhow we want to update the room list
			loadRooms();

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
	fillRooms();
	
	var roomName = localStorage.getItem('room');
	
	currentRoom = new RoomController(roomName, true);
	
	if (roomName)
		document.location = "spotify:app:wejay:room";

    
});


String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};
