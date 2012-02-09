/**
 * @author Sriram Raman <sri@spotify.com>
 */

/* This file provides the autocomplete functionality for artist/track name.
   It's largely code copied from profile page, which provides a similar functionality.
   This code is expected to be replaced once the framework provides the same feature. */

var dom = sp.require('sp://import/scripts/dom'),
    lang = sp.require("sp://import/scripts/language"),
    r = sp.require("sp://import/scripts/react");

var catalog = lang.loadCatalog("cef_views");
var _ = partial(lang.getString, catalog, "Radio");

var tokenInput = new TokenInput("uris"),
    lastSearch,
    allowedLinkTypes = [//1,  artist
			4]; // track

// Some interesting events
var keyDowns = r.fromDOMEvent(window, "keydown");
var escapes = r.filter(function(e) {
		return 27 === e.keyCode;
	}, keyDowns);

var enters = r.filter(function(e) {
		return 13 === e.keyCode;
	}, keyDowns);

var arrowDowns = r.filter(function(e) {
		return 40 === e.keyCode;
	}, keyDowns);

var arrowUps = r.filter(function(e) {
		return 38 === e.keyCode;
	}, keyDowns);

function Token(value, text, tokenInput) {
	var t = this;
	t.value = value;
	t.node = document.createElement("div");
	t.contentNode = t.node.cloneNode();
	t.removeNode = t.node.cloneNode();
	t.node.className = "token";
	t.removeNode.className = "remove";
	t.node.appendChild(t.contentNode);
	t.node.appendChild(t.removeNode);
	t.setText(text);
	r.fromDOMEvent(this.removeNode, "click").subscribe(function(e) {
		tokenInput.removeToken();
	});
}

Token.prototype.remove = function() {
	this.node.parentNode.removeChild(this.node);
};

Token.prototype.setText = function(text) {
	this.contentNode.textContent = text;
};


// Input control with token thingies
function TokenInput() {
	var ti = this;
	ti.tokens = [];
	ti.input = document.createElement("input");
	ti.node = document.createElement("div");
	ti.node.className = "input token-input";
	ti.node.appendChild(ti.input);

	var inputs = r.fromDOMEvent(ti.input, "input");
	var linkEntered = r.filter(function(e) {
		ti.tokenize();
	}, inputs);

	var backspacePressed = r.filter(function(e) { return 8 === e.keyCode; },
		r.fromDOMEvent(ti.input, "keydown"));

	var atStartOfInput = r.filter(function(e) {
		return 0 === e.currentTarget.selectionStart &&
			0 === e.currentTarget.selectionEnd;
	}, backspacePressed);

	linkEntered.subscribe(function(e) {
		ti.tokenize();
	});

	r.fromDOMEvent(ti.input, "focus").subscribe(function(e) {
		ti.node.classList.add("focus");
	});

	r.fromDOMEvent(ti.input, "blur").subscribe(function(e) {
		ti.node.classList.remove("focus");
	});

	atStartOfInput.subscribe(function(e) {
		ti.removeToken();
	});
}

TokenInput.prototype.tokenize = function() {
	var ti = this;
	if (-1 !== allowedLinkTypes.indexOf(sp.core.getLinkType(ti.input.value)) &&
		ti.tokens.length === 0) {
		console.log('calling back')
        ti.callback();
        ti.clear();
	}
	return ti;
};

TokenInput.prototype.addToken = function() {
	var ti = this;
	var val = ti.input.value;
	var token = new Token(val, val, ti);
	ti.tokens.push(token);
	ti.node.insertBefore(token.node, ti.input);
	ti.input.value = "";
	sp.core.getMetadata(val, {
		onSuccess: function(md) {
			token.setText(md.name);
		},
		onFailure: function() {
			console.log("getMetadata fail.");
		}
	});
};

TokenInput.prototype.removeToken = function() {
	var ti = this;
	if (0 < ti.tokens.length) {
		ti.tokens.pop().remove();
        window.alert("click");
	}
	if (0 === ti.tokens.length) {
		ti.enable();
		ti.input.select();
	}
};

