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
  function whenQuiet(ticks, f) {
    var ticksLeft = 0;
    var args;
    function tick() {
      if (0 < ticksLeft) {
        --ticksLeft;
        setTimeout(tick, 100);
      } else {
        f.apply(args);
      }
    }
    return function() {
      args = arguments;
      var stopped = ticksLeft <= 0;
      ticksLeft = ticks;
      if (stopped) {
        tick();
      }
    }
  }
  function setDivideSize(container, left, right, divider, img, leftProportion, updateSize) {
    var gripWidth = 10;
    var gripHeight = 30;
    var height = container.offsetHeight;
    setAll(img.style, {
      position: 'fixed',
      top: container.offsetTop + (height - gripHeight) / 2 + 'px'
    });
    function setXnow(x) {
      divider.style.left = x + 'px',
      img.style.left = x + 'px',
      left.style.width = x - left.offsetLeft + 'px';
      right.style.left = x + gripWidth + 'px';
      right.style.width = container.offsetWidth - gripWidth - x + 'px';
      if (updateSize) {
        updateSize();
      }
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
          setAll(container, {
            onmousemove: null,
            onmouseup: null
          });
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
          setAll(container, {
            ontouchmove: null,
            ontouchend: null,
            ontouchcancel: null
          });
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
      height: height + 'px',
      margin: '0 0 0 0'
    });
    setAll(right.style, {
      position: 'fixed',
      top: container.offsetTop + 'px',
      height: height + 'px',
      margin: '0 0 0 0'
    });
    var x = Math.floor((container.offsetWidth - gripWidth) * leftProportion);
    setX(container.offsetLeft + x);
  }
  function vDivide(container, left, right, updateSize) {
    var divider = document.createElement('div');
    var img = document.createElement('img');
    setAttributes(img, {
      src: 'data:image/png;base64,' +
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAeCAQAAAC/fEe7AAACgUlEQVQoFQF2Aon9AAAAPaQ9/z2k' +
      'AAAAAD2kPf89pAAAAQAAPfwAAwD9wwQAAD38AAMA/cMEAgAAAAMAAAADAAAAAAADAAAAAwAAAgAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAgAAAPoAAAD6AAAAAAD6AAAA+gAAAgAAAI0A+ACNAAAAAACNAPgAjQAAgSwUTtuT' +
      '0kgAAAAASUVORK5CYII='
    });
    divider.appendChild(img);
    container.append(left, divider, right);
    setAll(container.style, {
      overflow: 'hidden'
    });
    function setSize() {
      var lw = left.offsetWidth;
      var w = lw + right.offsetWidth;
      setDivideSize(container, left, right, divider, img, lw / w, updateSize);
    }
    window.addEventListener('resize', setSize);
    setDivideSize(container, left, right, divider, img, 0.5, updateSize);
  }
  function paramId(v) {
    return 'param-' + v;
  }
  function paramButton(paramName, labelText, values, callback) {
    var lab = document.createElement('label');
    lab.setAttribute('for', paramId(paramName));
    lab.textContent = labelText;
    var select = document.createElement('select');
    select.id = paramId(paramName);
    forEach(values, function(k,v) {
      var opt = document.createElement('option');
      opt.value = k;
      opt.textContent = v;
      select.appendChild(opt);
    });
    if (callback) {
      select.onchange = callback;
    }
    var span = document.createElement('span');
    span.append(lab, select);
    return span;
  }
  return {
    forEach: forEach,
    verticalDivide: vDivide,
    whenQuiet: whenQuiet,
    paramButton: paramButton
  };
}();

