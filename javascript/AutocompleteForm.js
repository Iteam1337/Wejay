function AutoCompleteForm() {

    var m = sp.require("sp://import/scripts/api/models"),
        v = sp.require("sp://import/scripts/api/views");

    this.init = function (formQuery) {
        var autocompleteForm = $(formQuery),
            placeholder = autocompleteForm.append("<div class=\"input token-input\"><input type=\"text\"></input><div class=\"auto-complete\"><div class=\"tracks\"></div></div></div>"),
            searchInput = placeholder.find("input:first"),
            lastSearch = "",
            timer;
        function handleInput(value) {
            if (lastSearch !== value) {
                var search = new m.Search(value);
                $(".tracks").html("");
                $(".tracks").show();
                search.localResults = m.LOCALSEARCHRESULTS.APPEND;
                search.searchAlbums = false;
                search.searchArtists = false;
                search.searchPlaylists = false;
                search.pageSize = 15;
                search.observe(m.EVENT.CHANGE, function () {
                    var results = search.tracks,
                        length = (results.length <= 15) ? results.length : 15;
                    if (length !== 0) {
                        for (var i = 0; i < length; i++) {
                            var res = results[i],
                                a = res.uri,
                                title = res.name,
                                cover = res.album.data.cover,
                                artist = res.artists[0].name,
                                string = "<a href=\"" + a + "\"><img src=\"" + cover + "\"><strong>" + artist + "</strong> " + title + "</a>",
                                availability = res.availability;
                            $(".tracks").append(string);
                        }
                    } else {
                        $(".tracks").hide();
                    }
                });
                search.appendNext();
            }
            lastSearch = value;
        }
        searchInput.attr("placeholder", "Add track to the queue");
        searchInput.on("keydown", function (e) {
            var key = e.keyCode,
                hidden = !$(".auto-complete").hasClass("show");
            if (key === 40 || key === 38) {
                e.preventDefault();
                if (hidden) $(".auto-complete").addClass("show");
                var holder = $(".tracks"),
                    track = holder.find("a.active");
                if (!track.length) {
                    $(".tracks a:first").addClass("active");
                } else {
                    var next = (key === 40) ? track.next() : track.prev();
                    if (next.length) {
                        $(".tracks a.active").removeClass("active");
                        next.addClass("active");
                    }
                }
            }
            if (key === 13) {
                e.preventDefault();
                var track = $(".tracks a.active");
                if (track.length && !hidden) track.trigger("click");
            }
        });
        searchInput.on("keyup", function () {
            var value = $(this).val();
            clearTimeout(timer);
            if (value.length !== 0) {
                timer = setTimeout(function () { handleInput(value); }, 500);
            } else {
                $(".tracks").hide();
            }
        });
        $(".tracks").on("mouseover", function (e) {
            var current = e.target,
                node = current.nodeName.toLowerCase();
            if (node === "div") {
                return;
            }
            if (node === "strong" || node === "img") {
                current = current.parentNode;
            }
            $(".tracks a.active").removeClass("active");
            $(current).addClass("active");
        });
        searchInput.on("focus", function () {
            if ($(".tracks").find("a").length === 0) {
                $(".tracks").hide();
            }
        });
        searchInput.on("blur", function () {
            $(".tracks a.active").removeClass("active");
            lastSearch = $(this).val();
        });
    }

}

// Finished setting up auto complete ---------------------------------------------------------
exports.init = new AutoCompleteForm().init;