TokenInput.prototype.clear = function() {
	var ti = this;
	while (ti.tokens.length) {
		ti.removeToken();
	}
    ti.input.value = "";
	return ti;
};

TokenInput.prototype.disable = function() {
	this.input.disabled = true;
	return this;
};

TokenInput.prototype.enable = function() {
	this.input.disabled = false;
	return this;
};


function setupAutoComplete(tokenInput, callbackFunction) {
	var input = tokenInput.input;
    tokenInput.callback = callbackFunction;
	var outputElement = document.createElement("div");
	outputElement.tabIndex = 1;
	outputElement.classList.add("auto-complete");
	r.fromDOMEvent(outputElement, "click")
		.subscribe(function(ev) {
		ev.preventDefault();
		ev.currentTarget.classList.remove("show");
		var a = ev.target;
		while (a) {
			if (a.tagName === "A") {
				tokenInput.input.value = a.href;
				tokenInput.tokenize();
				return;
			}
			a = a.parentNode;
			if (a === ev.currentTarget) { return; }
		}
	});

	r.switch(r.fromDOMEvent(input, "focus"), function(e) {
		return r.takeUntil(r.fromDOMEvent(input, "blur"), escapes);
	}).subscribe(function(e) {
		outputElement.classList.remove("show");
	});

	// Keyboard nav
	var focus = r.fromDOMEvent(input, "focusin");
	var blur = r.fromDOMEvent(tokenInput.node, "focusout");
	r.switch(focus, function(e) {
		return r.takeUntil(blur, escapes);
	}).subscribe(function(e) {
		// Ugly hack to catch clicks
		setTimeout(function() {
			outputElement.classList.remove("show");
		}, 100);
	});

	r.switch(focus, function(e) {
		return r.takeUntil(blur, r.merge(arrowUps, arrowDowns));
	}).subscribe(function(e) {
		var links = dom.query("a", outputElement);
		var currentLink = dom.queryOne("a.selected", outputElement);
		var nextLink;
		var dir = 40 === e.keyCode ? 1 : -1;
		if (!currentLink) {
			nextLink = dom.query("a", outputElement).slice(1 === dir ? 0 : dir)[0];
		} else {
			nextLink = links[links.indexOf(currentLink) + dir];
		}
		if (currentLink && nextLink) {
			currentLink.classList.remove("selected");
		}
		if (nextLink) {
			nextLink.classList.add("selected");
		}
	});

	r.switch(focus, function(e) {
		return r.takeUntil(blur, enters);
	}).subscribe(function(e) {
		e.preventDefault();
		function start(currentLink) {
			 //tokenInput.input.value = currentLink;
			 tokenInput.tokenize();
			// outputElement.classList.remove("show");
		}
		var currentLink = dom.queryOne("a.selected", outputElement);
		if (currentLink) {
			start(currentLink);
			return;
		}
		if (e.target === tokenInput.input) {
			var currentLinks = dom.query("a", outputElement);
			for (var i=0; i<currentLinks.length; i++) {
				var currentLink = currentLinks[i];
				var children = currentLink.childNodes;
				var lastChild = children[children.length - 1];
				if (lastChild.nodeType === 3) {
					// track
					var linkText = lastChild.nodeValue;
				} else {
					// artist
					var linkText = lastChild.childNodes[0].nodeValue;
				}
				var linkText = linkText.toLowerCase().replace(/^\s*/, "").replace(/\s*$/, "");
				var inputText = tokenInput.input.value.toLowerCase().replace(/^\s*/, "").replace(/\s*$/, "");
				if (linkText == inputText) {
					start(currentLink);
					return;
				}
			}
		}
	});
	dom.adopt(tokenInput.node, outputElement);
	return outputElement;
}


function autoComplete(handler, defaultResultGetter, event) {
	var searchString = event.target.value;
	lastSearch = searchString;

	if (searchString.trim()) {
		sp.core.suggestSearch(searchString, {
			onSuccess: function(result) {
				if (lastSearch === searchString) {
					handler(limitResults(result), true);
				} else {
					console.log("NO U", lastSearch, searchString);
				}
			}
		});
		sp.core.search(searchString + "*", {
			onSuccess: function(result) {
				if (lastSearch === searchString) {
					handler(limitResults(result), false);
				} else {
					console.log("NO U", lastSearch, searchString);
				}
			}
		});
	} else {
		var result = defaultResultGetter();
		var limitedResult = limitResults(result);
		handler(limitedResult, true);
	}
}

