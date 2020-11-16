var toolkit = function() {
  function forEach(a, f) {
    var k = Object.keys(a), i = 0;
    for (; i != k.length; ++i) {
      var ki = k[i];
      f(ki, a[ki]);
    }
  }
  function setAll(target, vals, dels) {
    forEach(vals, function(k, v) { target[k] = v; });
    if (dels) { forEach(dels, function(i,v) { delete target[v] }); }
  }
  function setAttributes(el, vals) {
    forEach(vals, el.setAttribute.bind(el));
  }
  function headerFooter(container, header, middle, footer) {
    container.append(header, middle, footer);
    var fix = { position: 'fixed', left: '0', right: '0' }
    setAll(middle.style, fix);
    setAll(fix, { bottom: '0' });
    setAll(footer.style, fix);
    setAll(fix, { top: '0' }, [ 'bottom' ]);
    setAll(header.style, fix);
    var resize = function() {
      var top = header.offsetHeight;
      setAll(middle.style, { top: top, height: footer.offsetTop - top });
    };
    resize();
    window.addEventListener('resize', resize);
  }
  function throttle(delay, f) {
    var pending = false;
    var args;
    return function() {
      args = arguments;
      if (!pending) {
        pending = true;
        setTimeout(function() { pending = false; f.apply(null, args) }, delay);
      }
    }
  }
  function vDivide(container, left, right) {
    var gripWidth = 10;
    var gripHeight = 30;
    var divider = document.createElement('div');
    var img = document.createElement('img');
    setAttributes(img, {
      src: "data:image/png;base64," +
      "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAeCAQAAAC/fEe7AAACgUlEQVQoFQF2Aon9AAAAPaQ9/z2k" +
      "AAAAAD2kPf89pAAAAQAAPfwAAwD9wwQAAD38AAMA/cMEAgAAAAMAAAADAAAAAAADAAAAAwAAAgAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAgAAAPoAAAD6AAAAAAD6AAAA+gAAAgAAAI0A+ACNAAAAAACNAPgAjQAAgSwUTtuT" +
      "0kgAAAAASUVORK5CYII="
    });
    divider.appendChild(img);
    var height = container.offsetHeight;
    setAll(img.style, {
      position: 'fixed',
      top: (height - gripHeight) / 2 + 'px'
    });
    function setXnow(x) {
      divider.style.left = x + 'px',
      img.style.left = x + 'px',
      left.style.width = x - left.offsetLeft + 'px';
      right.style.left = x + gripWidth + 'px';
      right.style.width = container.offsetWidth - gripWidth - x + 'px';
    }
    var setX = throttle(150, setXnow);
    setAll(divider.style, {
      position: 'fixed',
      'background-color': '#b0b0b0',
      cursor: 'col-resize',
      width: gripWidth + 'px',
      top: container.offsetTop + 'px',
      height: height + 'px'
    });
    setAll(divider, {
      onmousedown: function(ev) {
        var offset = ev.clientX - divider.offsetLeft;
        function set(e) {
          setX(e.clientX - offset);
          e.preventDefault();
        }
        container.onmousemove = set;
        container.onmouseup = function(e) {
          set(e);
          setAll(container, {onmousemove: null, onmouseup: null});
        }
        ev.preventDefault();
      },
      ontouchstart: function(ev) {
        var offset = ev.touch[0].clientX - divider.offsetLeft;
        function set(e) {
          setX(e.touch[0].clientX - offset);
          e.preventDefault();
        }
        container.ontouchmove = set;
        function finishPos(e) {
          set(e);
          setAll(container, {ontouchmove: null, ontouchend: null, ontouchcancel: null});
        }
        container.ontouchend = function(e) {
          finishPos(e);
        }
        container.ontouchcancel = function() {
          finishPos(ev);
        }
        ev.preventDefault();
      }
    });
    setAll(left.style, {
      position: 'fixed',
      left: container.offsetLeft + 'px',
      top: container.offsetTop + 'px',
      height: height + 'px'
    });
    setAll(right.style, {
      position: 'fixed',
      top: container.offsetTop + 'px',
      height: height + 'px'
    });
    container.append(left, divider, right);
    var x = Math.floor((container.offsetWidth - gripWidth) / 2);
    setX(container.offsetLeft + x);
  }
  return {
    fixedHeaderFooter: headerFooter,
    verticalDivide: vDivide
  };
}();

