	var sp = getSpotifyApi(1);

	var ui = sp.require('sp://import/scripts/dnd');
	  
	var m = sp.require("sp://import/scripts/api/models");
	var v = sp.require("sp://import/scripts/api/views");

	var accessToken;

			
 	function RoomController (roomName, nodeUrl){
 		
 		console.log('New RoomController for room ' + roomName);
		
		var facebookId;
 		
 		var self = this;
		
		if (roomName)
			this.roomName = unescape(roomName).trim().toLowerCase();
		
		this.currentTab = null;
		
		this.stop = function(){
  			var player = sp.trackPlayer;
			player.setIsPlaying(false);
		}

		this.addTrackUri = function (uri) {
		    console.log('adding track uri: ' + uri);

			if (!uri)
				return;
			
		    m.Track.fromURI(uri, function (track) {
		        self.queueTrack(track);
		    });

		}

		this.queueTrack = function (track) {
		    var song = { artist: track.data.artists[0].name, mbid: "", title: track.data.name, length: parseInt(track.data.duration / 1000), spotifyId: track.data.uri.replace('spotify:track:', '') };
		    song.room = self.roomName;
		    console.log('adding track->song', track, song);

		    self.hub.queueSong(song, function () {
		        // document.location = 'spotify:app:Wejay:room';
		    });
		}


		this.getTrack = function (searchString, callback, errorCallback) {

		    if (!callback)
		        throw "No callback provided";


		    var search = new m.Search(searchString);
		    search.localResults = m.LOCALSEARCHRESULTS.IGNORE;
		    search.pageSize = 1;

		    // only tracks
		    search.searchTracks = true;
		    search.searchAlbums = false;
		    search.searchArtists = false;
		    search.searchPlaylists = false;

		    search.observe(m.EVENT.CHANGE, function () {
		        if (!search.tracks || search.tracks.length == 0)
		            callback(null);
		        else
		            callback(search.tracks[0].data);
		    });

		    // start search
		    try {
		        search.appendNext();
		    } catch (err) {
		        errorCallback(err);
		    }
		};
		
		var addLeadingZero = function(number){
			return (parseInt(number) < 10 ? "0" : "") + parseInt(number);
		}

		this.playSong = function (song, forcePlay) {

		    if (!song)
		        return;

		    console.log('Playing ', song);

		    if (song.Played) {
		        var played = eval(song.Played.replace(/\/Date\(([-\d]+)\)\//gi, "new Date($1)"));
		        var diff = new Date().getTime() - played.getTime();
		        song.position = new Date(diff);
		    } else {
		        song.position = new Date().setTime(0); // start from 0 seconds if no position was set
		    }

		    if (!song.SpotifyId) {
		        this.skip(); // no point in waiting for a song at this point with no id
		        return;
		    }

		    this.currentSong = song;

		    var trackUri = "spotify:track:" + song.SpotifyId;

		    if (song.position && song.position.getMinutes)
		        trackUri += "#" + addLeadingZero(song.position.getMinutes()) + ':' + addLeadingZero(song.position.getSeconds());

		    m.Track.fromURI(trackUri, function (track) {
		        //$('currentSong').html(track.node);	

		        var tpl = self.queue || new m.Playlist();

		        if (!tpl.data.all().some(function (t) { t == track.uri }))
		            tpl.add(track);

		        var player = sp.trackPlayer;

		        var currentTrack = player.getNowPlayingTrack();

		        player.context = tpl;


		        if (forcePlay || ((typeof currentTrack == 'undefined' || currentTrack == null || (player.getIsPlaying() && currentTrack.track.uri != track.uri)))) {

		            player.playTrackFromUri(trackUri, {
		                onSuccess: function (s) {
		                    //console.log(s, 'played correctly');


		                    // only autostart player if we are in the current playing view
		                    /*if (self.currentTab == 'room')
		                    player.setIsPlaying(true);*/

		                },
		                onError: function (s) {
		                    console.log(s, 'play error');
		                }
		            });
		            //document.body.appendChild(player.node);
		        }

		        self.queue = tpl;

		        $("#currentSong").html(track.data.artists[0].name + " - " + track.data.name);
		        $("#currentAlbum").attr('src', track.data.album.cover);

		        $("#currentLink").attr('href', track.data.uri);
		        if (song.PlayedBy) {
		            $("#currentPlayedBy").html('by ' + song.PlayedBy.UserName);
		            $("#currentPlayedBy").show();
		        }
		        else {
		            $("#currentPlayedBy").hide();
		        }

		        console.log('playing track', track);

		    });
		}

		this.clearCurrentSong = function(){
			$('#roomTitle').html(escape(this.roomName) + ' ROOM');

	       	$("#currentSong").html('');

	       	$("#currentSong").html('Nothing playing right now. Drag a track here!');

	       	$("#currentAlbum").attr('src', "sp://import/img/placeholders/300-album.png");

	       	$("#currentLink").attr('href', '');
	       	$("#currentPlayedBy").html('');

	       	$("#queue").html('');

	       	
	       	//this.stop();
		}

		this.dispose = function() {
			console.log('dispose', this);
			
			this.hub.checkout();
			
			this.hub = null;
			//this = null;
		}

		this.skip = function () {
		    this.checkin(true, function () {
		        $('#skip').html('Skipping...');
		        $.ajax({
		            url: 'http://wejay.org/Room/next',
		            data: { room: self.roomName },
		            dataType: 'json',
		            type: 'POST',
		            traditional: true,
		            success: function (result) {
		                $('#skip').html('Skip');

		                console.log('skipped successfully');
		            },
		            error: function () {
		                $('#skip').html('Failed');
		                setTimeout(function () {
		                    $('#skip').html('Skip');
		                }, 1000);
		            }
		        });
		    });
		}


		this.like = function () {
		    if (!this.currentSong)
		        throw "No current song";

		    this.checkin(true, function () {

		        $('#like').html('Liking...');

		        $.ajax({
		            url: 'http://wejay.org/Room/vote',
		            data: {
		                mbId: self.currentSong.SpotifyId,
		                value: 5
		            },
		            dataType: 'json',
		            type: 'POST',
		            traditional: true,
		            success: function (result) {
		                $('#like').html('Like');

		                console.log('liked successfully');
		            },
		            error: function () {
		                $('#like').html('Failed');
		                setTimeout(function () {
		                    $('#like').html('Like');
		                }, 1000);
		            }
		        });
		    });
		}

		this.block = function () {
		    if (!this.currentSong)
		        throw "No current song";

		    this.checkin(true, function () {

		        $('#block').html('Blocking...');

		        $.ajax({
		            url: 'http://wejay.org/Room/vote',
		            data: {
		                mbId: self.currentSong.SpotifyId,
		                value: 1
		            },
		            dataType: 'json',
		            type: 'POST',
		            traditional: true,
		            success: function (result) {
		                $('#block').html('Block');

		                console.log('liked successfully');
		            },
		            error: function () {
		                $('#block').html('Failed');
		                setTimeout(function () {
		                    $('#block').html('Block');
		                }, 1000);
		            }
		        });
		    });
		}


		this.init = function (roomName, anonymous) {
		    console.log('init');

		    if (!roomName)
		        throw "Room name must be specified"
		    /*if (!room) // if no room was specified, go back to the starting page
		    {
		    document.location = '#/0';
		    return;
		    }*/

		    // document.location = 'spotify:app:Wejay:room:' + room;
		    this.roomName = unescape(roomName).trim().toLowerCase();

		    this.clearCurrentSong();

		    //this.stop();

		    $("#roomLink").val('http://wejay.org/' + encodeURI(this.roomName));
		    $("#roomLink").bind('click', function () { this.select(); });
		    //$("#roomLink").html('spotify:app:Wejay:room:' + room);

		    $("#shareFacebook").attr('href', "http://www.facebook.com/sharer.php?u={0}&t={1}".format($("#roomLink").val(), this.roomName.toUpperCase() + " WEJAY ROOM on Spotify. Join this room and control the music together. We are the DJ."));


		    // start listening to commands from node server
		    //this.hub.checkin();


		    localStorage.setItem('room', this.roomName);

		    if (!anonymous && !app.user.accessToken)
		        app.user.authenticate(function () {
		            this.hub.checkin({ user: app.user.userName, room: this.roomName });
		            self.updateUsers();
		            self.updatePlaylist();
		        });
		    else {
		        this.hub.checkin({ user: "Anonymous", room: this.roomName });
		        self.updateUsers();
		        self.updatePlaylist();
		    }
		}	
            
		
// checkin the current user to wejay
		this.checkin = function(force, callback)
		{
			//if (!room || !user || !facebookId )
			//	throw "You have not set room and user or facebook details yet";
			var self = this;
			
			if (!force && (self.lastCheckin && self.lastCheckin.getTime() > new Date().getTime() - 30*60*1000))
			{
				callback(self.roomName);
				return;				
			}
							
			$.ajax({
		        url: 'http://wejay.org/Room/checkin',
		        data: { userName: escape(app.user.userName), facebookId: app.user.facebookId, room: self.roomName },
		        dataType: 'json',
		        type: 'POST',
		        traditional: true,
		        success: function (result) {
		        	self.lastCheckin = new Date();
		        	
		        	//self.init(result.room); // save the last connected room for this user
		        								        		
		            if (callback)
		                callback(self.roomName);
		                
		            console.log(app.user.userName + ' logged in to wejay room ', self.roomName);
		
		            //self.hub.checkin({ user: user, room: self.roomName });
		        }
		    });
			
		}


		


		// Update playlist ul
		this.updatePlaylist = function () {
		    console.log('updating queue...');

		    $.ajax({
		        url: 'http://wejay.org/Room/Playlist?room=' + self.roomName,
		        type: 'GET',
		        processData: false,
		        contentType: 'application/json',
		        dataType: 'text',
		        error: function (e) {
		            console.log('Error updating queue', e);
		        },
		        success: function (r) {

		            var result = r ? JSON.parse(r).Playlist : [];
		            var playlistUri = localStorage.getItem('playlistUri');

		            var pl = new m.Playlist();

		            result = result.filter(function (song) {
		                return song.SpotifyId;
		            })
                    
		            if (result.length > 0) {
		                $('#queue').html($("#queueTemplate").tmpl(result));
		            }
		            else {
		                $('#queue').html('<tr><td>QUEUE IS EMPTY, ADD TRACKS BELOW</td></tr>');
		                $("#currentSong").html('Drag tracks here to start the room');
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
                	
                	result = result.filter(function(user){return user.FacebookId && user.FacebookId != "null";});
                	
                	if (result.length > 0)
	                	$('#users').html($("#usersTemplate").tmpl(result));
	                else
	                	$('#users').html('<li>NO WEJAYS HERE. ADD MUSIC TO START THE ROOM.</li>');
                }
            });	
			
		}
	

		this.hub = new Hub(nodeUrl, self, facebookId);
	
		if (this.roomName)
			this.init(roomName, true); // default is anonymous
		

  
	}


    /*
	Array.prototype.next = function () {
	    if (this.finishedCount === undefined)
	        this.finishedCount == 0;

	    this.finishedCount++;

	    if (this.finishedCount >= this.length)
	        this.complete(this);
	};

	Array.prototype.complete = function (callback) {
	    if (this.finishedCount !== undefined && this.finishedCount >= this.length)
	        callback();
	    else
	        this.complete = callback;
	};

	Array.prototype.amap = function (item, next) {
	    if (this.next !== undefined)
	        next = this.next;

	    return Array.prototype.map.call(this, item, next);
	};

	['one', 'two', 'three'].amap(function (number, next) {
	    setTimeout(function () {
	        console.log(number);
	        console.log(next);
	        next();
	    }, 100);
	}).complete(function () {
	    console.log('complete');
	});
    */