// Gross
function limit(max, results) {
	var i = 0;
	var ret = { tracks: [], artists: [] };
	var numTracks, numArtists;
	var halfMax = max / 2;
	if (results.tracks.length >= halfMax ) {
		if (results.artists.length >= halfMax ) {
			numTracks = Math.ceil(halfMax);
			numArtists = max - numTracks;
		} else {
			numArtists = results.artists.length;
			numTracks = Math.min(max - numArtists, results.tracks.length);
		}
	} else {
		numTracks = results.tracks.length;
		if (results.artists.length >= halfMax ) {
			numArtists = Math.min(max - numTracks, results.artists.length);
		} else {
			numArtists = results.artists.length;
		}
	}

	for (var i=0;i<numTracks;i++) {
		ret.tracks.push(results.tracks[i]);
	}
	for (var i=0;i<numArtists;i++) {
		ret.artists.push(results.artists[i]);
	}
	return ret;
}

var limitResults = partial(limit, 6);

function searchResultHandler(tokenInput, outputElement, result, fromSuggest) {
    // If the search didn't come from the auto-suggest and we have no results,
    // leave the last results up (which will be from the auto-suggest)
    // This is from stopping for example 'manowa' from first showing 'manowar'
    // briefly when the auto-suggest search is used, to finding nothing
    // when regular search is used.
    if (!fromSuggest && result.artists.length == 0 && result.tracks.length == 0)
        return;
	if (null === result || (0 === result.tracks.length &&
			0 === result.artists.length)) {
		outputElement.classList.remove("show");
		return;
	}
	outputElement.classList.add("show");
	outputElement.innerHTML = resultToHtml(result);
}

function resultToHtml(result) {
	var tracks = "", artists = "",
		localFilter = function(track) {
			return track.uri.search("spotify:local") === -1;
		},
		trackFunc = function(track) {
			return lang.format("<a href=\"{0}\">{1}{2}</a>", track.uri,
				(track.album.cover ? lang.format("<img src=\"{0}\">", track.album.cover) : ""),
				"<strong>" + track.artists[0].name + "</strong> " + track.name);
		},
		artistFunc = function(artist) {
			return lang.format("<a href=\"{0}\">{1}{2}</a>", artist.uri,
				(artist.portrait ? lang.format("<img src=\"{0}\">", artist.portrait) : ""),
				"<strong>" + artist.name + "</strong>");
		};
		
	if (result.tracks.length) {
		var trackHtml = map(trackFunc, filter(localFilter, result.tracks)).join("");
		tracks = lang.format("<div class=\"tracks\"><span>{0}</span>{1}</div>", _("Tracks"), trackHtml);
	}
	if (result.artists.length) {
		var artistHtml = map(artistFunc, result.artists).join("");
		artists = lang.format("<div class=\"artists\"><span>{0}</span>{1}</div>", _("Artists"), artistHtml);

	}
	return lang.format("{0}{1}", artists, tracks);
}

/**
 * @param {function(...):*} f
 * @param {number} t
 * @return {function(...):*}
 */
function throttle(f, t) {
	var toID   = null;
	var prevTs = null;
	return function(/*args...*/) {
		var args = arguments;
		var ts = Date.now();
		var elapsed = ts - (prevTs || 0);
		if (toID) {
			clearTimeout(toID);
			toID = null;
		}
		if (elapsed >= t) {
			prevTs = ts;
			f.apply(f, args);
		} else {
			toID = setTimeout(function() {
				prevTs = ts;
				f.apply(f, args);
			}, t - elapsed);
		}
	}
};

exports = {
    autoComplete: autoComplete,
    setupAutoComplete: setupAutoComplete,
    tokenInput: tokenInput,
    searchResultHandler: searchResultHandler,
    throttle: throttle,
}
