  'use strict';

  var Context = require('./context').Context;
  var io = require('./platform/io');

  var ctx;
  var isBootstrapped = false;
  var isPretranslated = false;

  ctx = new Context();
  navigator.mozL10n = createPublicAPI(ctx);
  ctx.addEventListener('error', logMessage.bind(null, 'error'));
  ctx.addEventListener('warning', logMessage.bind(null, 'warn'));

  isPretranslated = document.documentElement.lang === navigator.language;

  if (isPretranslated) {
    // if the DOM has been pretranslated, defer bootstrap as long as possible
    waitFor('complete', function() {
      window.setTimeout(bootstrap);
    });
  } else {
    // otherwise, if the DOM is loaded, bootstrap now to fire 'localized'
    if (document.readyState === 'complete') {
      window.setTimeout(bootstrap);
    } else {
      // or wait for the DOM to be interactive to try to pretranslate it 
      // using the inline resources
      waitFor('interactive', pretranslate);
    }
  }

  function waitFor(state, callback) {
    if (document.readyState === state) {
      callback();
      return;
    }
    document.addEventListener('readystatechange', function l10n_onrsc() {
      if (document.readyState === state) {
        callback();
      }
    });
  }

  function pretranslate() {
    if (inlineLocalization()) {
      // if inlineLocalization succeeded, defer bootstrap
      waitFor('complete', function() {
        window.setTimeout(bootstrap);
      });
    } else {
      bootstrap();
    }
  }

  function inlineLocalization() {
    var body = document.body;
    var scripts = body.querySelectorAll('script[type="application/l10n"]');
    if (scripts.length === 0) {
      return false;
    }
    var inline = new Context();
    inline.addEventListener('error', logMessage.bind(null, 'error'));
    inline.addEventListener('warning', logMessage.bind(null, 'warn'));

    var langs = [];
    for (var i = 0; i < scripts.length; i++) {
      var lang = scripts[i].getAttribute('lang');
      langs.push(lang);
      // pass the node to save memory
      inline.addDictionary(scripts[i], lang);
    }
    inline.once(function() {
      translateFragment(inline);
      isPretranslated = true;
    });
    inline.registerLocales('en-US', langs);
    inline.requestLocales(navigator.language);
    // XXX check if we actually negotiatied navigator.language (i.e. the 
    // corresponding <script> was present)?
    return true;
  }


  function bootstrap(forcedLocale) {
    isBootstrapped = true;

    var availableLocales = [];

    var head = document.head;
    var resLinks = head.querySelectorAll('link[type="application/l10n"]');
    var iniLinks = [];
    var i;

    for (i = 0; i < resLinks.length; i++) {
      var url = resLinks[i].getAttribute('href');
      var type = url.substr(url.lastIndexOf('.') + 1);
      if (type === 'ini') {
        iniLinks.push(url);
      } else {
        ctx.resLinks.push(url);
      }
    }

    ctx.ready(function() {
      // XXX instead of using a flag, we could store the list of 
      // yet-to-localize nodes that we get from the inline context, and 
      // localize them here.
      if (!isPretranslated) {
        translateFragment(ctx);
      }
      isPretranslated = false;
      fireLocalizedEvent(ctx);
    });

    var iniLoads = iniLinks.length;

    if (iniLoads === 0) {
      onIniLoaded();
    }
    function onIniLoaded() {
      iniLoads--;
      if (iniLoads <= 0) {
        ctx.registerLocales('en-US', getAvailable());
        ctx.requestLocales(forcedLocale || navigator.language);
      }
    }

    for (i = 0; i < iniLinks.length; i++) {
      loadINI(iniLinks[i], onIniLoaded);
    }

    // listen to language change events
    if ('mozSettings' in navigator && navigator.mozSettings) {
      navigator.mozSettings.addObserver('language.current', function(event) {
        ctx.requestLocales(event.settingValue);
      });
    }
  }

  function loadINI(url, cb) {
    io.load(url, function(err, source) {
      if (!source) {
        cb();
        return;
      }

      var ini = parseINI(source, url);
      var pos = ctx.resLinks.indexOf(url);

      var patterns = [];
      for (var i = 0; i < ini.resources.length; i++) {
        patterns.push(ini.resources[i].replace('en-US', '{{locale}}'));
      }
      var args = [pos, 1].concat(patterns);
      ctx.resLinks.splice.apply(ctx.resLinks, args);
      cb();
    });
  }

  function getAvailable() {
    var metaLocs = document.head.querySelector('meta[name="locales"]');
    if (metaLocs) {
      return metaLocs.getAttribute('content').split(',').map(String.trim);
    } else {
      return [];
    }
  }

  var patterns = {
    section: /^\s*\[(.*)\]\s*$/,
    import: /^\s*@import\s+url\((.*)\)\s*$/i,
    entry: /[\r\n]+/
  };

  function parseINI(source, iniPath) {
    var entries = source.split(patterns['entry']);
    var locales = ['en-US'];
    var genericSection = true;
    var uris = [];

    for (var i = 0; i < entries.length; i++) {
      var line = entries[i];
      // we only care about en-US resources
      if (genericSection && patterns['import'].test(line)) {
        var match = patterns['import'].exec(line);
        var uri = relativePath(iniPath, match[1]);
        uris.push(uri);
        continue;
      }

      // but we need the list of all locales in the ini, too
      if (patterns['section'].test(line)) {
        genericSection = false;
        var match = patterns['section'].exec(line);
        locales.push(match[1]);
      }
    }
    return {
      locales: locales,
      resources: uris
    };
  }

  function relativePath(baseUrl, url) {
    if (url[0] == '/') {
      return url;
    }

    var dirs = baseUrl.split('/')
      .slice(0, -1)
      .concat(url.split('/'))
      .filter(function(path) {
        return path !== '.';
      });

    return dirs.join('/');
  }

  function createPublicAPI(ctx) {
    var rtlLocales = ['ar', 'fa', 'he', 'ps', 'ur'];
    return {
      get: function l10n_get(id, data) {
        var value = ctx.get(id, data);
        if (value === null) {
          return '';
        }
        return value;
      },
      localize: localizeNode.bind(null, ctx),
      translate: translateFragment.bind(null, ctx),
      language: {
        get code() {
          return ctx.supportedLocales[0];
        },
        set code(lang) {
          ctx.requestLocales(lang);
        },
        get direction() {
          if (rtlLocales.indexOf(ctx.supportedLocales[0]) >= 0) {
            return 'rtl';
          } else {
            return 'ltr';
          }
        }
      },
      ready: ctx.ready.bind(ctx),
      get readyState() {
        return ctx.isReady ? 'complete' : 'loading';
      }
    };
  }

  var DEBUG = false;
  function logMessage(type, e) {
    if (DEBUG) {
      console[type](e);
    }
  }

  function getTranslatableChildren(element) {
    return element ? element.querySelectorAll('*[data-l10n-id]') : [];
  }


  function getL10nAttributes(element) {
    if (!element) {
      return {};
    }

    var l10nId = element.getAttribute('data-l10n-id');
    var l10nArgs = element.getAttribute('data-l10n-args');
    var args = {};
    if (l10nArgs) {
      try {
        args = JSON.parse(l10nArgs);
      } catch (e) {
        console.warn('could not parse arguments for ' + l10nId);
      }
    }
    return { id: l10nId, args: args };
  }

  function setTextContent(element, text) {
    // standard case: no element children
    if (!element.firstElementChild) {
      element.textContent = text;
      return;
    }

    // this element has element children: replace the content of the first
    // (non-blank) child textNode and clear other child textNodes
    var found = false;
    var reNotBlank = /\S/;
    for (var child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 && reNotBlank.test(child.nodeValue)) {
        if (found) {
          child.nodeValue = '';
        } else {
          child.nodeValue = text;
          found = true;
        }
      }
    }
    // if no (non-empty) textNode is found, insert a textNode before the
    // element's first child.
    if (!found) {
      element.insertBefore(document.createTextNode(text), element.firstChild);
    }
  }

  function translateNode(ctx, node) {
    var attrs = getL10nAttributes(node);
    if (!attrs.id) {
      return true;
    }

    var entity = ctx.getEntity(attrs.id, attrs.args);
    if (entity === null) {
      return false;
    }

    if (entity.value) {
      setTextContent(node, entity.value);
    }

    for (var key in entity.attributes) {
      if (entity.attributes.hasOwnProperty(key)) {
        var attr = entity.attributes[key];
        var pos = key.indexOf('.');
        if (pos !== -1) {
          node[key.substr(0, pos)][key.substr(pos + 1)] = attr;
        } else {
          node[key] = attr;
        }
      }
    }
    return true;
  }
  
  // localize an node as soon as ctx is ready
  function localizeNode(ctx, element, id, args) {
    if (!element) {
      return;
    }

    if (!id) {
      element.removeAttribute('data-l10n-id');
      element.removeAttribute('data-l10n-args');
      setTextContent(element, '');
      return;
    }

    // set the data-l10n-[id|args] attributes
    element.setAttribute('data-l10n-id', id);
    if (args && typeof args === 'object') {
      element.setAttribute('data-l10n-args', JSON.stringify(args));
    } else {
      element.removeAttribute('data-l10n-args');
    }

    // if ctx is ready, translate now;
    // if not, the element will be translated along with the document anyway.
    if (ctx.isReady) {
      translateNode(ctx, element);
    }
  }
  
  // translate an array of HTML nodes
  // -- returns an array of nodes that could not be translated
  function translateNodes(ctx, elements) {
    var untranslated = [];
    for (var i = 0, l = elements.length; i < l; i++) {
      if (!translateNode(ctx, elements[i])) {
        untranslated.push(elements[i]);
      }
    }
    return untranslated;
  }

  // translate an HTML subtree
  // -- returns an array of elements that could not be translated
  function translateFragment(ctx, element) {
    element = element || document.documentElement;
    var untranslated = translateNodes(ctx, getTranslatableChildren(element));
    if (!translateNode(ctx, element)) {
      untranslated.push(element);
    }
    return untranslated;
  }

  function fireLocalizedEvent(ctx) {
    var event = document.createEvent('Event');
    event.initEvent('localized', false, false);
    event.language = ctx.supportedLocales[0];
    window.dispatchEvent(event);
  }
