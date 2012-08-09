function AutoCompleteForm () {

    var m = sp.require( "sp://import/scripts/api/models" ),
        v = sp.require( "sp://import/scripts/api/views" );

    this.init = function ( formQuery ) {
        var autocompleteForm = $( formQuery ),
            placeholder      = autocompleteForm.append( "<div class=\"input token-input\"><input type=\"text\"></input><div class=\"auto-complete\"><div class=\"tracks\"></div></div></div>" ),
            searchInput      = placeholder.find( "input:first" ),
            lastSearch       = "",
            handleInput      = function ( value ) {
                if ( lastSearch !== value ) {
                    var search = new m.Search( value );
                    $( ".tracks" ).html( "" );
                    $( ".tracks" ).show();
                    search.localResults = m.LOCALSEARCHRESULTS.APPEND;
                    search.searchAlbums = false;
                    search.searchArtists = false;
                    search.searchPlaylists = false;
                    search.pageSize = 15;
                    search.observe( m.EVENT.CHANGE, function () {
                        var results = search.tracks,
                            length  = ( results.length <= 15 ) ? results.length : 15;
                        if ( length !== 0 ) {
                            for ( var i = 0; i < length; i++ ) {
                                var res = results[ i ]
                                    , a = res.uri
                                    , title = res.name
                                    , cover = res.album.data.cover
                                    , artist = res.artists[ 0 ].name
                                    , string = "<a href=\"" + a + "\"><img src=\"" + cover + "\"><strong>" + artist + "</strong> " + title + "</a>"
                                    , availability = res.availability;
                                $( ".tracks" ).append( string );
                            }
                        } else {
                            $( ".tracks" ).hide();
                        }
                    });
                    search.appendNext();
                }
            },
            timer;
        searchInput.attr( "placeholder", "Add track to the queue" );
        searchInput.on( "keyup", function () {
            var value = $( this ).val();
            clearTimeout( timer );
            if ( value.length !== 0 ) {
                timer = setTimeout( function () { handleInput( value ); }, 500 );
            } else {
                $( ".tracks" ).hide();
            }
        });
        searchInput.on( "focus", function () {
            if ( $( ".tracks" ).find( "a" ).length === 0 ) {
                $( ".tracks" ).hide();
            }
        });
        searchInput.on( "blur", function () {
            lastSearch = $( this ).val();
        });
    }

}

// Finished setting up auto complete ---------------------------------------------------------
exports.init = new AutoCompleteForm().init;