var toolkit = function() {

  function forEach(a, f) {
    var k = Object.keys(a), i = 0;
    for (; i !== k.length; ++i) {
      var ki = k[i];
      f(ki, a[ki]);
    }
  }

  function deref(object, path, defaultValue) {
    for (var i = 0; i !== path.length; ++i) {
      var p = path[i];
      if (typeof(object) === 'object' && p in object) {
        object = object[p];
      } else if (typeof(p) !== 'undefined' && p !== null) {
        return typeof(defaultValue) === 'undefined'? null : defaultValue;
      }
    }
    return object;
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
    if (vals) {
      forEach(vals, function(k, v) { target[k] = v; });
    }
    if (dels) {
      forEach(dels, function(i,v) { delete target[v] });
    }
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

  function reposition(el, left, top, width, height) {
    if (typeof(el.reposition) === 'function') {
      el.reposition(left, top, width, height);
    }
  }

  function getData(el) {
    return typeof(el.getData) === 'function'? el.getData() : null;
  }

  function setData(el, v) {
    if (typeof(el.setData) === 'function') {
      el.setData(v)
    }
  }

  function getSize(el) {
    if (typeof(el.getSize) === 'function') {
      return el.getSize();
    }
    return { left: el.offsetTop, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
  }

  // Creates a container for existing header/footer/sideBar and main section.
  // When the container is resized, its reposition() method
  // should be called. This will set the main section to the same
  // width as the container but its height to the new container
  // height minus the height of the header.
  // If the main section has a reposition() method it will be called
  // after it is resized.
  // ahead is true for left or header, false for right or footer.
  function sideBarGeneric(s, main, ahead, reposit) {
    var container = document.createElement('div');
    container.appendChild(ensureStructural(ahead? s : main));
    container.appendChild(ensureStructural(ahead? main : s));
    setReposition(container, reposit);
    container.getData = function() {
      var r = {};
      setAll(r, getData(s));
      setAll(r, getData(main));
    };
    container.setData = function(v) {
      setData(s, v);
      setData(main, v);
    };
    return container;
  }

  // side bar thing at the top
  function header(hdr, main) {
    return sideBarGeneric(hdr, main, true, function(l, t, w, h) {
      setAll(hdr.style, {
        position: 'fixed',
        left: l + 'px',
        width: w + 'px',
        top: t + 'px'
      });
      hdr.style.removeProperty('height');
      reposition(hdr, l, t, w, h);
      var hh = getSize(hdr).height;
      hdr.style.height = hh + 'px';
      reposition(main, l, t + hh, w, h - hh);
      reposition(hdr, l, t, w, hh);
    });
  }

  // Like header, but the footer goes below the main section
  function footer(ftr, main) {
    return sideBarGeneric(ftr, main, false, function(l, t, w, h) {
      setAll(ftr.style, {
        position: 'fixed',
        left: l + 'px',
        width: w + 'px',
      });
      ftr.style.removeProperty('top');
      ftr.style.removeProperty('height');
      reposition(ftr, l, t, w, h);
      var fh = getSize(ftr).height;
      setAll(ftr.style, {
        top: t + h - fh + 'px',
        height: fh + 'px'
      });
      reposition(main, l, t, w, h - fh);
      reposition(ftr, l, t + h + fh, w, fh);
    });
  }

  // Like header, but on the left
  function leftSideBar(bar, main) {
    return sideBarGeneric(bar, main, true, function(l, t, w, h) {
      setAll(bar.style, {
        position: 'fixed',
        left: l + 'px',
        top: t + 'px',
        height: h + 'px'
      });
      bar.style.removeProperty('width');
      reposition(bar, l, t, w, h);
      var bw = getSize(bar).width;
      bar.style.width = bw;
      reposition(main, l + bw, t, w - bw, h);
      reposition(bar, l, t, bw, h);
    });
  }

  // Like header, but on the right
  function rightSideBar(bar, main) {
    return sideBarGeneric(bar, main, function(l, t, w, h) {
      setAll(bar.style, {
        position: 'fixed',
        top: t + 'px',
        height: h + 'px'
      });
      bar.style.removeProperty('left');
      bar.style.removeProperty('width');
      reposition(bar, l, t, w, h);
      var bw = getSize(bar).width;
      setAll(bar.style, {
        left: l + w - bw + 'px',
        width: bw + 'px'
      });
      reposition(main, l, t, w - bw, h);
      reposition(bar, l + w + bw, t, bw, h);
    });
  }

  function setDivideSize(container, left, right, divider, img, dimensions) {
    setAll(img.style, {
      position: 'fixed',
      top: (dimensions.top
        + (dimensions.height - dimensions.gripHeight) / 2)
        + 'px'
    });
    function setXnow(x) {
      divider.style.left = (dimensions.left + x) + 'px',
      reposition(left, dimensions.left, dimensions.top, x, dimensions.height);
      var rightWidth = dimensions.width - dimensions.gripWidth - x;
      reposition(right,
        x + dimensions.gripWidth,
        dimensions.top,
        rightWidth,
        dimensions.height);
      dimensions.leftProportion = x / (x + rightWidth);
    }
    var setX = throttle(150, setXnow);
    setAll(divider.style, {
      position: 'fixed',
      'background-color': '#b0b0b0',
      cursor: 'col-resize',
      width: dimensions.gripWidth + 'px',
      top: dimensions.top + 'px',
      height: dimensions.height + 'px'
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
      margin: '0 0 0 0'
    });
    setAll(right.style, {
      position: 'fixed',
      margin: '0 0 0 0'
    });
    var x = Math.floor((dimensions.width - dimensions.gripWidth) * dimensions.leftProportion);
    setXnow(x);
  }

  function vDivide(container, left, right) {
    if (!container) {
      container = document.createElement('div');
    }
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
    setShowHide(container);
    setAll(container.style, {
      overflow: 'hidden'
    });
    var dimensions = {
      left: container.offsetLeft,
      top: container.offsetTop,
      width: container.offsetWidth,
      height: container.offsetHeight,
      gripWidth: 10,
      gripHeight: 30,
      leftProportion: 0.5
    }
    setReposition(container, function(l, t, w, h) {
      setAll(dimensions, {
        left: l,
        top: t,
        width: w,
        height: h
      });
      setDivideSize(container, left, right, divider, img, dimensions);
    });
    return container;
  }

  function setAsBody(el) {
    var main = document.getElementsByTagName('main')[0];
    main.textContent = '';
    main.appendChild(el);
    function setSize() {
      reposition(el, 0, 0, window.innerWidth, innerHeight);
    }
    window.addEventListener('resize', setSize);
    el.resize = setSize;
    setSize();
  }

  function constTrue() {
    return true;
  }

  function noop() {
    return true;
  }

  // Makes a label with text translations.id.name, translations.name or id
  // and tooltip HTML help text translaitons.id.help or translations.help.
  // if idFor is passed it will be set as the 'for' 
  // The result is appended to container, if passed and not null.
  function makeLabel(translations, container, id, idFor) {
    var name = deref(translations, [id, 'name'], id);
    var help = deref(translations, [id, 'help']);
    var label = document.createElement('label');
    label.textContent = name;
    label.className = 'param-label';
    if (typeof(idFor) === 'string') {
      label.setAttribute('for', idFor);
    }
    if (typeof(container) !== 'undefined' && container) {
      container.appendChild(label);
    }
    if (help) {
      var h = document.createElement('span')
      h.className = "tooltip";
      h.innerHTML = help;
      label.appendChild(h);
    }
    return label;
  }

  function paramColor(id, container, translations, initial, callback) {
    var box = typeof(container.makeSubElement) === 'function'?
      container.makeSubElement(id) : span(container);
    box.className = 'param-box';
    box.addElement(makeLabel(translations));
    var input = document.createElement('input');
    input.type = 'color';
    input.id = 'param-' + id;
    input.className = 'param-color';
    if (initial) {
      input.value = initial;
    }
    callback = ensureFunction(callback);
    input.onchange = function() {
      callback(input.value);
    };
    box.setData = function(value) {
      input.value = value;
      callback(value);
    };
    box.getData = function() {
      return input.value;
    };
    box.addElement(input);
    return box;
  }

  function toBoolean(v) {
    if (typeof(v) === 'boolean') {
      return v;
    } else if (typeof(v) === 'string') {
      return v !== '' && v[0] !== 'f' && v[0] !== 'F';
    }
    return v !== 0;
  }

  function paramBoolean(id, container, translations, initial, callback) {
    var box = typeof(container.makeSubElement) === 'function'?
      container.makeSubElement(id) : span(container);
    box.className = 'param-box';
    var idFor = 'param-' + id;
    box.addElement(makeLabel(translations, null, null, idFor));
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'param-boolean';
    input.id = idFor;
    if (initial) {
      input.checked = toBoolean(initial);
    }
    callback = ensureFunction(callback);
    input.onchange = function() {
      callback(input.checked);
    };
    box.setData = function(value) {
      input.checked = toBoolean(initial);
      callback(input.checked);
    };
    box.getData = function() {
      return input.checked;
    };
    box.addElement(input);
    return box;
  }

  function paramTyping(id, container, translations, initial, callback, validate, transform) {
    var box = typeof(container.makeSubElement) === 'function'?
      container.makeSubElement(id) : span(container);
    box.className = 'param-box';
    box.addElement(makeLabel(translations));
    var input = document.createElement('input');
    input.id = 'param-' + id;
    input.className = 'param-text';
    if (initial !== null) {
      input.value = initial;
    }
    callback = ensureFunction(callback);
    validate = ensureFunction(validate, constTrue);
    input.onchange = function() {
      if (validate(input.value)) {
        input.classList.remove('invalid');
        callback(input.value);
      } else {
        input.classList.add('invalid');
      }
    };
    box.setData = function(value) {
      input.value = value;
      callback(value);
    };
    box.getData = function() {
      return transform(input.value);
    };
    box.addElement(input);
    return box;
  }

  function identity(v) {
    return v;
  }

  function isAtLeastFn(min) {
    if (min === null || typeof(min) === 'undefined') {
      return function() { return true; };
    }
    return function(v) { return min < v; }
  }

  function isAtMostFn(max) {
    if (max === null || typeof(max) === 'undefined') {
      return function() { return true; };
    }
    return function(v) { return v < max; }
  }

  function isInRangeFn(min, max) {
    var minf = isAtLeastFn(min);
    var maxf = isAtMostFn(max);
    return function(v) { return minf(v) && maxf(v); };
  }

  function paramText(id, container, translations, initial, callback, validate) {
    return paramTyping(id, container, translations, initial, callback, validate, identity);
  }

  function paramInteger(id, container, translations, initial, callback, min, max) {
    var rangeFn = isInRangeFn(min, max);
    return paramTyping(id, container, translations, initial, callback, function(v) {
      if (/^ *[-+]?\d+ *$/.test(v)) {
        var i = parseInt(v);
        return rangeFn(i);
      }
      return false;
    }, parseInt);
  }

  function paramFloat(id, container, translations, initial, callback, min, max) {
    var rangeFn = isInRangeFn(min, max);
    return paramTyping(id, container, translations, initial, callback, function(v) {
      if (/^ *[-+]?\d+(\.\d+)?([eE]\d+)? *$/.test(v)) {
        var f = parseFloat(v);
        return rangeFn(f);
      }
      return false;
    }, parseFloat);
  }

  function span(container) {
    var s = document.createElement('span');
    s.addElement = function(el) {
      s.appendChild(el);
    }
    setShowHide(s, 'inline-block');
    if (typeof(container) !== 'undefined') {
      container.appendChild(s);
    }
    return s;
  }

  function tableRow() {
    var tr = document.createElement('tr');
    tr.addElement = function(el) {
      var td = document.createElement('td');
      td.appendChild(el);
      tr.appendChild(td);
    }
    setShowHide(tr, 'table-row');
    return tr;
  }

  function optionsPage() {
    var sub = {};
    var table = document.createElement('table');
    table.className = 'options-page';
    var tbody = document.createElement('tbody');
    table.appendChild(tbody);
    table.makeSubElement = function(id) {
      var tr = tableRow();
      tbody.appendChild(tr);
      if (typeof(id) !== 'undefined') {
        sub[id] = tr;
      }
      return tr;
    }
    setShowHide(table, 'table');
    table.getData = function() {
      var r = {};
      forEach(sub, function(id, el) {
        if (typeof(el.getData) === 'function') {
          r[id] = el.getData();
        }
      });
      return r;
    };
    return table;
  }

  function paramSelector(id, container, labelTranslations, values,
      valueTranslations, initial, callback) {
    var box = typeof(container.makeSubElement) === 'function'?
      container.makeSubElement(id) : span(container);
    // The button is the area that can be clicked to open up the drop-down
    var button = document.createElement('div');
    button.className = 'param-selector';
    button.style.display = 'inline-block';
    var buttonText = document.createElement('span');
    if (id) {
      buttonText.id = 'param-' + id;
    }
    button.appendChild(buttonText);
    var downArrow = document.createElement('div');
    downArrow.style.padding = '0px';
    downArrow.style.float = 'right';
    downArrow.textContent = '\u25bc';
    downArrow.className = 'select-down-arrow';
    button.appendChild(downArrow);
    var dropDown = document.createElement('table');
    var open = false;
    var selectedOption = null;
    var options = {};
    var optionNames = {};
    var idPrefix = id? id + '-' : '';
    forEach(values, function(i,id) {
      var optr = document.createElement('tr');
      optr.classList.add('param-option');
      var opt = document.createElement('td');
      opt.id = idPrefix + id;
      opt.style.padding = '0px';
      var trs = id in valueTranslations? valueTranslations[id] : {};
      var name = 'name' in trs? trs.name : id;
      opt.textContent = name;
      optionNames[id] = name;
      options[id] = optr;
      if (!initial && !selectedOption) {
        initial = id;
      }
      optr.appendChild(opt);
      dropDown.appendChild(optr);
      if ('help' in trs) {
        var h = document.createElement('span')
        h.className = "option-tooltip";
        h.innerHTML = trs.help;
        optr.appendChild(h);
      }
      function preventdefault(ev) {
        ev.preventDefault();
      }
      optr.onmousedown = preventdefault;
      optr.onmousemove = preventdefault;
      optr.onmouseenter = preventdefault;
      optr.onmouseup = function(ev) {
        dropDown.classList.remove('open');
        open = false;
        box.setData(id);
        ev.preventDefault();
      };
    });
    buttonText.onmousedown = downArrow.onmousedown = function(ev) {
      if (open) {
        dropDown.classList.remove('open');
        open = false;
      } else {
        dropDown.classList.add('open');
        box.focus();
        open = true;
      }
      ev.preventDefault();
    }
    button.onmousemove = function(ev) {
      ev.preventDefault();
    }
    box.className = 'param-box';
    box.addElement(makeLabel(labelTranslations));
    dropDown.style.position = 'absolute';
    button.appendChild(dropDown);
    box.addElement(button);
    function setSelected(value) {
      if (selectedOption !== value && value in options) {
        selectedOption = value;
        buttonText.textContent = optionNames[selectedOption];
      }
    };
    if (typeof(callback) !== 'function') {
      callback = function() {};
    }
    box.setData = function(value) {
      setSelected(value);
      callback(value);
    };
    box.getData = function() {
      return selectedOption;
    };
    setSelected(initial);
    box.tabIndex = 0;
    box.onkeydown = function(ev) {
      var goTo = null;
      if (ev.key === 'ArrowDown') {
        goTo = findNext(options, selectedOption);
      } else if (ev.key === 'ArrowUp') {
        goTo = findPrevious(options, selectedOption);
      } else {
        return;
      }
      dropDown.classList.remove('open');
      open = false;
      box.setData(goTo);
    };
    box.onblur = function() {
      dropDown.classList.remove('open');
      open = false;
    };
    return box;
  }

  function groupTitle(container, labelTranslations) {
    var box = typeof(container.makeSubElement) === 'function'?
      container.makeSubElement() : span(container);
    box.className = 'group-title';
    box.addElement(makeLabel(labelTranslations));
    return box;
  }

  function setShowHide(element, displayStyle) {
    var display = typeof(displayStyle) === 'string'? displayStyle : element.style.display;
    element.hide = function() {
      var d = element.style.display;
      if (d !== 'none') {
        display = d;
        element.style.display = 'none';
      }
    };
    element.show = function() {
      element.style.display = display;
    };
  }

  // sets el to have two methods:
  // getSize() and reposition().
  // getSize() is not accurate if el is not visible.
  // reposition will set the size and position; if the position has changed
  // callback will be called with the new (left, top, width, height)
  function setReposition(el, callback, getSizeFn) {
    callback = ensureFunction(callback);
    var size = { left: 0, top: 0, width: 100, height: 100 };
    if (typeof(getSizeFn) === 'function') {
      el.getSize = function() {
        var s = getSizeFn();
        return s? s : size;
      };
    } else {
      el.getSize = function() {
        if (0 !== el.clientHeight || 0 !== el.clientWidth) {
          setAll(size, {
            left: el.clientLeft,
            top: el.clientTop,
            width: el.clientWidth,
            height: el.clientHeight
          });
        }
        return size;
      };
    }
    el.reposition = function (l, t, w, h) {
      setAll(size, { left: l, top: t, width: w, height: h });
      callback(l, t, w, h);
    };
  }

  function image(updateSizeFunction) {
    var img = document.createElement('img');
    img.style.display = 'block';
    img.setData = function(data) {
      img.setAttribute('src', data);
    };
    updateSizeFunction = ensureFunction(updateSizeFunction);
    setReposition(img, function(l, t, w, h) {
      setAll(img, { width: w, height: h });
      updateSizeFunction();
    });
    setShowHide(img);
    img.setData('data:image/png;base64,iVBORw0KGgoAAAANSUhEU'
        + 'gAAAAEAAAABCAIAAACQd1PeAAAAD0lEQVQIHQEEAPv/AP///w'
        + 'X+Av4DfRnGAAAAAElFTkSuQmCC');
    return img;
  }

  function staticContent(labelTranslations, type) {
    var div = document.createElement('div');
    div.className = 'static-text';
    makeLabel(labelTranslations, div);
    var element = document.createElement(type);
    div.appendChild(element);
    setShowHide(div);
    div.setData = function(data) {
      element.textContent = data;
    };
    return div;
  }

  function staticText(labelTranslations) {
    return staticContent(labelTranslations, 'div')
  }

  function preformattedText(labelTranslations) {
    var p = staticContent(labelTranslations, 'pre');
    var setData = p.setData;
    p.setData = function(d) {
      if (typeof(d) === "string") {
        setData(d.replaceAll('&', '&amp;').replaceAll('<', '&lt;'));
      }
    };
    return p;
  }

  // elements is a dictionary of ids to elements
  function collection(elements, type) {
    // copy of elements
    var sub = {};
    var div = document.createElement(type);
    forEach(elements, function(id, el) {
      sub[id] = el;
      div.appendChild(el);
    });
    setShowHide(div);
    div.setData = function(data) {
      if (typeof(data) === 'object') {
        forEach(sub, function(id, el) {
          setData(el, id in data? data[id] : null);
        });
      } else {
        forEach(sub, function(id, el) {
          setData(el, data);
        });
      }
    };
    div.getData = function() {
      results = {};
      forEach(sub, function(id, el) {
        var r = getData(el);
        if (r) {
          results[id] = r;
        }
      });
      return results;
    };
    div.makeSubElement = function(id) {
      var s = span(div);
      if (id) {
        sub[id] = s;
      }
      return s;
    }
    div.style.zIndex = 1;
    return div;
  }

  function stack(elements) {
    return collection(elements, 'div');
  }

  function banner(elements, className) {
    var b = collection(elements, 'span');
    b.classList.add(className);
    b.style.zIndex = 1;
    setReposition(b);
    return b;
  }

  function withTimeout(fn) {
    return function(callback) {
      fn();
      setTimeout(callback, 200);
    };
  }

  function button(id, fn, translations) {
    var b = makeLabel(translations, null, id);
    b.classList.add('button');
    b.id = 'button-' + id;
    b.tabIndex = 0;
    b.onclick = function() {
      b.classList.add('pressed');
      fn(function() {
        b.classList.remove('pressed');
      });
    };
    setShowHide(b, 'inline-block');
    return b;
  }

  function loadFileButton(id, fn, translations) {
    var b = makeLabel(translations, null, id);
    b.classList.add('button');
    b.tabIndex = 0;
    setShowHide(b, 'inline-block');
    var input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.onchange = function(ev) {
      b.classList.add('pressed');
      fn(input.files[0], function() {
        b.classList.remove('pressed');
      });
    };
    b.appendChild(input);
    return b;
  }

  function wrapper(element, overflow) {
    var div = document.createElement('div');
    setAll(div.style, {
      overflow: overflow,
      display: 'block',
      position: 'fixed'
    });
    div.appendChild(element);
    setShowHide(div, 'block');
    if (typeof(element.setData) === 'function') {
      div.setData = element.setData;
    }
    if (typeof(element.getData) === 'function') {
      div.getData = element.getData;
    };
    return div;
  }

  function scrollingWrapper(element, verticalPadding, horizontalPadding) {
    var vp = typeof(verticalPadding) === 'undefined'? 0 : verticalPadding;
    var hp = typeof(horizontalPadding) === 'undefined'? 0 : horizontalPadding;
    var div = wrapper(element, 'auto');
    div.classList.add('scrolling-wrapper');
    setReposition(div, function(l, t, w, h) {
      setAll(div.style, {
        position: 'fixed',
        left: l + 'px',
        top: t + 'px',
        width: w + hp + 'px',
        height: h + vp + 'px'
      });
    }, function() {
      return getSize(element);
    });
    return div;
  }

  function nonScrollingWrapper(element) {
    element.style.position = 'fixed';
    var div = wrapper(element, 'hidden');
    div.classList.add('nonscrolling-wrapper');
    setReposition(div, function(l, t, w, h) {
      setAll(div.style, {
        position: 'fixed',
        left: l + 'px',
        top: t + 'px',
        width: w + 'px',
        height: h + 'px'
      });
      reposition(element, l, t, w, h);
    });
    return div;
  }

  // Wraps the argument in scrollingWrapper if it has no reposition() method.
  // Also ensures that hide() and show() methods exist.
  function ensureStructural(el) {
    var we = typeof(el.reposition) === 'function'? el : scrollingWrapper(el);
    if (typeof(we.show) !== 'function' || typeof(we.hide) !== 'function') {
      setShowHide(we);
    }
    return we;
  }

  function ensureFunction(fn, defaultFn) {
    return typeof(fn) === 'function'? fn
      : typeof(defaultFn) === 'function'? defaultFn : noop;
  }

  function pages(pageElements, labelTranslations, tabIdPrefix) {
    var tabs = {};
    // a deep copy of pageElements, or wrapped versions as appropriate
    var pages = {};
    var active = null; // ID of page user is looking at
    var returnPage = null; // ID of last page user was looking at
    var container = null;
    var pageContainer = document.createElement('div');
    pageContainer.className = 'tab-body';
    var tabStrip = document.createElement('span');
    setReposition(tabStrip);
    setAll(tabStrip.style, {
      position: 'block',
      zIndex: 1
    });
    setAll(tabStrip, {
      className: 'tab-strip',
      tabIndex: 0
    });
    function tabIsDisabled(id) {
      return tabs[id].classList.contains('disabled');
    }
    tabStrip.onkeydown = function(ev) {
      var other = null;
      if (ev.key === 'ArrowLeft') {
        other = findPrevious(tabs, active);
        while (other && tabIsDisabled(other)) {
          other = findPrevious(tabs, other);
        }
      } else if (ev.key === 'ArrowRight') {
        other = findNext(tabs, active);
        while (other && tabIsDisabled(other)) {
          other = findNext(tabs, other);
        }
      }
      if (other) {
        var otherTab = tabs[other];
        otherTab.click();
        otherTab.focus();
      }
    }
    forEach(pageElements, function(pageId, page) {
      var tab = makeLabel(labelTranslations, tabStrip, pageId);
      if (typeof(tabIdPrefix) === 'string') {
        tab.id = tabIdPrefix + pageId;
      }
      tab.onclick = function() {
        if (tabs[pageId].classList.contains('disabled')) {
          return;
        }
        var s = getSize(container);
        pages[active].hide();
        tabs[active].classList.remove('active');
        active = pageId;
        returnPage = pageId;
        pages[active].show();
        tabs[active].classList.add('active');
        reposition(container, s.left, s.top, s.width, s.height);
      };
      var wpage = ensureStructural(page);
      if (!active) {
        active = pageId;
        tab.classList.add('active');
        wpage.show();
      } else {
        wpage.hide();
      }
      tabStrip.appendChild(tab);
      pageContainer.appendChild(wpage);
      pages[pageId] = wpage;
      tabs[pageId] = tab;
    });
    returnPage = active;
    container = header(tabStrip, pageContainer);
    container.getData = function() {
      var result = {};
      forEach(pages, function(pageId, page) {
        var r = getData(page);
        if (r) {
          result[pageId] = r;
        }
      });
    }
    container.setData = function(data) {
      var first = null;
      forEach(pages, function(pageId, page) {
        if (typeof(page.setData) === 'function') {
          if (pageId in data) {
            if (!first) {
              first = pageId;
            }
            page.setData(data[pageId]);
            tabs[pageId].classList.remove('disabled');
          } else {
            tabs[pageId].classList.add('disabled');
          }
        }
      });
      function enabledPage(id) {
        return id in data || typeof(pages[id].setData) !== 'function';
      }
      var newActive = enabledPage(returnPage)? returnPage
        : enabledPage(active)? active : first;
      if (newActive && newActive !== active) {
        tabs[newActive].click();
      }
    };
    setReposition(pageContainer, function(left, top, width, height) {
      reposition(pages[active], left, top, width, height);
    });
    return container;
  }

  return {
    /**
     * Calls a function for each member of an array or object.
     * 
     * @param {object} a Object or array to be iterated through.
     * @param {function} f Function to call with two arguments: the key
     * of the element (or index in the case of an array) and the value.
     */
    forEach: forEach,
    /**
     * Dereferences an object or array through multiple indices.
     * 
     * \code {deref(o, [a,b,c], d)} is a safe way of doing
     * \code {o[a][b][c]}. If that path does not exist, d is returned.
     * If d is not supplied, null is returned. Any undefined values in
     * path are ignored.
     * @param {object} object The object to be dereferenced.
     * @param {Array} path The series of indices to be applied.
     * @param {any} defaultValue The default value to be returned if
     * the path cannot be followed to the end.
     * @returns {any} Object dereferenced, \code {defaultValue}, or null.
     */
    deref: deref,
    /**
     * Transforms a function that should not be called too often into
     * a function that can be called as often as you like.
     * 
     * The returned function can be called as often as you like with
     * whatever arguments you like. If it is called again within
     * \code{ticks} ticks (a tick is 100ms), this call is ignored. If
     * it is not called again within this time, the arguments are passed
     * on to the delegate function.
     * @param {int} ticks Duration (x 100ms) to wait until calling the
     * delgate function.
     * @param {function} f Delegate function to be called
     * \code{ticks} ticks after the last call to the retuned function.
     * @return Function that can be called often, resulting in fewer
     * calls to the delegate function \code {f}.
     */
    whenQuiet: whenQuiet,
    /**
     * Replaces the \code{<main>} tag in the document with this element.
     * 
     * The element will have its \code{resize} event wired up. If \code{el}
     * is a Toolkit widget, it will be resized correctly when the window is
     * resized.
     * @param {HTMLElement} el The element to set as \code{<main>}
     */
    setAsBody: setAsBody,
    /**
     * Divides a Toolkit widget with a draggable vertical divider.
     *
     * All three parameters should be Toolkit widgets to ensure resizing works
     * correctly.
     * @param {HTMLElement} container The container to divide.
     * @param {HTMLElement} left The element to put on the left of the divider.
     * @param {HTMLElement} right The element to put on the right of the divider.
     */
    verticalDivide: vDivide,
    /**
     * Returns a Toolkit widget consisting of a header and a body.
     * 
     * Both arguments should be Toolkit widgets for resizing to work properly.
     * @param {HTMLElement} hdr The header element.
     * @param {HTMLElement} main The body element.
     * @returns {HTMLElement} The toolkit widget containing the header and body.
     */
    header: header,
    /**
     * Returns a Toolkit widget consisting of a body and a footer.
     * 
     * Both arguments should be Toolkit widgets for resizing to work properly.
     * @param {HTMLElement} ftr The footer element.
     * @param {HTMLElement} main The body element.
     * @returns {HTMLElement} The toolkit widget containing the footer and body.
     */
    footer: footer,
    /**
     * Returns a Toolkit widget for displaying controls horizontally.
     *
     * Returns a Toolkit widget with a \code{makeSubElement} method that adds
     * elements horizontally.
     * @param {Array.<HTMLElement>} elements Initial array of elements to be added.
     * @param {string} className HTML class for the returned banner.
     */
    banner: banner,
    /**
     * Returns a Toolkit widget consisting of a left side bar and a body.
     * 
     * Both arguments should be Toolkit widgets for resizing to work properly.
     * @param {HTMLElement} bar The side bar element.
     * @param {HTMLElement} main The body element.
     * @returns {HTMLElement} The toolkit widget containing the side bar
     * and body.
     * You can set the values for this widgets within this widget by
     * calling its \code{setData} method with an object whose keys are the
     * IDs of the contained widgets and whose values are the values to pass
     * on to thier \code{setData} methods. You can retrieve the values by
     * calling its \code{getData} method, returning an object like you would
     * call \code{setData} with.
     */
    leftSideBar: leftSideBar,
    /**
     * Returns a Toolkit widget consisting of a right side bar and a body.
     * 
     * Both arguments should be Toolkit widgets for resizing to work properly.
     * @param {HTMLElement} bar The side bar element.
     * @param {HTMLElement} main The body element.
     * @returns {HTMLElement} The toolkit widget containing the side bar and body.
     */
    rightSideBar: rightSideBar,
    /**
     * Returns a Toolkit widget just containing one element.
     * 
     * This element gains scrollbars if it is too large for this returned container.
     * @param {HTMLElement} element The element to be wrapped
     * @returns {HTMLElement} Toolkit widget containing the passed element
     */
    scrollingWrapper: scrollingWrapper,
    /**
     * Returns a Toolkit widget just containing one element.
     * 
     * This element does not gain scrollbars if it is too large for this returned
     * container.
     * @param {HTMLElement} element The element to be wrapped
     * @param {int} verticalPadding The number of extra pixels above the element's
     * height to use as the returned widget's default height.
     * @param {int} horizontalPadding The number of extra pixels above the element's
     * width to use as the returned widget's default width.
     * @returns {HTMLElement} Toolkit widget containing the passed element
     * You can set the value for this widget by calling its \code{setData}
     * method, and retrieve it by calling its \code{getData} method.
     */
    nonScrollingWrapper: nonScrollingWrapper,
    /**
     * Returns a text input control.
     * 
     * Any text is permitted unless a \code{validate} function is supplied.
     * @param {string} id: when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLElement} container Optional element to put the control in
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @param {function} validate Optional function returning \code{true}
     * if passed a value that this control should accept or \code{false}
     * otherwise.
     * @returns {HTMLElement} Text input control Toolkit widget
     * You can set the value for this widget by calling its \code{setData}
     * method, and retrieve it by calling its \code{getData} method.
     */
    paramText: paramText,
    /**
     * Returns an integer input control.
     * 
     * Values outside the permitted range will gain the "invalid" class,
     * but there is no other effect.
     * @param {string} id: when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLElement} container Optional element to put the control in
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @param {int} min Minimum permitted value (optional).
     * @param {int} max Maximum permitted value (optional).
     * @returns {HTMLElement} Text input control Toolkit widget
     * You can set the value for this widget by calling its \code{setData}
     * method, and retrieve it by calling its \code{getData} method.
     */
    paramInteger: paramInteger,
    /**
     * Returns a floating point input control.
     * 
     * Values outside the permitted range will gain the "invalid" class,
     * but there is no other effect.
     * @param {string} id: when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLElement} container Optional element to put the control in
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @param {float} min Minimum permitted value (optional).
     * @param {float} max Maximum permitted value (optional).
     * @returns {HTMLElement} Text input control Toolkit widget
     * You can set the value for this widget by calling its \code{setData}
     * method, and retrieve it by calling its \code{getData} method.
     */
    paramFloat: paramFloat,
    /**
     * Returns a colour input control.
     * 
     * @param {string} id: when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLElement} container Optional element to put the control in
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @returns {HTMLElement} Text input control Toolkit widget
     * You can set the value for this widget by calling its \code{setData}
     * method, and retrieve it by calling its \code{getData} method.
     */
    paramColor: paramColor,
    /**
     * Returns a checkbox input control.
     * 
     * @param {string} id: when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLElement} container Optional element to put the control in
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @returns {HTMLElement} Checkbox input control Toolkit widget
     * You can set the value for this widget by calling its \code{setData}
     * method, and retrieve it by calling its \code{getData} method.
     */
    paramBoolean: paramBoolean,
    /**
     * Returns a custom selection box.
     *
     * This is different to a normal selection box because it allows
     * tooltips on the items within the list.
     * @param {string} id: when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLElement} container: HTML element to add the box to. If
     * the container came from \code{optionsPage()} the new selection box
     * will be formatted as a table row.
     * @param {object} labelTranslations: A dictionary with two optional keys;
     * 'name' gives the label to display and 'help' gives HTML help text.
     * 'help' has no effect unless 'name' is also present.
     * @param {Array.<int>} values: An array of the IDs of the options
     * in the selection.
     * @param {object} valueTranslations: A dictionary whose keys are the
     * IDs of the options in the selection, the values are more dictionaries.
     * These dictionaries have two optional keys; \code{'name'} (giving
     * the name to display for this option) and \code{'help'} (giving tooltip
     * HTML text).
     * @param {string} initial: ID of the option to start selecting (optional)
     * @param {function} callback: The (nullary) function to call when the
     * value changes (optional)
     * @returns {HTMLelement} The Toolkit widget selection box.
     * You can set the value for this widget by calling its \code{setData}
     * method, and retrieve it by calling its \code{getData} method.
     */
    paramSelector: paramSelector,
    /**
     * Adds a group title to an [optionsPage].
     * 
     * @param {HTMLElement} container The container, preferably the
     * return value from [optionsPage].
     * @param {object} labelTranslations An object with two keys:
     * \code{'name'} is the display text for this title,
     * \code{'help'} (optional) is the tooltip text.
     */
    groupTitle: groupTitle,
    /**
     * Returns a Toolkit widget for displaying controls vertically.
     *
     * Returns a Toolkit widget with a \code{makeSubElement} method that
     * adds elements vertically. This differs from [stack] in that the labels
     * will be aligned on the left and the controls will be aligned on the
     * right. It would make a nice options page, for example.
     * @returns A Toolkit widget for displaying elements vertically.
     * You can set the values for this widgets within this widget by
     * calling its \code{setData} method with an object whose keys are the
     * IDs of the contained widgets and whose values are the values to pass
     * on to thier \code{setData} methods. You can retrieve the values by
     * calling its \code{getData} method, returning an object like you would
     * call \code{setData} with.
     */
    optionsPage: optionsPage,
    /**
     * An image toolkit widget.
     *
     * @param {function} updateSizeFunction Nullary function called when
     * the object's size is changed.
     * @returns {HTMLElement} Image element. It has a
     * \code{getSize()} method, returning an object with width and height
     * members. This is the width and height set by \code{reposition()},
     * not the actual on-screen width and height, if that is different
     * for some reason. In other words, it returns the width and height
     * the image "should" have.
     */
    image: image,
    /**
     * A static text toolkit widget.
     *
     * This control has a label and actual text content.
     * @param {object} translations An object with keys \code{'name'}
     * for the label displayed by the text and \code{'help'} for tooltop text.
     * @returns {HTMLElement} The static text element. The text content
     * can be set by calling its \code{setData()} function. This text can
     * include HTML entities, so you might want to replace \code{&}
     * with \code{&amp;} and \code{<} with \code{&lt;} if it is plain
     * text.
     */
    staticText: staticText,
    /**
     * A static text toolkit widget in a preformatted style.
     *
     * This control has a label and actual text content.
     * @param {object} translations An object with keys \code{'name'}
     * for the label displayed by the text and \code{'help'} for tooltop text.
     * @returns {HTMLElement} The static text element. The text content
     * can be set by calling its \code{setData()} function with any plain
     * text.
     */
     preformattedText: preformattedText,
    /**
     * Returns a Toolkit widget button.
     *
     * @param {string} id The HTML id of the button will be
     * \code{'button-' + id}. It is also used in the interpretation of
     * the \code{translations} argument.
     * @param {function} fn Unary function that takes a single parameter
     * of a nullary function. This function will be called on completion
     * of the work (which will be used to remove the button's 'click'
     * animation). If the function want to use as a callback does not take
     * an argument, you can wrap it in [withTimeout]. You might also want
     * to use [withTimeout] if your function returns too quickly, otherwise
     * the user might not see the button click.
     * @param {object} translations An object with a key \code{id}
     * having a value that is an object having a key \code{'name'}
     * with value the display name of the button, and optionally a key
     * \code{'help'} with value of the tooltip text.
     */
    button: button,
    /**
     * Returns a Toolkit widget button that uploads a file from the client.
     * 
     * @param {string} id The HTML id of the button will be
     * \code{'button-' + id}. It is also used in the interpretation of
     * the \code{translations} argument.
     * @param {function} fn A binary callback function. Its two
     * parameters are the File object uploaded and a (nullary)
     * function that will be called when the operation completes.
     * @param {object} translations An object with a key \code{id}
     * having a value that is an object having a key \code{'name'}
     * with value the display name of the button, and optionally a key
     * \code{'help'} with value of the tooltip text.
     */
    loadFileButton: loadFileButton,
    /**
     * Adds a fake callback argument to a nullary function.
     * 
     * Perhaps you have a nullary function that you want called
     * when the user clicks a button, but the [button] function wants
     * a unary function that has a completion callback so that the
     * button knows when to pop back up again. In this situation
     * you might wrap your function with a call to [withTimeout].
     * @param {function} fn Nullary function to wrap.
     * @returns {function} Unary function (taking one function as
     * an argument) that simply calls \code{fn} immediately then
     * calls its argument again after 200ms.
     */
    withTimeout: withTimeout,
    /**
     * Returns a Toolkit widget for displaying controls vertically.
     *
     * Returns a Toolkit widget with a \code{makeSubElement} method that adds
     * elements vertically.
     * @param {Array.<HTMLElement>} elements Initial array of elements to be added.
     * @returns A Toolkit widget for displaying elements vertically.
     * You can set the values for this widgets within this widget by
     * calling its \code{setData} method with an object whose keys are the
     * IDs of the contained widgets and whose values are the values to pass
     * on to thier \code{setData} methods. You can retrieve the values by
     * calling its \code{getData} method, returning an object like you would
     * call \code{setData} with.
     */
    stack: stack,
    /**
     * Returns a Toolkit widget for displaying controls in tabbed pages.
     * 
     * Only one page will be visible at a time. The returned widget
     * has \code{getData} and \code{setData} methods that take or
     * return (respectively) an object with keys that are the IDs of the
     * pages.
     * @param {object} pageElements: dictionary of pageIds to elements
     * (that will be added to the return value of this function). These
     * elements each need methods \code{show}, \code{hide} and
     * \code{setData} (like the ones returned by [image], [dataTable],
     * [stack], [staticText], [optionsPage]; that is to say, Toolkit widgets)
     * if they are to be output pages. Only \code{show} and \code{hide}
     * if they are to be available permanently and not be set through the
     * \code{setData} call.
     * @param {object} labelTranslations dictionary of pageIds to objects
     * with keys \code{name} (for the label text) and \code{help} (for
     * tooltip help HTML)
     * @param {string} tabIdPrefix If you want HTML IDs for your tab
     * elements, set this and the ID will be set to
     * \code{tabIdPrefix + pageId}.
     * @returns {HTMLElement} A Toolkit widget that has the tabs and the
     * tabs that switch between them. The active tab has the "active" class.
     * It has the following extra methods: \code{setData(data)}: data is
     * a dictionary with keys matching the pageIds. The values are passed
     * to the \code{setData()} functions of the corresponding elements.
     * Pages without any data (and their corresponding radio buttons) are
     * summarily disabled. Pages with data are enabled.
     * \code{reposition()}: sets each page to the same dimensions as the
     * container and calls each page's \code{reposition()} method (if it
     * exists).
     */
    pages: pages,
  };
}();
