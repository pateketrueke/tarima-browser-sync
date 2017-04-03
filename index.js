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

  var timeDiff = this.util.timeDiff,
      exists = this.util.exists,
      logger = this.logger;

  var cwd = this.opts.cwd;

  var options = this.opts;

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

  if (typeof options.flags.proxy === 'string') {
    bsOptions.proxy = options.flags.proxy;
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
    if (!err) {
      logger.getLogger()
        .info('{hint.cyan|http://localhost:%s}%s {gray|+%s}',
          bs.getOption('port'), options.flags.proxy ? ' {gray|(' + options.flags.proxy + ')}' : '', timeDiff(start));
    }

    done(err);
  });

  logger.getLogger()
    .info('{log.gray|Serving files from} `%s` {gray|+%s}',
      path.relative(options.cwd, options.public), timeDiff(start));

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

    if (result.output.length) {
      bs.reload(result.output);
      bs.sockets.emit('bs:notify:clear');
    }
  });
}

module.exports = function(cb) {
  if ((this.opts.flags.watch || this.opts.flags.server) === true || this.opts.flags.proxy) {
    run.call(this, cb);
  } else {
    cb();
  }
};
