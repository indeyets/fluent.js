define(function (require, exports, module) {
  'use strict';

  var L20n = require('../l20n');
  var io = require('./platform/io');

  var ctx = L20n.getContext();

  var resources = {};

  webL10nBridge();

  function webL10nBridge() {
    if (!navigator.mozL10n) {
      navigator.mozL10n = {
        get: ctx.get.bind(ctx),
        localize: function() {},
        language: {
          get code() { ctx.supportedLocales[0] },
          set code(lang) {
          ctx.addEventListener('ready', function() {
            print('ctx is ready');
            window.dispatchEvent();
          });
          indexResources(document, function() {
            ctx.registerLocales(lang);
            bindResources();
            ctx.requestLocales(lang);
          });
        },
        getDictionary: function(fragment) {
        
        }
      },
      ready: function() {},
      };
    }
  }

  function indexResources(doc, cb) {
    var headNode = doc.head;
    var links = headNode.querySelectorAll('link[type="application/l10n"]');

    var iniToLoad = links.length;
    if (iniToLoad === 0) {
      return cb();
    }
    for (var i = 0; i < links.length; i++) {
      loadINI(links[i].getAttribute('href'), iniLoaded);
    };

    function iniLoaded(err) {
      if (err) {
        throw err;
      }
      iniToLoad--;
      if (iniToLoad == 0) {
        cb();
      }
    }
  }

  function bindResources() {
    resources['en-US'].forEach(function (res) {
      ctx.linkResource(res);
    });
  }

  function loadINI(url, cb) {
    io.loadAsync(url).then(
        function iniLoaded(text) {
          var res = addResourcesFromINI(url, text);
          for (var loc in res) {
            if (!resources[loc]) {
              resources[loc] = [];
            }
            for (var r in res[loc]) {
              resources[loc].push(res[loc][r]);
            }
          }
          cb();
        }
    );
  }

  var patterns = {
    ini: {
      section: /^\s*\[(.*)\]\s*$/,
      import: /^\s*@import\s+url\((.*)\)\s*$/i,
      locale: /{{\s*locale\s*}}/,
    }
  }

  function addResourcesFromINI(iniPath, source) {
    var entries = source.split(/[\r\n]+/);
    var langs = ['en-US'];
    var currentLang = 'en-US';
    var resources = {'en-US': []};
    var match, uri;

    var genericSection = true;

    for (var i = 0; i < entries.length; i++) {
      var line = entries[i];
      if (patterns['ini']['section'].test(line)) {
        match = patterns['ini']['section'].exec(line);
        langs.push(match[1]);
        resources[match[1]] = [];
        currentLang = match[1];
        genericSection = false;
      }
      if (patterns['ini']['import'].test(line)) {
        match = patterns['ini']['import'].exec(line);
        uri = relativePath(iniPath, match[1]);
        resources[currentLang].push(uri);
      }
    }
    return resources;
  }

  function relativePath(baseUrl, url) {
    if (url[0] == '/') {
      return url;
    }
    var dirs = baseUrl.split('/')
      .slice(0, -1)
      .concat(url.split('/'))
      .filter(function(elem) {
        return elem !== '.';
      });

    if (dirs[0] !== '' && dirs[0] !== '..') {
      // if the base path doesn't start with / or ..
      dirs.unshift('.');
    }

    return dirs.join('/');
  }


  return L20n;
});
