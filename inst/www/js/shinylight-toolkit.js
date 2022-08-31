/**
 * @namespace toolkit
 */
var toolkit = function() {

  function forEach(a, f) {
    var k = Object.keys(a), i = 0;
    for (; i !== k.length; ++i) {
      var ki = k[i];
      f(ki, a[ki]);
    }
  }

  function any(a, p) {
    var k = Object.keys(a), i = 0;
    for (; i !== k.length; ++i) {
      var ki = k[i];
      if (p(ki, a[ki])) {
        return true;
      }
    }
    return false;
  }

  function all(a, p) {
    var k = Object.keys(a), i = 0;
    for (; i !== k.length; ++i) {
      var ki = k[i];
      if (!p(ki, a[ki])) {
        return false;
      }
    }
    return true;
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

  // runs a function on each descendent element of e (not including e itself)
  function forEachDescendent(e, fn) {
    forEach(e.children, function(i, c) {
      fn(c);
      forEachDescendent(c, fn);
    });
  }

  // Finds the nearest ancestor of e (including e itself) with class cls.
  // Returns null if no such element.
  function findAncestor(e, cls) {
    while (e) {
      if (e.classList.contains(cls)) {
        return e;
      }
      e = e.parentElement;
    }
    return null;
  }

  // Creates a container for existing header/footer/sideBar and main section.
  // When the container is resized, its reposition() method
  // should be called. This will set the main section to the same
  // width as the container but its height to the new container
  // height minus the height of the header.
  // If the main section has a reposition() method it will be called
  // after it is resized.
  // ahead is true for left or header (where the sidebar needs to be added
  // ahead of the main section), false for right or footer (where the sidebar
  // needs to be added behind the main bar).
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
    return sideBarGeneric(bar, main, false, function(l, t, w, h) {
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

  // Like header, but overlayed
  function overlay(overlay, main) {
    overlay.style.zIndex = 1;
    return sideBarGeneric(overlay, main, false, function(l, t, w, h) {
      reposition(overlay, l, t, w, h);
      reposition(main, l, t, w, h);
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
      height: dimensions.height + 'px',
      zIndex: -1
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

  function div(container) {
    var s = document.createElement('div');
    s.addElement = function(el) {
      s.appendChild(el);
    }
    setShowHide(s, 'block');
    if (typeof(container) !== 'undefined') {
      container.appendChild(s);
    }
    return s;
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
    table.setData = function(data) {
      forEach(sub, function(id, el) {
        if (typeof(el.setData) === 'function' && id in data) {
          el.setData(data[id]);
        }
      });
    };
    return table;
  }

  function firstLeafValue(obj) {
    var first = Object.keys(obj)[0];
    var v = obj[first];
    if (typeof(v) === 'object') {
      return firstLeafValue(v);
    }
    return v;
  }

  function preventdefault(ev) {
    ev.preventDefault();
  }

  /**
   * Creates a dropdown for a selector box
   * @param {object} values List of IDs in the list
   * @param {string} selectorId ID of the container
   * @param {object} valueTranslations Translation object, mapping
   * value ids to {name:, help:} objects.
   * @param {object} optionNames Object into which ID to names mappings are put
   * @param {function} setData setData(id, text, elt) is to be called when the
   * value id (with translated name 'text') is selected; elt is the element in the
   * dropdown corresponding to this option.
   * @param {function} focus Function that focuses the whole control and sets
   * the passed element as highlighted.
   * @return {HTMLElement} The dropdown created.
   */
  function selectorDropdown(
    values, selectorId, valueTranslations, optionNames, setData, focus
  ) {
    var idPrefix = selectorId? selectorId + '-' : '';
    var dropDown = document.createElement('table');
    dropDown.classList.add('dropdown');
    forEach(values, function(k, v) {
      var id = v;
      var postfix = '';
      var cascade = false;
      if (typeof(v) === 'object') {
        if (v.length === 1) {
          id = v[0];
        } else {
          id = k;
          postfix = '\u25bc';
          cascade = true;
        }
      }
      var optr = document.createElement('tr');
      optr.classList.add('param-option');
      var opt = document.createElement('td');
      opt.id = idPrefix + id;
      opt.style.padding = '0px';
      var trs = id in valueTranslations? valueTranslations[id] : {};
      var name = 'name' in trs? trs.name : id;
      opt.textContent = name + postfix;
      optionNames[id] = name;
      optr.appendChild(opt);
      dropDown.appendChild(optr);
      if ('help' in trs) {
        var h = document.createElement('span')
        h.className = "option-tooltip";
        h.innerHTML = trs.help;
        optr.appendChild(h);
      }
      optr.onmousedown = preventdefault;
      optr.onmousemove = preventdefault;
      optr.onmouseenter = preventdefault;
      if (cascade) {
        optr.classList.add('param-option-cascade');
        opt.onmouseup = function(ev) {
          if (dd.classList.contains('open')) {
            dd.classList.remove('open');
          } else {
            dd.classList.add('open');
            focus(optr);
          }
          ev.preventDefault();
        };
        optr.optionId = null;
        var dd = selectorDropdown(
          v, selectorId, valueTranslations, optionNames, setData, focus
        );
        optr.appendChild(dd);
      } else {
        optr.onmouseup = function(ev) {
          setData(id, name, optr);
          ev.preventDefault();
        }
        optr.optionId = id;
      }
    });
    dropDown.style.position = 'absolute';
    return dropDown;
  }

  function paramSelector(
    id, container, labelTranslations, values,
    valueTranslations, initial, callback
  ) {
    var box = typeof(container.makeSubElement) === 'function'?
      container.makeSubElement(id) : span(container);
    if (typeof(initial) === 'undefined' || initial === null) {
      initial = firstLeafValue(values);
    }
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
    var highlightedElement = null;
    function closeDropDown() {
      if (highlightedElement) {
        highlightedElement.classList.remove('highlighted');
        highlightedElement = null;
      }
      forEachDescendent(box, function(e) {
        e.classList.remove('open');
      });
    };
    var selectedOption = null;
    var optionNames = {};
    var dropDown = selectorDropdown(
      values,
      id,
      valueTranslations,
      optionNames,
      function(opt, text, elt) {
        closeDropDown();
        box.setData(opt);
        buttonText.textContent = text;
        highlightedElement = elt;
      },
      function(elt) {
        highlightedElement = elt;
        box.focus();
      }
    );
    buttonText.onmousedown = downArrow.onmousedown = function(ev) {
      if (dropDown.classList.contains('open')) {
        dropDown.classList.remove('open');
      } else {
        dropDown.classList.add('open');
        box.focus();
      }
      ev.preventDefault();
    }
    button.onmousemove = function(ev) {
      ev.preventDefault();
    }
    box.className = 'param-box';
    box.addElement(makeLabel(labelTranslations));
    button.appendChild(dropDown);
    box.addElement(button);
    function setSelected(value) {
      if (selectedOption !== value && value in optionNames) {
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
      if (!highlightedElement) {
        if (ev.key === 'ArrowDown' || ev.key === 'Space' || ev.key === 'Enter') {
          goTo = dropDown.getElementsByClassName('param-option').item(0);
          dropDown.classList.add('open');
        }
      } else if (ev.key === 'ArrowDown') {
        goTo = highlightedElement.nextElementSibling;
      } else if (ev.key === 'ArrowUp') {
        goTo = highlightedElement.previousElementSibling;
      } else if (ev.key === 'ArrowRight') {
        if (highlightedElement && highlightedElement.classList.contains('param-option-cascade')) {
          var dd = highlightedElement.getElementsByClassName('dropdown').item(0);
          if (dd) {
            dd.classList.add('open');
            goTo = dd.getElementsByClassName('param-option').item(0);
          }
        }
      } else if (ev.key === 'ArrowLeft') {
        var e = findAncestor(highlightedElement.parentElement, 'dropdown');
        if (e) {
          e.classList.remove('open');
        }
        if (e === dropDown) {
          highlightedElement.classList.remove('highlighted');
          highlightedElement = null;
        } else {
          goTo = findAncestor(e, 'param-option');
        }
      } else if (ev.key === 'Space' || ev.key === 'Enter' || ev.key === 'Tab') {
        var id = highlightedElement.optionId;
        if (id) {
          box.setData(id);
        }
        closeDropDown();
      } else if (ev.key === 'Escape') {
        closeDropDown();
      } else {
        return;
      }
      if (goTo) {
        if (highlightedElement) {
          highlightedElement.classList.remove('highlighted');
        }
        highlightedElement = goTo;
        goTo.classList.add('highlighted');
      }
    };
    box.onblur = closeDropDown;
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

  function progressBar(height) {
    var value = 0.0;
    var width = 1;
    var background = document.createElement('div');
    background.className = 'progress-bar-background';
    var bar = document.createElement('div');
    bar.className = 'progress-bar-foreground';
    background.appendChild(bar);
    setShowHide(background);
    background.setData = function(v) {
      value = v;
      bar.style.width = width * v + 'px';
    };
    background.getData = function() {
      return value;
    };
    setReposition(background, function(l, t, w, h) {
      width = w;
      if (typeof(height) !== 'undefined') {
        h = height;
      }
      setAll(background.style, {
        position: 'fixed',
        left: l + 'px',
        top: t + 'px',
        width: w + 'px',
        height: h + 'px'
      });
      setAll(bar.style, {
        position: 'fixed',
        left: l + 'px',
        top: t + 'px',
        width: w * value + 'px',
        height: h + 'px'
      });
    }, function() {
      if (typeof(height) === 'undefined' || !height) {
        return null;
      }
      return {
        left: 0, top: 0, width: 100, height: height
      };
    });
    return background;
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

  function staticContent(id, container, labelTranslations, type) {
    const box = typeof(container.makeSubElement) === 'function'?
      container.makeSubElement(id) : div(container);
    box.addElement(makeLabel(labelTranslations));
    const element = document.createElement(type);
    element.className = 'static-text';
    box.addElement(element);
    box.setData = function(data) {
      element.textContent = data;
    };
    return box;
  }

  function staticText(id, container, labelTranslations) {
    return staticContent(id, container, labelTranslations, 'div')
  }

  function preformattedText(id, container, labelTranslations) {
    var p = staticContent(id, container, labelTranslations, 'pre');
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
    var div = document.createElement(type);
    var sub = {};
    if (typeof(elements) === 'object') {
      forEach(elements, function(id, el) {
        sub[id] = el;
        div.appendChild(el);
      });
    }
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

  function defaultCreateFileInput(uploaded, done) {
    var input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.show = noop;
    input.onchange = function(ev) {
      uploaded(input.files[0], done);
    }
    return input;
  }

  function loadFileButton(id, fn, translations, createFileInput) {
    if (typeof(createFileInput) !== 'function') {
      createFileInput = defaultCreateFileInput;
    }
    var b = makeLabel(translations, null, id);
    b.id = 'button-' + id;
    b.classList.add('button');
    b.tabIndex = 0;
    setShowHide(b, 'inline-block');
    var input = createFileInput(fn, function() {
      b.classList.remove('pressed');
    });
    input.id = 'load-file';
    b.onclick = function(ev) {
      input.show();
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

  function nonScrollingWrapper(element, verticalPadding, horizontalPadding) {
    const vp = typeof(verticalPadding) === 'undefined'? 0 : verticalPadding;
    const hp = typeof(horizontalPadding) === 'undefined'? 0 : horizontalPadding;
    element.style.position = 'fixed';
    const div = wrapper(element, 'hidden');
    div.classList.add('nonscrolling-wrapper');
    setReposition(div, function(l, t, w, h) {
      setAll(div.style, {
        position: 'fixed',
        left: l + 'px',
        top: t + 'px',
        width: w + 'px',
        height: h + 'px'
      });
      reposition(element, l + hp, t + vp, w - 2*hp, h - 2*vp);
    }, function() {
      let s = getSize(element);
      return {
        left: s.left - hp,
        top: s.top - vp,
        width: s.width + 2*hp,
        height: s.height + 2*vp
      };
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
     * @function
     * @description
     * Calls a function for each member of an array or object.
     *
     * @param {object} a Object or array to be iterated through.
     * @param {function} f Function to call with two arguments: the key
     * of the element (or index in the case of an array) and the value.
     */
    forEach: forEach,
    /**
     * @function
     * @description
     * Finds if a predicate is true for any member of an array or object.
     *
     * Calls a function for each member of an array or object until either
     * one of them returns true (in which case \code{any} returns true) or
     * we run out of elements (in which case \code{any} returns false).
     * @param {object} a Object or array to be iterated through.
     * @param {function} p Function to call with two arguments: the key
     * of the element (or index in the case of an array) and the value;
     * should return a boolean.
     */
     any: any,
    /**
     * @function
     * @description
     * Finds if a predicate is true for all members of an array or object.
     *
     * Calls a function for each member of an array or object until either
     * one of them returns false (in which case \code{all} returns false) or
     * we run out of elements (in which case \code{all} returns true).
     * @param {object} a Object or array to be iterated through.
     * @param {function} p Function to call with two arguments: the key
     * of the element (or index in the case of an array) and the value;
     * should return a boolean.
     */
     all: all,
     /**
     * @function
     * @description
     * Dereferences an object or array through multiple indices.
     *
     * \code{deref(o, [a,b,c], d)} is a safe way of doing
     * \code{o[a][b][c]}. If that path does not exist, d is returned.
     * If d is not supplied, null is returned. Any undefined values in
     * path are ignored.
     * @param {object} object The object to be dereferenced.
     * @param {Array} path The series of indices to be applied.
     * @param {any} defaultValue The default value to be returned if
     * the path cannot be followed to the end.
     * @returns {any} Object dereferenced, \code{defaultValue}, or null.
     */
    deref: deref,
    /**
     * @function
     * @description
     * Transforms a function that should not be called too often into
     * a function that can be called as often as you like.
     *
     * The returned function can be called as often as you like with
     * whatever arguments you like. If it is called again within
     * \code{ticks} ticks (a tick is 100ms), this call is ignored. If
     * it is not called again within this time, the arguments are passed
     * on to the delegate function. In other words, in a string of calls
     * less than \code{ticks} x 100ms apart from each other, only
     * the last of these calls actually happens.
     * @param {int} ticks Duration (x 100ms) to wait until calling the
     * delgate function.
     * @param {function} f Delegate function to be called
     * \code{ticks} ticks after the last call to the retuned function.
     * @return {function} Function that can be called often, resulting in fewer
     * calls to the delegate function \code{f}.
     */
    whenQuiet: whenQuiet,
    /**
     * @function
     * @description
     * Replaces the \code{<main>} tag in the document with this element.
     *
     * The element will have its \code{resize} event wired up. If \code{el}
     * is a Toolkit Positioned Element, it will be resized correctly when the
     * window is resized.
     * @param {HTMLElement} el The element to set as \code{<main>}
     */
    setAsBody: setAsBody,
    /**
     * @function
     * @description
     * Left/right panels with a draggable divider.
     *
     * Returns a Positioned Element with a draggable vertical divider
     * bordering two other Positioned Elements.
     * @param {HTMLPositionedElement} container The container to divide.
     * If null, a container will be created for you.
     * @param {HTMLPositionedElement} left The element to put on
     * the left of the divider.
     * @param {HTMLPositionedElement} right The element to put
     * on the right of the divider.
     * @returns {HTMLPositionedElement} The element created.
     * If a container was provided it is this argument.
     */
    verticalDivide: vDivide,
    /**
     * @function
     * @description
     * A panel with a smaller header.
     *
     * Returns a Positioned Element consisting of a header and a body.
     * @param {HTMLElement} hdr The header element.
     * @param {HTMLPositionedElement} main The body element.
     * @returns {HTMLPositionedElement} The element containing
     * the header and body.
     */
    header: header,
    /**
     * @function
     * @description
     * A panel with a smaller footer.
     *
     * Returns a Positioned Element consisting of a body and a footer.
     * @param {HTMLElement} ftr The footer element.
     * @param {HTMLPositionedElement} main The body element.
     * @returns {HTMLPositionedElement} The element containing
     * the footer and body.
     */
    footer: footer,
    /**
     * @function
     * @description
     * Returns a Container Element for displaying controls horizontally.
     * @param {Array.<HTMLControlElement>} elements Initial array of elements to be added.
     * @param {string} className HTML class for the returned banner.
     * @returns {HTMLContainerElement} The banner element.
     */
    banner: banner,
    /**
     * @function
     * @description
     * A panel with a side bar.
     *
     * Returns a Positioned Element consisting of a left side bar and a body.
     * @param {HTMLElement} bar The side bar element.
     * @param {HTMLPositionedElement} main The body element.
     * @returns {HTMLPositionedElement} The Toolkit Positioned Element containing
     * the side bar and body.
     */
    leftSideBar: leftSideBar,
    /**
     * @function
     * @description
     * A panel with a side bar.
     *
     * Returns a Positioned Element consisting of a right side bar and a body.
     * @param {HTMLElement} bar The side bar element.
     * @param {HTMLPositionedElement} main The body element.
     * @returns {HTMLPositionedElement} The Toolkit Positioned Element containing
     * the side bar and body.
     */
    rightSideBar: rightSideBar,
    /**
     * @function
     * @description
     * A panel with an overlay.
     *
     * Returns a Positioned Element consisting of two elements
     * placed in the same position. To be able to see the lower (main)
     * element you must either call \code{hide()} on the overlay,
     * or make it transparent with CSS.
     * @param {HTMLElement} overlay The higher element. Any
     * \code{getData()} or \code{setData()} call on the
     * returned element will not be passed on to this overlay element.
     * @param {HTMLPositionedElement} main The lower element.
     * @returns {HTMLPositionedElement} The element containing both elements.
     */
     overlay: overlay,
     /**
     * @function
     * @description
     * Returns a Positioned Element just containing one element.
     *
     * This element gains scrollbars if it is too large for this returned container.
     * @param {HTMLElement} element The element to be wrapped
     * @param {int} verticalPadding The number of extra pixels above the element's
     * height to use as the returned element's default height.
     * @param {int} horizontalPadding The number of extra pixels above the element's
     * width to use as the returned element's default width.
     * @returns {HTMLPositionedElement} The wrapper.
     */
    scrollingWrapper: scrollingWrapper,
    /**
     * @function
     * @description
     * Returns a Positioned Element just containing one element.
     *
     * This element does not gain scrollbars if it is too large for this returned
     * container, and it will try to take up its full size in the layout.
     * @param {HTMLElement} element The element to be wrapped
     * @param {int} verticalPadding The number of extra pixels above the element's
     * height to use as the returned element's default height.
     * @param {int} horizontalPadding The number of extra pixels above the element's
     * width to use as the returned element's default width.
     * @returns {HTMLPositionedElement} The wrapper.
     */
    nonScrollingWrapper: nonScrollingWrapper,
    /**
     * @function
     * @description Makes a label suitable for labelling a control.
     *
     * The label has translatable text and a help tooltip (if translated for).
     * @param {object} translations \code{translations[id].name} is the string
     * to use as label's text, \code{translations[id].help} is the string to use as
     * the label's tooltip. If \code{id} is undefined or null, \code{translations.name}
     * and \code{translations.help} are used.
     * @param {HTMLControlContainerElement} [container] Where to put the
     * label.
     * @param {string} [id] Where to look in \code{translations} for the text.
     * @param {string} [idFor] The \code{id} attribute of the HTML element
     * that this element refers to.
     * @returns {HTMLElement} The label.
     */
    makeLabel: makeLabel,
    /**
     * @function
     * @description Returns a text input Toolkit Control.
     *
     * Any text is permitted unless a \code{validate} function is supplied.
     * @param {string} id when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLContainerElement} [container] Where to put the control.
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @param {function} validate Optional function returning \code{true}
     * if passed a value that this control should accept or \code{false}
     * otherwise.
     * @returns {HTMLControlElement} Text input control.
     */
    paramText: paramText,
    /**
     * @function
     * @description
     * Returns an integer input Toolkit Control.
     *
     * Values outside the permitted range will gain the "invalid" class,
     * but there is no other effect.
     * @param {string} id when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLContainerElement} [container] Where to put the control.
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @param {int} min Minimum permitted value (optional).
     * @param {int} max Maximum permitted value (optional).
     * @returns {HTMLControlElement} Text input control.
     */
    paramInteger: paramInteger,
    /**
     * @function
     * @description
     * Returns a floating point input Toolkit Control.
     *
     * Values outside the permitted range will gain the "invalid" class,
     * but there is no other effect.
     * @param {string} id when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLContainerElement} [container] Where to put the control.
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @param {float} min Minimum permitted value (optional).
     * @param {float} max Maximum permitted value (optional).
     * @returns {HTMLControlElement} Text input control.
     */
    paramFloat: paramFloat,
    /**
     * @function
     * @description
     * Returns a colour input Toolkit Control.
     *
     * It is a standard HTML input control with type \code{color}. The value
     * returned is a six-hex-digit string prefixed with a \code{#}.
     * @param {string} id when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLContainerElement} [container] Where to put the control.
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @returns {HTMLControlElement} Text input control.
     */
    paramColor: paramColor,
    /**
     * @function
     * @description
     * Returns a checkbox input Toolkit Control.
     *
     * A control for a boolean value rendered as a checkbox.
     * @param {string} id when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLContainerElement} [container] Where to put the control.
     * @param {object} translations Optional mapping: \code{translations.id}
     * is the name of the control to be displayed and \code{translations.help}
     * is help text to be displayed if the user hovers over the label
     * @param {string} initial Optional initial value for the control
     * @param {function} callback Optional function to be called whenever the
     * input value changes
     * @returns {HTMLControlElement} Checkbox input control.
     */
    paramBoolean: paramBoolean,
    /**
     * @function
     * @description
     * Returns a custom selection box Toolkit Control.
     *
     * This is different to a normal selection box because it allows
     * tooltips on the items within the list.
     * @param {string} id when \code{getData} or \code{setData} is
     * called on the container, the value at \code{'id'} refers to this
     * selector. The HTML id is set to \code{'param-' + id}.
     * @param {HTMLContainerElement} [container] Where to put the control.
     * the container came from \code{optionsPage()} the new selection box
     * will be formatted as a table row.
     * @param {object} labelTranslations A dictionary with two optional keys;
     * 'name' gives the label to display and 'help' gives HTML help text.
     * 'help' has no effect unless 'name' is also present.
     * @param {Array<int>} values An array of the IDs of the options
     * in the selection.
     * @param {object} valueTranslations A dictionary whose keys are the
     * IDs of the options in the selection, the values are more dictionaries.
     * These dictionaries have two optional keys; \code{'name'} (giving
     * the name to display for this option) and \code{'help'} (giving tooltip
     * HTML text).
     * @param {string} initial ID of the option to start selecting (optional)
     * @param {function} callback The (nullary) function to call when the
     * value changes (optional)
     * @returns {HTMLControlElement} The selection box.
     */
    paramSelector: paramSelector,
    /**
     * @function
     * @description Option group title
     *
     * Adds a group title to an {@link toolkit.optionsPage}.
     * @param {HTMLElement} container The container, preferably the
     * return value from {@link toolkit.optionsPage}.
     * @param {object} labelTranslations An object with two keys:
     * \code{'name'} is the display text for this title,
     * \code{'help'} (optional) is the tooltip text.
     */
    groupTitle: groupTitle,
    /**
     * @function
     * @description
     * Returns a Container Element for displaying controls vertically.
     *
     * Returns an element with a \code{makeSubElement} method that
     * adds elements vertically. This differs from {@link toolkit.stack} in that the
     * labels will be aligned on the left and the controls will be aligned on the
     * right. It would make a nice options page, for example.
     * @returns {HTMLContainerElement} A Container Element for displaying elements vertically.
     */
    optionsPage: optionsPage,
    /**
     * Returns a Container Element for displaying controls
     * vertically.
     *
     * Returns a Container Element with a
     * \code{makeSubElement} method that adds elements vertically,
     * with the labels above the controls they correspond to.
     * @param {Array.<HTMLElement>} elements Initial array of elements to be added.
     * @returns {HTMLContainerElement} A Container Element for displaying elements vertically.
     */
    stack: function (elements) {
      return collection(elements, 'div');
    },
    /**
     * @function
     * @description
     * An image element.
     *
     * @param {function} updateSizeFunction Nullary function called when
     * the object's size is changed.
     * @returns {HTMLPositionedElement} Image element. It has a
     * \code{getSize()} method, returning an object with width and height
     * members. This is the width and height set by \code{reposition()},
     * not the actual on-screen width and height, if that is different
     * for some reason. In other words, it returns the width and height
     * the image "should" have.
     */
    image: image,
    /**
     * @function
     * @description
     * A static text Toolkit Control.
     *
     * This element is like a control in that it has a label and actual
     * text content, but it is not interactive.
     * @param {string} id The ID of this control within the container
     * @param {HTMLContainerElement} [container] Where to put the control.
     * @param {object} translations An object with keys \code{'name'}
     * for the label displayed by the text and \code{'help'} for tooltop text.
     * @returns {HTMLControlElement} The static text element. The text
     * content can be set by calling its \code{setData()} function. This text
     * can include HTML entities, so you might want to replace \code{&}
     * with \code{&amp;} and \code{<} with \code{&lt;} if it is plain
     * text.
     */
    staticText: staticText,
    /**
     * @function
     * @description
     * A static text Toolkit Control in a preformatted style.
     *
     * This element is like a control in that it has a label and actual
     * text content, but it is not interactive.
     * @param {string} id The ID of this control within the container
     * @param {HTMLContainerElement} [container] Where to put the control.
     * @param {object} translations An object with keys \code{'name'}
     * for the label displayed by the text and \code{'help'} for tooltop text.
     * @returns {HTMLControlElement} The static text element. The text content
     * can be set by calling its \code{setData()} function with any plain
     * text.
     */
     preformattedText: preformattedText,
    /**
     * @function
     * @description
     * Returns a button.
     *
     * This button is an HTML element, but it is not an HTML button.
     * Styling and JavaScript provide the button-like look-and-feel.
     * @param {string} id The HTML id of the button will be
     * \code{'button-' + id}. It is also used in the interpretation of
     * the \code{translations} argument.
     * @param {function} fn Unary function that takes a single parameter
     * of a nullary function. This function will be called on completion
     * of the work (which will be used to remove the button's 'click'
     * animation). If the function want to use as a callback does not take
     * an argument, you can wrap it in {@link toolkit.withTimeout}. You
     * might also want to use {@link toolkit.withTimeout} if your
     * function returns too quickly, otherwise the user might not see
     * the button click.
     * @param {object} translations An object with a key \code{id}
     * having a value that is an object having a key \code{'name'}
     * with value the display name of the button, and optionally a key
     * \code{'help'} with value of the tooltip text.
     * @returns {HTMLElement} The button.
     */
    button: button,
    /**
     * @function
     * @description
     * Returns a button that uploads a file from the client.
     *
     * This button is an HTML element, but it is not an HTML button.
     * Styling and JavaScript provide the button-like look-and-feel.
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
     * @param {function} [createFileInput] A function to create an element that
     * uploads a file. By default this is a normal \code{<input type="file">}
     * with an extra \code{show} member function that does nothing.
     * The function takes two parameters: \code{uploadFn} and \code{doneFn}.
     * \code{uploadFn} must be called when a file has been chosen for upload;
     * it takes two parameters: a File object and a callback function that is
     * called on completion. You should either pass \code{doneFn} as this
     * second parameter, or a function that performs some actions then
     * calls \code{doneFn()} itself. The return value of \code{createFileInput}
     * should be the element itself, monkey-patched to include a \code{show()}
     * method that will be called when the Load button is clicked.
     * @returns {HTMLElement} The button.
     */
    loadFileButton: loadFileButton,
    /**
     * @function
     * @description
     * Adds a fake callback argument to a nullary function.
     *
     * Perhaps you have a nullary function that you want called
     * when the user clicks a button, but the {@link toolkit.button}
     * function wants a unary function that has a completion callback
     * so that the button knows when to pop back up again. In this
     * situation you might wrap your function with a call to
     * {@link toolkit.withTimeout}.
     * @param {function} fn Nullary function to wrap.
     * @returns {function} Unary function (taking one function as
     * an argument) that simply calls \code{fn} immediately then
     * calls its argument again after 200ms.
     */
    withTimeout: withTimeout,
    /**
     * @function
     * @description
     * Returns a Positioned Element for displaying controls in
     * tabbed pages.
     *
     * Only one page will be visible at a time. The returned element
     * has \code{getData} and \code{setData} methods that take or
     * return (respectively) an object with keys that are the IDs of the
     * pages.
     * @param {object} pageElements dictionary of pageIds to elements
     * (that will be added to the return value of this function). These
     * elements each need methods \code{show}, \code{hide} and
     * \code{setData} (like the ones returned by {@link toolkit.header},
     * {@link toolkit.scrollingWrapper},
     * {@link toolkit.nonScrollingWrapper}, {@link toolkit.leftSideBar},
     * (that is to say, Positioned Elements) if they are to be
     * output pages. Only \code{show} and \code{hide} if they are to be
     * available permanently and not be set through the \code{setData} call.
     * @param {object} labelTranslations dictionary of pageIds to objects
     * with keys \code{name} (for the label text) and \code{help} (for
     * tooltip help HTML)
     * @param {string} tabIdPrefix If you want HTML IDs for your tab
     * elements, set this and the ID will be set to
     * \code{tabIdPrefix + pageId}.
     * @returns {HTMLPositionedElement} An element that has the
     * tabs and the tabs that switch between them. The active tab has
     * the "active" class. It has the following extra methods:
     * \code{setData(data)}: data is a dictionary with keys matching the
     * pageIds. The values are passed to the \code{setData()} functions
     * of the corresponding elements. Pages without any data (and their
     * corresponding radio buttons) are summarily disabled. Pages with
     * data are enabled. \code{reposition()}: sets each page to the same
     * dimensions as the container and calls each page's
     * \code{reposition()} method (if it exists).
     */
    pages: pages,
    /**
     * @function
     * @description
     * Returns a Positioned Element progress bar.
     *
     * The progress is set by calling the \code{setData()} method.
     * @return {HTMLPositionedElement} The progress bar element.
     */
    progressBar: progressBar,
  };
}();

/**
 * @class HTMLPositionedElement
 * @property {function} setSize
 * Sets the position of the element on the document in pixels, with parameters
 * for left, top, width and height in that order.
 * @property {function} getSize
 * Returns an object with members \code{left}, \code{top}, \code{width}
 * and \code{height} for the position of the element.
 * @property {function} hide
 * Makes the element invisible and non-interactive
 * @property {function} show
 * makes the element visible and (potentially) interactive
 * @description
 * A monkey-patched \code{HTMLElement} with some extra methods.
 * 
 * Certain elements returned by Toolkit methods are Positioned Elements. It is
 * necessary for elements in some places in the document to be Positioned
 * Elements for the document resizing and formatting to work.
 * 
 * If you have an HTML element that is not a Positioned Element that you want
 * to add to a place where only Positioned Elements are required, wrap it in
 * {@link toolkit.scrollingWrapper} or {@link toolkit.nonScrollingWrapper}.
 */

/**
 * @class HTMLContainerElement
 * @property {function} makeSubElement
 * Gets an element in which a control and its label can be stored. You do not need
 * to call this unless you have made your own custom control; it will be called
 * by functions such as {@link toolkit.paramText}. Pass in the ID of the control
 * (you will need the ID for the \code{getData} and \code{setData} calls).
 * @property {function} getData Returns an object mapping contained
 * controls (or nested containers) to their current values.
 * @property {function} setData Sets the values
 * of the contained controls. \code{data} is a mapping from the IDs of
 * the contained controls to the data that should be set on them.
 * @description
 * A monkey-patched \code{HTMLElement}.
 * 
 * A Container Element is an element for displaying a set of controls and their labels.
 * @see \code{\link{toolkit.stack}}
 * @see \code{\link{toolkit.banner}}
 * @see \code{\link{toolkit.optionsPage}}
 */

/**
 * @class HTMLControlContainerElement
 * @property {function} addElement
 * Adds an element. Should be called once with a control's label, and then
 * again with the control itself.
 * @description
 * A container for a single control.
 * @see \code{\link{toolkit.HTMLContainerElement}}
 */

/**
 * @class HTMLControlElement
 * @property {function} getData Returns the current displayed value.
 * @property {function} setData Sets the value.
 * @property {function} hide
 * Makes the element invisible and non-interactive
 * @property {function} show
 * makes the element visible and (potentially) interactive
 * @description
 * A monkey-patched \code{HTMLElement} representing a control with its
 * label.
 * @see \code{\link{toolkit.paramBoolean}}
 * @see \code{\link{toolkit.paramColor}}
 * @see \code{\link{toolkit.paramFloat}}
 * @see \code{\link{toolkit.paramInteger}}
 * @see \code{\link{toolkit.paramSelector}}
 * @see \code{\link{toolkit.paramText}}
 */
