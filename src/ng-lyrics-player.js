'use strict';

var ngLyricsPlayer = angular.module('ngLyricsPlayer', []);
var resolve = require('soundcloud-resolve-jsonp');
var Player = require('audio-player');
var hhmmss = require('hhmmss');

ngLyricsPlayer.directive('ngLyricsPlayer', ['$timeout', 'ngLyricsPlayerConfig', function($timeout, ngLyricsPlayerConfig) {

  var client_id = ngLyricsPlayerConfig.clientId;
  var player = new Player();

  return {
    restrict: 'EA',
    transclude: true,
    scope: {
      lyricsUrl: "@"
      // mediaSrc: "@"
    },
    templateUrl: 'assets/app/templates/lyrics-player-template.html',
    controller: ['$scope', '$http', function($scope, $http) {
        $scope.lyricsLines = [];
        $scope.artist = "";
        $scope.title = "";
        
        $scope.fetchLyrics = function (lyricsUrl) {
          $http.get(lyricsUrl)
              .then(function (response) {
                  if(response.status == 200) {
                      $scope.lyricsLines = response.data.Lyrics;
                      $scope.title = response.data.Title;
                      $scope.artist = response.data.Artist;
                  }
                  
              },
              function (err) {
                  console.error(err);
              });
        };
    }],
    link: function($scope, $elem, $attrs) {
      
      var isScolling = false;
      var currentIndex = 0;

      var src = $attrs.ngLyricsPlayer;
      $scope.player = player;
      $scope.audio = player.audio;
      $scope.currentTime = 0;
      $scope.duration = 0;
      $scope.track = false;
      $scope.index = 0;
      $scope.playlist;
      $scope.tracks = [];

      
      if (!client_id) {
        var message = [
          'You must provide a client_id for Angular Lyrics Player',
          '',
          'Example:',
          "var app = angular.module('app', ['ngLyricsPlayer'])",
          "  .config(function(ngLyricsPlayerConfig){",
          "    ngLyricsPlayerConfig.clientId = '[CLIENT_ID]';",
          "  });",
          '',
          'Register for app at https://developers.soundcloud.com/',
        ].join('\n');
        console.error(message);
        return false;
      }

      function createSrc(track) {
        if (track.stream_url) {
          var sep = track.stream_url.indexOf('?') === -1 ? '?' : '&';
          track.src = track.stream_url + sep + 'client_id=' + client_id;
        }
        return track;
      }

      if (src) {
        resolve({ url: src, client_id: client_id }, function(err, res) {
          if (err) { console.error(err); }
          $scope.$apply(function() {
            $scope.track = createSrc(res);
            if (Array.isArray(res)) {
              $scope.tracks = res.map(function(track) {
                return createSrc(track);
              });
            } else if (res.tracks) {
              $scope.playlist = res;
              $scope.tracks = res.tracks.map(function(track) {
                return createSrc(track);
              });
            }
          });
        });
      }

      $scope.play = function(i) {
        if (typeof i !== 'undefined' && $scope.tracks.length) {
          $scope.index = i;
          $scope.track = $scope.tracks[i];
        }
        player.play($scope.track.src);
      };

      $scope.pause = function() {
        player.pause();
      };

      $scope.playPause = function(i) {
        if (typeof i !== 'undefined' && $scope.tracks.length) {
          $scope.index = i;
          $scope.track = $scope.tracks[i];
        }
        player.playPause($scope.track.src);
      };

      $scope.previous = function() {
        if ($scope.tracks.length < 1) { return false; }
        if ($scope.index > 0) {
          $scope.index--;
          $scope.play($scope.index);
        }
      };

      $scope.next = function() {
        if ($scope.tracks.length < 1) { return false; }
        if ($scope.index < $scope.tracks.length - 1) {
          $scope.index++;
          $scope.play($scope.index);
        } else {
          $scope.pause();
        }
      };

      $scope.seek = function(e) {
        if ($scope.track.src === player.audio.src) {
          $scope.player.seek(e);
        }
      };

      player.audio.addEventListener('timeupdate', function() {
        if (!$scope.$$phase && $scope.track.src === player.audio.src) {
          $timeout(function() {
            scrollToTime(player.audio.currentTime);
            $scope.currentTime = player.audio.currentTime;
            $scope.duration = player.audio.duration;
          });
        }
      });


      player.audio.addEventListener('ended', function() {
        if ($scope.track.src === player.audio.src) {
          $scope.next();
        }
      });

      $scope.fetchLyrics($attrs.lyricsUrl);
            
      $(".scrollable").scroll(function(e) {
          isScolling = true;
         setTimeout(function(){isScolling = false;}, 300);
      });

      function scrollToTime(currentTime) {
          currentTime = currentTime.toFixed(2);
          $.each($scope.lyricsLines, function (idx, line) {
            if(currentTime >= line.from && currentTime <= line.to) {
              // avoid wrong highlighting
              if(currentIndex !== idx) {
                  scrollToItemByIndex(idx);
              }
              return false;
            }
          });
      }

      function scrollToItemByIndex (idx) {
          currentIndex = idx;
          var target = $(".lyrics-content a.lyrics-line").eq(idx);
          var parent = $(".lyrics-content");
          
          highlight(target);
          scrollToLine(parent, target);
      }
            
      $scope.scrollTo = function (idx, $event) {
          var target = $($event.target);
          var parent = $(".lyrics-content");
          
          var item = $scope.lyricsLines[idx];
          
          if(item.from) {
              player.audio.currentTime = item.from;
              player.audio.play();
          }
          
          highlight(target);
          scrollToLine(parent, target);
      };
      
      function highlight(target) {
          $('a.lyrics-line').removeClass('highlighted');
          target.addClass('highlighted');
      }
      
      function scrollToLine(parent, target) {
          
          if(!isScolling) {
              var scrollTo = (parent.scrollTop() + target.position().top - parent.height()/2 + target.height()/2);
              parent.animate({ scrollTop : scrollTo }, 500);
          }
      }
    }
  };

}]);

ngLyricsPlayer.filter('hhmmss', function() {
  return hhmmss;
});

ngLyricsPlayer.provider('ngLyricsPlayerConfig', function() {
  var self = this;
  this.$get = function() {
    return {
      clientId: self.clientId
    };
  };
});

module.exports = 'ngLyricsPlayer';