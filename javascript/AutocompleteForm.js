function AutoCompleteForm (){

    var ui         = sp.require('sp://import/scripts/dnd'),
        m          = sp.require("sp://import/scripts/api/models"),
        v          = sp.require("sp://import/scripts/api/views"),
        r          = sp.require("sp://import/scripts/react"),
        kbd        = sp.require('sp://import/scripts/keyboard'),
        topTracks  = null,
        self       = this,
        topArtists = null;

    this.init = function (formQuery, topTracks, topArtists) {

        var ac  = sp.require('javascript/autocomplete'),
            dom = sp.require('sp://import/scripts/dom');

        // Set up autocomplete. ripped from radio.js - I hope it is OK. ---------------------------------------------------------
        var showingAutocomplete = false,
            autocompleteForm    = dom.queryOne(formQuery),
            searchInput         = ac.tokenInput.input,
            outputElement       = ac.setupAutoComplete(ac.tokenInput, function () {
                console.log("tokeninput",ac.tokenInput);
                var uri = searchInput.value;
                app.user.authenticate(function () {
                    app.currentRoom.addTrackUri(uri);
                    searchInput.focus();
                });
            });

        searchInput.type        = 'text';
        searchInput.placeholder = 'Add track to the queue';

        // Creating the method that runs the autocomplete search and updates the table.
        // Take some default methods defined in autocomplete.js and curry them
        var searchHandler = partial(ac.searchResultHandler, ac.tokenInput, outputElement),
            autocomplete  = partial(ac.autoComplete, searchHandler, function () { return { tracks: topTracks, artists: topArtists} });

        dom.adopt(autocompleteForm, ac.tokenInput.node);

        r.fromDOMEvent(searchInput, 'input').subscribe(ac.throttle(autocomplete, 500));
    }

}

// Finished setting up auto complete ---------------------------------------------------------
exports.init = new AutoCompleteForm().init;