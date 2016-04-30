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
  browserSync = browserSync || require('browser-sync');

  var exists = this.util.exists,
      notify = this.util.notify,
      logger = this.logger;

  var cwd = this.opts.cwd;

  var options = this.opts;

  var bsOptions = {
    logLevel: 'silent',
    port: options.port || process.env.PORT || 3000,
    open: options.open === true,
    browser: fixedBrowsers(options.browser) || 'default',
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

  if (typeof options.proxy === 'string') {
    bsOptions.proxy = options.proxy;
    bsOptions.serveStatic = [options.public];
  } else {
    bsOptions.server = {
      index: 'index.html',
      baseDir: options.public,
      middleware: [function(req, res, next) {
        var name = url.parse(req.url).pathname;

        // TODO: improve this behavior
        if (path.basename(name).indexOf('.') > -1) {
          return next();
        }

        var file = path.join(options.public, url.parse(req.url).pathname);

        if (!exists(file)) {
          req.url = '/index.html';
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
    logger.printf('{hint.cyanBright|Starting server at: http://localhost:%s/}\n', bs.getOption('port'));
    done(err);
  });

  var onError = this.emit.bind(null, 'error');

  var convert = new Convert();

  this.on('error', function(params) {
    bs.sockets.emit('bs:notify', params);
    notify('An error has occurred!', options.notifications.title, options.notifications.errIcon);
  });

  this.on('end', function(err, result) {
    if (err) {
      onError({
        src: err.filepath ? path.relative(cwd, err.filepath) : null,
        msg: convert.toHtml(err.toString())
      });
    }

    if (result && result.output.length) {
      bs.reload(result.output);
      bs.sockets.emit('bs:notify:clear');
    }
  });
}

module.exports = function(cb) {
  if (this.opts.server || this.opts.proxy) {
    run.call(this, cb);
  } else {
    cb();
  }
};
