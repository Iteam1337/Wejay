// main app logic for Wejay App
function App () {

    var self = this
      , sp   = getSpotifyApi( 1 )
      , ui   = sp.require( "sp://import/scripts/dnd" )
      , m    = sp.require( "sp://import/scripts/api/models" )
      , v    = sp.require( "sp://import/scripts/api/views" )
      , r    = sp.require( "sp://import/scripts/react" )
      , kbd  = sp.require( "sp://import/scripts/keyboard" )
      , accessToken
      , facebookId;

    //
    // Before anything begins loading - the application hinders users who are offline
    m.session.observe( m.EVENT.STATECHANGED, function () {
        if ( m.session.state >= 2 ) {
            $( "#offline" ).show();
            $( "#main" ).hide();
        } else {
            $( "#offline" ).hide();
            $( "#main" ).show();
        }
    });

    if ( m.session.state >= 2 ) {
        $( "#offline" ).show();
        $( "#main" ).hide();
    } else {
        $( "#offline" ).hide();
    }

    //
    // Global connection to node server
    var socket
      , nodeUrl = "http://81.201.221.135:5000";

    //
    // global Toplist
    var topTracks = []
      , topArtists = [];

    // public properties
    this.user               = new User();
    this.currentRoom        = null;
    this.isPlayingFromWejay = false;
    this.acceptedLogin      = false;
    this.bitlyName          = "ankjevelen";
    this.bitlyKey           = "R_147ec88bf32a7d569749440093523de6";

    /* Event handlers */
    if ( !m.application ) {
        alert("This version of Spotify is not compatible with this App. Please upgrade to a newer version and try again");
        history.back();
        return;
    }

    this.tabTo = function ( tab ) {
        if ( self.currentRoom && self.currentRoom.currentTab ) {
            self.currentRoom.currentTab = tab;
        }
        var currentTab = document.location = "#" + tab + "Section";
        $( "section" ).removeClass( "current" );
        $( currentTab ).addClass( "current" );
        $( currentTab ).parents( "section" ).addClass( "current" );
        $( currentTab ).children( "section" ).first().addClass( "current" );
        console.log( "tabTo =>", m.application.arguments, "this.user =>", self.user.facebookId );
        switch ( tab ) {
            case "choose":
                this.loadRooms();
                break;
            case "room":
                if ( m.application.arguments.length > 1 ) {
                    var newRoom = m.application.arguments[ 1 ].toLowerCase();
                    if ( self.currentRoom.roomName != newRoom ) {
                        console.log( "new room", newRoom );
                        self.currentRoom.init( unescape( newRoom ), true );
                    }
                } else {
                    if ( !self.currentRoom.roomName ) {
                        alert( "You have to select a room first" );
                    }
                }
                self.currentRoom.updatePlaylist();
                break;
            case "wejays":
                if ( !self.currentRoom.roomName ) {
                    alert( "You have to select a room first" );
                }
                break;
        }
    }
    //
    // tab switched in ui
    m.application.observe( m.EVENT.ARGUMENTSCHANGED, function () {
        var tab = m.application.arguments[ 0 ];
        self.tabTo( tab );
    });

    this.handleDroppedLinks = function ( links ) {
        console.log( "dropped", links );
        var droppedLinks = [];
        app.user.authenticate( function () {
            links.forEach( function ( link ) {
                var type = m.Link.getType( link );
                if ( m.Link.TYPE.PROFILE === type || m.Link.TYPE.FACEBOOK_USER === type ) {
                    console.log("this is currently not available");
                } else {
                    if ( m.Link.TYPE.TRACK === type ) {
                        //
                        // adding single track
                        self.currentRoom.addTrackUri(link);
                    } else if ( m.Link.TYPE.PLAYLIST === type ) {
                        //
                        // adding user generated playlist
                        var playlist = m.Playlist.fromURI( link )
                          , tracks = playlist.data.all();
                        console.log( "playlist: ", tracks );
                        tracks.forEach( function ( uri ) {
                            self.currentRoom.addTrackUri( uri );
                        });
                        self.currentRoom.updatePlaylist();
                        self.linkPlaylist( playlist );
                    } else if ( m.Link.TYPE.ALBUM === type ) {
                        //
                        // adding album
                        m.Album.fromURI( link, function ( album ) {
                            console.log( "album: ", album );
                            var albumLink = album.data.uri
                              , tracks = album.data.tracks;
                            tracks.forEach( function ( uri ) {
                                self.currentRoom.addTrackUri( uri.uri );
                            });
                        });
                    }
                }
            });
        });
    }

    //
    // listen to changes in a playlist and automatically add all new tracks added
    this.linkPlaylist = function ( playlist ) {
        var tracks = before = playlist.data.all();
        playlist.observe( m.EVENT.CHANGE, function ( changedPlaylist ) {
            console.log( "Found changes in playlist" );
            var after = changedPlaylist.data.all() // get tracks from playlist
              , newTracks = after.filter( function ( track ) {
                    return !before.some( function ( b ) { return b == track }); // only keep the tracks that wasn't there before == added
                 });
            if ( newTracks.length ) {
                app.user.authenticate( function () {
                    self.currentRoom.updatePlaylist();
                });
            }
            before = after; // update the history so we can understand next change
        });
    }

    // when links are dropped to the application we want to add those to the queue
    m.application.observe( m.EVENT.LINKSCHANGED, function () {
        var links = m.application.links;
        console.log( "dropped links", links );
        self.handleDroppedLinks( links );
    });

    /* helper functions */
    var getTracksFromPlaylist = function ( playlist ) {
        var result = [], i = 0
          , length = playlist.data.length;
        for ( ; i < length; i++ ) {
            var track = playlist.data.getTrack( i );
            if ( track ) {
                result.push( track );
            }
        }
        return result;
    };

    // load images in the room banner
    var fillRoomToplist = function ( room, div ) {
        $.ajax({
            url: "http://wejay.org/Room/GetOnlineUsers?room=" + encodeURI( room ),
            type: "GET",
            processData: false,
            contentType: "application/json",
            dataType: "text",
            success: function ( r ) {
                var result = r ? JSON.parse( r ).Data : [];
                result = result.sort( function ( user1, user2 ) {
                    return user1.CheckedIn-user2.CheckedIn;
                });
                result = result.slice( 0, 9 );
                $( div ).html( $( "#roomTopListTemplate" ).tmpl( result ) );
                $( div ).append( "<a>" + room + "</a>" );
            }
        });
    };

    // Load all rooms to startpage
    this.loadRooms = function () {
        if ( !app.user.facebookId ) {
            return;
        }
        app.user.loadFriends( function ( users ) {
            users.push( app.user.facebookId ); // add current user as well
            $.ajax({
                url: "http://wejay.org/room/GetRoomsForUsers",
                traditional: true,
                dataType: "json",
                data: {
                    facebookIds: users
                },
                type: "POST",
                success: function ( r ) {
                    console.log( "loadRooms // app.user.loadFriends()", r );
                    r = r.filter( function ( i ) { return i.Name && i.Name.toLowerCase() != "null" })
                    $( "#rooms" ).html( $( "#roomListTemplate" ).tmpl( r ) );
                    self.fillRooms();
                }
            });
        });
    }

    this.fillRooms = function () {
        $( ".rooms li" ).each( function () {
            var room = this.innerText;
            fillRoomToplist( room, this );
            $( this ).click( function () {
                document.location = "spotify:app:wejay:room:" + room;
            })
        });
    }

    this.standardCopyLoggedOut = "I understand that by logging in with my Facebook account I enable WEJAY to use and store information from my Spotify library and listening history. This is done to provide a great listening experience.";

    /* INIT */
    // init function
    this.init = function ( version ) {

        this.version = version;
        console.log( "ready" );

        var checkIfUserAcceptedAgreement = function () {
            var accepted = false;
            if ( self.acceptedLogin ) {
                accepted = true;
            } else {
                $( ".disclaimer" ).show();
            }
            return accepted;
        };

        var acceptedLogin = ( localStorage.acceptedLogin ) ? localStorage.acceptedLogin : false;

        if ( acceptedLogin === "true" ) {
            self.acceptedLogin = true;
        } else {
            //
            // if the user has not accepted the disclaimer -- he/she will be reverted to the
            // "open a room"-section. Also, the standardroom will be the iteam-room.
            $( ".disclaimer:first" ).hide();
            $( "#disclaimerLoginOriginal" ).hide();
            if ( localStorage.room === undefined ) {
                localStorage.room = "iteam";
            }
            document.location = "spotify:app:wejay:choose";
        }

        if ( app.user.accessToken ) {
            this.loadRooms();
        }

        var ac = sp.require( "javascript/AutocompleteForm" );
        ac.init( ".auto-completeForm" );

        //
        // when switching rooms -- the app should not autostart the music ...
        self.isPlayingFromWejay = false;
        $( "#start" ).removeClass( "pause" );
        $( "#onair" ).hide();

        var userLogoutShow = function () {
            $( "#login" ).hide();
            $( "#roomLogin" ).hide();
            $( "#logout" ).show();
            $( "#roomLogout" ).show();
        };

        var userLogoutHide = function () {
            $( "#login" ).show();
            $( "#roomLogin" ).show();
            $( "#logout" ).hide();
            $( "#roomLogout" ).hide();
            $( "#disclaimerLoginOriginal p" ).html( self.standardCopyLoggedOut );
        };



        $( "#logout, #roomLogout" ).on( "click", function () {
            self.user.logout();
            userLogoutHide();
        });

        $( "#login, #roomLogin" ).on( "click", function () {
            if ( checkIfUserAcceptedAgreement() ) {
                self.user.authenticate( function ( room ) {
                    $( "#disclaimerLoginOriginal p" ).html( "Hi there " + app.user.userName + ", you are currently logged in to the room <a href=\"spotify:app:wejay:room:" + room +"\">" + room + "</a>" );
                    self.loadRooms();
                    userLogoutShow();
                });
            }
        });

        $( "#roomSection" ).on( "drop", function ( e ) {
            e.preventDefault();
            var id = event.dataTransfer.getData( "text" );
            console.log( "dropped to section ", id );
            if ( checkIfUserAcceptedAgreement() ) {
                self.handleDroppedLinks( [ id ] );
            }
        });

        $( "#roomName" ).on( "focus", function ( e ) {
            $( "form.input" ).addClass( "focus" );
        });

        $( "#roomName" ).on( "blur", function ( e ) {
            $( "form.input" ).removeClass( "focus" );
        });

        $( "#roomSection" ).on( "dragenter", function ( e ) {
            e.preventDefault();
            return true;
        });

        $( "#roomSection" ).on( "dragover", function ( e ) {
            return false;
        });

        $( "#shareOnURL" ).on( "click", function ( e ) {
            $( "#manualShare" ).toggleClass( "hide" );
            var value = ( $( "#shareOnURL" ).text() === "Share URL" ) ? "Hide url share" : "Share URL";
            $( "#shareURL" ).val(  self.currentRoom.shareURL );
            $( "#shareOnURL" ).text( value );
        });

        //
        // share popup
        $( "#share" ).on( "click", function ( e ) {
            e.preventDefault();
            if ( checkIfUserAcceptedAgreement() ) {
                $( "#sharePopup" ).toggleClass( "show" );
            }
        });

        $( "#closeShare" ).on( "click", function () {
            $( "#sharePopup" ).removeClass( "show" );
        });

        $( "#roomSelect" ).on( "submit", function ( e ) {
          e.preventDefault();
          var newRoomName = $( "#roomName" ).val().toLowerCase();
          if ( /^([a-zåäöøæ0-9\_\-\ ]){3,15}$/.exec( newRoomName ) ) {
            newRoomName = newRoomName.replace( /([åäæ])|([öø])/ig, function( str ) {
              var arg = arguments
              return ( arg[1] ) ? "a" : "o";
            });
            app.currentRoom.init( newRoomName, true );
            document.location = 'spotify:app:wejay:room';
          } else {
            alert( "Something went wrong with the roomname" );
          }
          return false;
        });


        $( document ).on( "click", "#userToplist a", function ( e ) {
            e.preventDefault();
            if ( checkIfUserAcceptedAgreement() ) {
                var link = $( this ).attr( "href" );
                self.currentRoom.addTrackUri( link );
            }
        });

        $( document ).on( "click", ".tracks a", function ( e ) {
            e.preventDefault();
            var link = $( this ).attr( "href" );
            if ( checkIfUserAcceptedAgreement() ) {
                self.currentRoom.addTrackUri( link );
            }
            $( ".auto-complete" ).removeClass( "show" );
        });

        //
        // one way to correct the auto-completeForm show/hide-function
        $( "body" ).on( "click", function ( e ) {
            var parentClass = $( e.target ).parent().parent().hasClass( "auto-completeForm" );
            if ( $( ".auto-complete" ).hasClass( "show" ) ) {
                if ( !parentClass ) {
                    $( ".auto-complete" ).removeClass( "show" );
                }
            } else {
                if ( parentClass ) {
                    $( ".auto-complete" ).addClass( "show" );
                }
            }
        });

        $( document ).on( "click", "#queue li .star", function () {
            var element = $( this )
              , CurrentClass = element.attr( "class" ).match( /(no)+(\d){1}/ )
              , song = element.parent().find( ".track" ).attr( "href" )
              , SpotifyId = song.split( ":" )
              , length = SpotifyId.length - 1
              , CurrentClassNumber = parseInt( CurrentClass[ 2 ] );

            CurrentClass = CurrentClass[ 0 ];
            SpotifyId = SpotifyId[ length ];
            if ( checkIfUserAcceptedAgreement() ) {
                if ( ( CurrentClassNumber === 3 ) || ( CurrentClassNumber === 5 ) ) {
                    app.currentRoom.liveVote( SpotifyId, element, CurrentClassNumber );
                }
            }
        });


        var playApp = function () {
            app.isPlayingFromWejay = true;
            $( "#onair" ).show();
            $( "#start" ).addClass( "pause" );
            app.currentRoom.playSong( app.currentRoom.currentSong, true );
        },  pauseApp = function () {
            var player = sp.trackPlayer;
            app.isPlayingFromWejay = false;
            $( "#onair" ).hide();
            $( "#start" ).removeClass( "pause" );
            player.setIsPlaying( false );
        };

        //
        // bind space to play-pause
        $( document ).on( "keyup", function ( e ) {
            if ( e.target.nodeName !== "INPUT" && e.keyCode === 32 ) {
                e.preventDefault();
                if ( app.isPlayingFromWejay ) {
                    pauseApp();
                } else {
                    playApp();
                }
            }
        });

        $( "#start" ).on( "click", function () {
            //
            // If the user presses play -- then wejay should force-play each time the track changes
            if ( $( this ).hasClass( "pause" ) ) {
                pauseApp();
            } else {
                // wejay should play.
                playApp();
            }
        });


        //
        // initialize the disclaimer
        if ( self.acceptedLogin === false ) {
            $( "#login" ).attr( "disabled", true );
            $( ".disclaimer .checkbox" ).hover(
                function () {
                    var button = $( ".disclaimer.rooms .sp-button" );
                    $( "#login" ).attr( "disabled", false );
                    button.addClass( "hover" );
                }
                , function () {
                    var button = $( ".disclaimer.rooms .sp-button" );
                    $( "#login" ).attr( "disabled", true );
                    button.removeClass( "hover" );
                }
            );
            $( ".disclaimer .checkbox" ).click( function() {
                $( ".disclaimer" ).remove();
                $( "#login" ).attr( "disabled", false );
                localStorage.acceptedLogin = "true";
                $( "#disclaimerLoginOriginal" ).addClass( "disc" );
                $( "#disclaimerLoginOriginal" ).show();
                self.acceptedLogin = true;
            });
        } else {
            $( ".disclaimer" ).remove();
            $( ".disclaimerRooms" ).removeClass( "disclaimerRooms" );
        }

        $( "#like" ).on( "click", function () {
            if ( checkIfUserAcceptedAgreement() ) {
                app.currentRoom.like();
            }
        });
        $( "#block" ).on( "click", function () {
            if ( checkIfUserAcceptedAgreement() ) {
                app.currentRoom.block();
            }
        });
        $( "#skip" ).on( "click", function () {
            if ( checkIfUserAcceptedAgreement() ) {
                app.currentRoom.skip();
            }
        });

        userLogoutHide();

        // fill default rooms
        self.fillRooms();
        //
        // This generated a error before. Earlier the localStorage version of facebookUser was "[object Object]".
        // ... In the never version it's a stringified JSON-object.
        var roomName = localStorage.getItem( "room" )
          , localFacebookUser = localStorage.getItem( "facebookUser" );
        self.user.facebookUser = ( localFacebookUser === "[object Object]" ) ? "" : JSON.parse( localFacebookUser );

        if (self.user.facebookUser) {
            self.user.userName = self.user.facebookUser.name;
        }

        self.currentRoom = new RoomController( unescape( roomName ), nodeUrl );

        var tab = m.application.arguments[0];

        this.tabTo(tab);

        // Toplist
        var toplist = new m.Toplist();
        toplist.toplistType = m.TOPLISTTYPE.USER;
        toplist.matchType = m.TOPLISTMATCHES.TRACKS;
        toplist.userName = m.TOPLISTUSER_CURRENT;
        toplist.observe( m.EVENT.CHANGE, function () {
            var i = 0, max = 10;
            for ( ; i < max; i++ ) {
                $( "#userToplist" ).append( $( "#userToplistTemplate" ).tmpl( toplist.results[ i ] ) );
            }
        });
        toplist.run();
    };
}

String.prototype.format = function () {
    var formatted = this, i = 0
      , arg = arguments.length;
    for ( ; i < arg; i++ ) {
        var regexp = new RegExp( "\\{' + i + '\\}', 'gi" );
        formatted = formatted.replace( regexp, arguments[ i ] );
    }
    return formatted;
};