var fs = require('fs'),
    url = require('url'),
    path = require('path');

var Convert = require('ansi-to-html');

var browserSync;

function fixedBrowsers(value) {
  if (typeof value === 'string') {
    return value.replace(/\+/g, ' ').split(',').map(function(name) {
      return name === 'chrome' ? 'google chrome' : name;
    });
  }
}

function run(done) {
  var start = new Date();

  browserSync = browserSync || require('browser-sync');

  var exists = this.util.exists,
      logger = this.logger;

  var cwd = this.opts.cwd;

  var options = this.opts;

  var bsOpts = this.opts.pluginOptions['tarima-browser-sync']
    || this.opts.pluginOptions['browser-sync']
    || this.opts.pluginOptions.bs
    || {};

  var bsOptions = {
    logLevel: 'silent',
    port: options.flags.port || process.env.PORT || 3000,
    open: Boolean(options.flags.open),
    browser: fixedBrowsers(options.flags.open) || 'default',
    plugins: [{
      plugin: function() {
        // nothing
      },
      hooks: {
        'client:js': fs.readFileSync(__dirname + '/notifier.js')
      }
    }],
    snippetOptions: {
      rule: {
        match: /<\/body>|$/,
        fn: function(snippet, match) {
          return snippet + match;
        }
      }
    },
    injectChanges: true,
    ghostMode: false,
    directory: false,
    online: false,
    notify: false,
    ui: false
  };

  var serveDirs = bsOpts.serve || options.serve || [];
  var sources = [path.relative(cwd, options.public) || '.'].concat(serveDirs);
  var dirs = [options.public].concat(serveDirs);

  logger.info('\r\r{% log Serving files from: %} %s\n',
    sources.map(x => '{% yellow ' + x + ' %}').join('{% gray , %} '));

  if (typeof options.flags.proxy === 'string') {
    var _proxy = options.flags.proxy;

    if (_proxy.charAt() === ':') {
      _proxy = 'localhost' + _proxy;
    }

    bsOptions.proxy = _proxy;
    bsOptions.serveStatic = dirs;
  } else {
    bsOptions.server = {
      index: options.index || 'index.html',
      baseDir: dirs,
      middleware: [function(req, res, next) {
        if (req.method === 'GET') {
          var name = url.parse(req.url).pathname;

          // TODO: improve this behavior
          if (path.basename(name).indexOf('.') > -1) {
            return next();
          }

          var file = path.join(options.public, url.parse(req.url).pathname);

          if (!exists(file)) {
            req.url = '/' + (options.index || 'index.html');
          }
        }

        next();
      }]
    };

    for (var k in options.serverOptions) {
      bsOptions.server[k] = options.serverOptions[k];
    }
  }

  var bs = browserSync.create();

  bs.init(bsOptions, function(err) {
    if (!err) {
      logger.info('\r\r{% link http://localhost:%s %}%s\n',
        bs.getOption('port'),
        options.flags.proxy
          ? ' {% gray (' + options.flags.proxy + ') %}'
          : '');
    }

    done(err);
  });

  // restart
  start = new Date();

  var onError = this.emit.bind(null, 'error');

  var convert = new Convert();

  this.on('error', function(params) {
    bs.sockets.emit('bs:notify', params);
  });

  this.on('end', function(err, result) {
    if (err) {
      return onError({
        src: err.filepath ? path.relative(cwd, err.filepath) : null,
        msg: convert.toHtml((err.message || err.toString())
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&/g, '&amp;'))
      });
    }

    setTimeout(function () {
      if (result.output.length) {
        bs.reload(result.output);
      } else {
        bs.reload();
      }

      bs.sockets.emit('bs:notify:clear');
    }, bsOpts.timeout || 100);
  });
}

module.exports = function(cb) {
  if (this.opts.watch && (this.opts.flags.port || this.opts.flags.proxy)) {
    run.call(this, cb);
  } else {
    cb();
  }
};
