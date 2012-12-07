function slidein(that, object) {
    if (!that||!object) return;
    var popup = object.popup,
        holder = that.holder,
        height = (that.height * (that.popups.length));
    $(holder).height(height);

    object.timer = setTimeout(function () {
      slideout(that, object);
    }, that.timeout);

    $(holder).prepend(popup);
}

function slideout(that, object) {
    if (!that||!object) return;
    var id = "#" + object.popup.id;
    clearInterval(object.timer);
    that.popups.shift();
    var height = (that.height * (that.popups.length));
    $(that.holder).height(height);
    $(id).remove();
}

NOTIFIER = {
    count: 0,
    timeout: 5000,
    height: 60,
    popups: [],
    holder: null,
    create: function (msg) {
        if (this.holder === null) this.holder = document.getElementById("notifierHolder");
        var created = {
            popup: $("<div/>", { id: "notice" + this.count, "class": "inner", html: "<h1>!</h1><p class=\"info\">" + msg + "</p>" })[0],
            timer: {}
        };
        this.popups.push(created);
        this.count += 1;
        return created;
    },
    show: function (msg) {
        msg = msg ? msg.toString().replace('"', '\"') : ' ';
        var obj = this.create(msg);
        slidein(this, obj);
    },
    hide: function (obj) {
        obj = (obj) ? obj: this.popups[0];
        slideout(this, obj);
    },
    hideAll: function () {
      $("#notifierHolder .inner").remove();
      this.popups = [];
      $(this.holder).height(0);
    }
};

window.NOTIFIER = NOTIFIER;