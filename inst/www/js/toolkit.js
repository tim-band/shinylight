var toolkit = function() {
  function forEach(a, f) {
    var k = Object.keys(a), i = 0;
    for (; i !== k.length; ++i) {
      var ki = k[i];
      f(ki, a[ki]);
    }
  }
  function findPrevious(a, k) {
    var prev = null;
    var ks = Object.keys(a), i = 0;
    for (; i !== ks.length; ++i) {
      var c = ks[i];
      if (c === k) {
        return prev;
      }
      prev = c;
    }
    return null;
  }
  function findNext(a, k) {
    var seen = false;
    var ks = Object.keys(a), i = 0;
    for (; i !== ks.length; ++i) {
      var c = ks[i];
      if (seen) {
        return c;
      } else if (c === k) {
        seen = true;
      }
    }
    return null;
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
  function paramButton(paramName, labelText, values, initial, callback, help) {
    var lab = document.createElement('label');
    lab.setAttribute('for', paramId(paramName));
    lab.textContent = labelText;
    lab.className = 'param-label';
    var select = document.createElement('table');
    select.style.display = 'inline-block';
    select.style.verticalAlign = 'top';
    select.style.borderCollapse = 'collapse';
    var options = {};
    forEach(values, function(k,v) {
      var optr = document.createElement('tr');
      var opt = document.createElement('td');
      opt.style.padding = '0px';
      var optDiv = document.createElement('div');
      opt.appendChild(optDiv);
      var downArrow = document.createElement('td');
      downArrow.style.padding = '0px';
      var downArrowDiv = document.createElement('div');
      downArrow.appendChild(downArrowDiv);
      downArrowDiv.textContent = '\u25bc';
      downArrow.className = 'option-down-arrow';
      optr.append(opt, downArrow);
      optr.value = k;
      options[k] = optr;
      optDiv.textContent = v;
      if (!initial && !selectedOption) {
        initial = k;
      }
      if (k === initial) {
        optr.classList.add('selected');
      }
      select.appendChild(optr);
      var h = document.createElement('span')
      h.className = "option-tooltip";
      h.innerHTML = "some <i>" + k + "</i> help"
      optr.classList.add('param-option');
      optr.appendChild(h);
      optr.onclick = function() {
        if (select.classList.contains('open')) {
          if (!optr.classList.contains('selected')) {
            span.setSelectedParam(k);
          }
          select.classList.remove('open');
        } else {
          select.classList.add('open');
        }
      };
    });
    var span = document.createElement('span');
    span.id = paramId(paramName);
    span.className = "param-button";
    span.append(lab, select);
    if (help) {
      var h = document.createElement('span');
      h.className = "tooltip";
      h.innerHTML = help;
      lab.appendChild(h);
    }
    select.onblur = function() {
      select.classList.remove('open');
    }
    var selectedOption = null;
    function setSelected(value) {
      if (selectedOption === value || !options[value]) {
        return;
      }
      if (selectedOption) {
        options[selectedOption].classList.remove('selected');
      }
      selectedOption = value;
      options[selectedOption].classList.add('selected');
    };
    span.setSelectedParam = function(value) {
      setSelected(value);
      callback();
    };
    span.getSelectedParam = function() {
      return selectedOption;
    }
    setSelected(initial);
    select.tabIndex = 0;
    select.onkeydown = function(ev) {
      var goTo = null;
      if (ev.key === 'ArrowDown') {
        goTo = findNext(options, selectedOption);
      } else if (ev.key === 'ArrowUp') {
        goTo = findPrevious(options, selectedOption);
      } else if (ev.key === 'Enter') {
        select.classList.remove('open');
        return;
      } else {
        return;
      }
      span.setSelectedParam(goTo);
    }
    return span;
  }
  function getSelectedParam(paramButton) {
    return paramButton.getSelectedParam();
  }
  function setSelectedParam(paramButton, value) {
    return paramButton.setSelectedParam(value);
  }
  return {
    forEach: forEach,
    verticalDivide: vDivide,
    whenQuiet: whenQuiet,
    paramButton: paramButton,
    getSelectedParam: getSelectedParam,
    setSelectedParam: setSelectedParam
  };
}();

