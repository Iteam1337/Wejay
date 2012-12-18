function SongCtrl($scope) {
    var songs = [
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Lethal Injection', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 1, class: '' },
        { img: 'scarface.jpg', title: 'Ron adds', song: 'Scarface - No Tears', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 4, class: '' },
        { img: 'gangsta.jpg', title: 'Michael adds', song: 'Geto Boys - Damn It Feels Good to Be a Gangsta', desc: 'Michael\'s track will be mixed in between Ron\'s.', userImg: 'michael.jpg', user: 'Michael', queue: 3, class: '' },
        { img: 'sv.jpg', title: 'Samir adds', song: 'Slum Village - Get Dis Money', desc: 'Samir is a sporadic user. His song will have priority over Michael\'s.', userImg: 'samir.jpg', user: 'Samir', queue: 2, class: '' },
        { img: 'prado.jpg', title: 'Milton adds', song: 'Perez Prado - Mambo #8', desc: 'But the song is blocked by Samir', userImg: 'milton.jpg', user: 'Ron', queue: 5, class: 'blocked'}];

    $scope.songs = songs;
}

function QueueCtrl($scope) {
    var queues = [
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - The Shot (Intro)', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 1, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Really Doe', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 4, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Ghetto Bird', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 5, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - You Know How We Do It', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 6, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Cave Bitch', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 7, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Bop Gun (One Nation)', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 8, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - What Can I Do?', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 9, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Lil Ass Gee', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 10, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Make It Ruff, Make It Smooth', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 11, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Down For Whatever', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 12, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - Enemy', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 13, class: '', queueID: 1 },
        { img: 'icecube.jpg', title: 'Ron adds an album', song: 'Ice Cube - When I Get to Heaven', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 14, class: '', queueID: 1 },
        { img: 'scarface.jpg', title: 'Ron adds', song: 'Scarface - No Tears', desc: '', userImg: 'ron.jpg', user: 'Ron', queue: 15, class: '', queueID: 4 },
        { img: 'gangsta.jpg', title: 'Michael adds', song: 'Geto Boys - Damn It Feels Good to Be a Gangsta', desc: 'Michael\'s track will be mixed in between Ron\'s.', userImg: 'michael.jpg', user: 'Michael', queue: 3, class: '', queueID: 3 },
        { img: 'sv.jpg', title: 'Samir adds', song: 'Slum Village - Get Dis Money', desc: 'Samir is a sporadic user. His song will have priority over Michael.', userImg: 'samir.jpg', user: 'Samir', queue: 2, class: '', queueID: 2 },
        { img: 'prado.jpg', title: 'Milton adds', song: 'Perez Prado - Mambo #8', desc: 'But the song is blocked by Samir', userImg: 'milton.jpg', user: 'Milton', queue: 16, class: 'blocked', queueID: 5}];

    $scope.queues = queues.sort(function (a, b) {
        return a.queue - b.queue;
    });
}

var tutorial = angular.module('tutorial', []);

// Add song list
tutorial.directive('ngFade', function () {
    return {
        restrict: 'E',
        replace: true,
        scope: true,
        template: '<div  ng-repeat="song in songs"><div id="fadeIn{{song.queue}}" class="tutAdd"><div class="image"><img ng-src="images/covers/{{song.img}}" /></div><div class="songDesc"><img ng-src="images/portrait/{{song.userImg}}" class="userImg"><h3>{{song.title}}</h3><p>{{song.song}}</p><div class="desc">{{song.desc}}</div></div></div></div>'
    };
})

// Build queue list
tutorial.directive('ngQueue', function () {
    return {
        restrict: 'E',
        replace: true,
        scope: true,
        template: '<div id="tutInner"><h3>Current queue <span id="queueLength">(0)</span></h3><ul><li ng-repeat="queue in queues" class="tutQueue {{queue.class}} queuefadeIn{{queue.queueID}}"><img ng-src="images/covers/{{queue.img}}" class="queueImg">{{queue.song}}<div class="addedBy">{{queue.user}}</div></li></ul></div>'
    };
});

// Remove from queue on fade out
$(window).scroll(function () {
    $('#tutorial .open').each(function () {
        if ($(this).css('opacity') < 1) {
            $('.queue' + $(this).attr('id')).removeClass('open').fadeOut();
            $('#queueLength').html('(' + $('#tutQueue .open').length + ')');
        }
    });
});

$('#tutClose').click(function () {
    $('#tutorialWrap').fadeOut();
});