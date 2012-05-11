

function AutoCompleteForm (){
	
	var ui = sp.require('sp://import/scripts/dnd');			  
	var m = sp.require("sp://import/scripts/api/models");
	var v = sp.require("sp://import/scripts/api/views");
    var r = sp.require("sp://import/scripts/react");
	var kbd = sp.require('sp://import/scripts/keyboard');
	
	var topTracks = null;
	var self = this;
	var topArtists = null;


	this.init = function (formQuery, topTracks, topArtists) {

	    var ac = sp.require('javascript/autocomplete');

	    var dom = sp.require('sp://import/scripts/dom');

	    // Set up autocomplete. ripped from radio.js - I hope it is OK. ---------------------------------------------------------

	    var showingAutocomplete = false;
	    var autocompleteForm = dom.queryOne(formQuery),
			searchInput = ac.tokenInput.input,
			outputElement = ac.setupAutoComplete(ac.tokenInput, function () {
			    console.log("tokeninput",ac.tokenInput);
			    //loadStation(searchInput.value, "spotify:app:radio", "", "search", true);
			    //hideAutocomplete();
			    var uri = searchInput.value;
			    app.user.authenticate(function () {
			        app.currentRoom.addTrackUri(uri);
			        searchInput.focus();
			    });
			});


	    searchInput.type = 'text';
	    searchInput.placeholder = 'Add track to the queue';

	    // Creating the method that runs the autocomplete search and updates the table.
	    // Take some default methods defined in autocomplete.js and curry them
	    var searchHandler = partial(ac.searchResultHandler, ac.tokenInput, outputElement);
	    var autocomplete = partial(ac.autoComplete, searchHandler, function () { return { tracks: topTracks, artists: topArtists} });


	    dom.adopt(autocompleteForm, ac.tokenInput.node);

	    r.fromDOMEvent(searchInput, 'input').subscribe(ac.throttle(autocomplete, 500));

	    // fill the top tracks for this user
	    self.loadTopTracks(function (userTopTracks) {
	        console.log("userTopTracks =>", userTopTracks);
	        topTracks = userTopTracks;
	    });
	}

	this.loadTopTracks = function (callback) {
	    console.log(topTracks);
	    var userName = null; // null means current user
	    sp.social.getToplist('track', 'user', userName, {
	        onSuccess: function (r) {
	            topTracks = r.tracks;
	            if (callback) {
	                callback(topTracks);
	            }
	        }
	    });
	}
}

	
		// Finished setting up auto complete ---------------------------------------------------------
				
exports.init = new AutoCompleteForm().init;
		