
 // main app logic for Wejay App
 function App () {
 		
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
		
		if (!m.application) {
		    alert('This version of Spotify is not compatible with this App. Please upgrade to a newer version and try again');
		    history.back();
		    return;
		}
		
		this.tabTo = function (tab) {
		    self.currentRoom.currentTab = tab;
		
		    var currentTab = document.location = "#" + tab + "Section";
		
		    $('section').removeClass('current');
		
		    $(currentTab).addClass('current');
		    $(currentTab).parents('section').addClass('current');
		    $(currentTab).children('section').first().addClass('current');
		
		    console.log("tabTo =>",m.application.arguments, "this.user =>", self.user.facebookId);
		
		    if (tab == "choose") {
		        this.loadRooms();
		    }
		
		    if (tab == "room") {
		
		        if (m.application.arguments.length > 1) {
		            var newRoom = m.application.arguments[1].toLowerCase();
		
		            if (self.currentRoom.roomName != newRoom) {
		                console.log('new room', newRoom);
		                self.currentRoom.init(unescape(newRoom), true);
		            }
		
		        } else {

		            if (!self.currentRoom.roomName) {
		                alert('You have to select a room first');
		            }


		        }

		        self.currentRoom.updatePlaylist();

		    }

		    if (tab == "wejays") {
		        if (!self.currentRoom.roomName) {
		            alert('You have to select a room first');
		        }
		    }
		}

		// tab switched in ui
		m.application.observe(m.EVENT.ARGUMENTSCHANGED, function () {
		    var tab = m.application.arguments[0];
		    
		    self.tabTo(tab);

		    //console.log(tab);
		});
		
		
		this.handleDroppedLinks = function (links) {
		    console.log('dropped', links);
		    var droppedLinks = [];
		    app.user.authenticate(function () {

		        links.forEach(function (link) {

		            var type = m.Link.getType(link);
		            if (m.Link.TYPE.PROFILE === type || m.Link.TYPE.FACEBOOK_USER === type) {

		                var user = m.User.fromURI(link, function (user) {
		                    console.log('found user:', user);
		                    alert('You can not yet invite people by dragging them, please share the link to the room instead, you will find it on the Wejays tab');
		                });
		            } else {

		                if (m.Link.TYPE.TRACK === type)
		                    self.currentRoom.addTrackUri(link);

		                if (m.Link.TYPE.PLAYLIST === type) {
		                    var playlist = m.Playlist.fromURI(link);
		                    var tracks = playlist.data.all();

		                    console.log('playlist: ', tracks);
		                    tracks.forEach(function (uri) {
		                        self.currentRoom.addTrackUri(uri);
		                    });

		                    self.currentRoom.updatePlaylist();

		                    self.linkPlaylist(playlist);
		                }


		            }

		        });
		    });
		}


        // listen to changes in a playlist and automatically add all new tracks added
		this.linkPlaylist = function (playlist) {
		    var tracks = before = playlist.data.all();



		    playlist.observe(m.EVENT.CHANGE, function (changedPlaylist) {
		        console.log('Found changes in playlist');

		        var after = changedPlaylist.data.all(); // get tracks from playlist



		        var newTracks = after
                .filter(function (track) {
                    return !before.some(function (b) { return b == track }); // only keep the tracks that wasn't there before == added
                });

		        if (newTracks.length) {

		            app.user.authenticate(function () {
		                newTracks.forEach(function (track) {
		                    self.currentRoom.addTrackUri(track);
		                });

		                self.currentRoom.updatePlaylist();
		            });
		        }

		        before = after; // update the history so we can understand next change
		    });

		}
				
				// when links are dropped to the application we want to add those to the queue
		m.application.observe(m.EVENT.LINKSCHANGED, function () {


		    var links = m.application.links;

		    console.log('dropped links', links);

		    self.handleDroppedLinks(links);

		});


		/* helper functions */

		function getTracksFromPlaylist(playlist) {
		    var result = [];
		    for (var i = 0; i < playlist.data.length; i++) {
		        var track = playlist.data.getTrack(i);
		        if (track)
                    result.push(track);
		    }
		    return result;
		}
	
	
				// load images in the room banner
				function fillRoomToplist(room, div){
				    $.ajax({
				        url: 'http://wejay.org/Room/GetOnlineUsers?room=' + encodeURI(room),
				        type: 'GET',
				        processData: false,
				        contentType: 'application/json',
				        dataType: 'text',
				        success: function (r) {

				            var result = r ? JSON.parse(r).Data : [];

				            result = result.sort(function (user1, user2) {
				                return user1.CheckedIn-user2.CheckedIn;
				            });

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
				this.loadRooms = function () {

				    if (!app.user.facebookId)
				        return;

				    app.user.loadFriends(function (users) {

				        users.push(app.user.facebookId); // add current user as well

				        // console.log('sending users: ', users);

				        $.ajax({
				            url: 'http://wejay.org/room/GetRoomsForUsers',
				            traditional: true,
				            dataType: 'json',
				            data: { facebookIds: users },
				            type: "POST",
				            success: function (r) {

				                r = r.filter(function (i) { return i.Name && i.Name.toLowerCase() != "null" })
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
				this.init = function (version) {
				    this.version = version;
				    console.log('ready');

				    if (app.user.accessToken)
				        this.loadRooms();


				    var ac = sp.require('javascript/AutocompleteForm');
				    ac.init('.auto-completeForm', topTracks, topArtists);

				    var userLogoutShow = function () {
				        $('#login').hide();
				        $('#roomLogin').hide();
				        $('#logout').show();
				        $('#roomLogout').show();
				    }
				    var userLogoutHide = function () {
				        $('#login').show();
				        $('#roomLogin').show();
				        $('#logout').hide();
				        $('#roomLogout').hide();
				    }

				    $('#logout').click(function () {

				        self.user.logout();
				        userLogoutHide();

				    });

				    $('#roomLogout').click(function () {

				        self.user.logout();
				        userLogoutHide();

				    });

				    $('#roomLogin').click(function () {
				        self.user.authenticate(function (room) {
				            self.loadRooms();
				        });
				        userLogoutShow();
				    });

				    $('#login').click(function () {
				        self.user.authenticate(function (room) {



				            // either the user has been in a room before, we will just open it for him. 
				            //if (room)
				            //	openRoom(room);

				            // anyhow we want to update the room list
				            self.loadRooms();

				            // back to startpage
				            //document.location = 'spotify:app:wejay';

				        });
				        userLogoutShow();
				    });

				    $('#roomSection').bind("drop", function (e) {
				        e.preventDefault();
				        var id = event.dataTransfer.getData('text');
				        console.log('dropped to section ', id);

				        self.handleDroppedLinks([id]);

				    });

				    $('#roomSection').bind("dragenter", function (e) {
				        e.preventDefault();
				        // e.dataTransfer.dropEffect = 'copy';
				        return true;
				    });

				    $('#roomSection').bind("dragover", function (e) {
				        return false;
				    });

				    $('#share').bind('click', function (event) {

				        event.preventDefault();
				        console.log(event.pageX, event.pageY);
				        m.application.showSharePopup(document.getElementById('share'), 'spotify:app:wejay' /*+ currentRoom.roomName*/);
				    });

				    $("#userToplist a").live("click", function (e) {
				        e.preventDefault();
				        var link = $(this).attr("href");
				        self.currentRoom.addTrackUri(link);
				    });

				    // one way to correct the auto-completeForm show/hide-function
				    $("body").click(function (e) {
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


				    userLogoutHide();

				    // fill default rooms
				    self.fillRooms();

				    var roomName = localStorage.getItem('room');
				    self.user.facebookUser = localStorage.getItem('facebookUser');

				    if (self.user.facebookUser) self.user.userName = self.user.facebookUser.name;

				    self.currentRoom = new RoomController(unescape(roomName), nodeUrl);

				    var tab = m.application.arguments[0];

				    this.tabTo(tab);


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

// Toplist
var toplist = new m.Toplist();
toplist.toplistType = m.TOPLISTTYPE.USER;
//toplist.toplistType = m.TOPLISTTYPE.REGION;
toplist.matchType = m.TOPLISTMATCHES.TRACKS;
toplist.userName = m.TOPLISTUSER_CURRENT;
//toplist.region = "SE";
toplist.observe(m.EVENT.CHANGE, function () {
    var i = 0, max = 10;
    for (; i < max; i++) {
        console.log("added song to toplist", toplist.results[i]);
        $("#userToplist").append($("#userToplistTemplate").tmpl(toplist.results[i]));
    }
});

toplist.run();