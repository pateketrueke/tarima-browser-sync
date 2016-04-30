// https://github.com/shakyShane/bs-fullscreen-message
/* global document, window */
(function (socket) {
  var body = document.getElementsByTagName('body')[0],
      rootEl;

  socket.on('bs:notify', function(params) {
    if (!rootEl) {
      rootEl = document.createElement('div');

      rootEl.style.zIndex = 9999;
      rootEl.style.padding = '10px';
      rootEl.style.position = 'fixed';
      rootEl.style.background = '#FFEEE4';
      rootEl.style.top = rootEl.style.right = rootEl.style.bottom = rootEl.style.left = 0;

      body.appendChild(rootEl);
    }

    rootEl.innerHTML = [
      '<div style="padding:10px;border:1px dashed #7C7877;overflow:auto;color:#FFF6D0">',
      params.src ? '<h3 style="margin:0;padding:0;color:#7C7877">' + params.src + '</h3>' : '',
      '<pre style="white-space:pre;margin:0;border-radius:3px;overflow:auto;padding:.3em '
        + '.5em;color:#7C7877;background:#F0E5DE;border-left:3em solid rgba(0, 0, 0, .3);">' + params.msg + '</pre></div>'
    ].join('');
  });

  socket.on('bs:notify:clear', function() {
    if (rootEl) {
      body.removeChild(rootEl);
      rootEl = null;
    }
  });
})(window.___browserSync___.socket);
