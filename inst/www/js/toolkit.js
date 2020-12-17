var toolkit = function() {
  function forEach(a, f) {
    var k = Object.keys(a), i = 0;
    for (; i !== k.length; ++i) {
      var ki = k[i];
      f(ki, a[ki]);
    }
  }

  // deref(o, [a,b,c], d) is a safe way of doing o[a][b][c].
  // If that path does not exist, d is returned. If d is not
  // supplied, null is returned. Any undefined values in path are
  // ignored.
  function deref(object, path, defaultValue) {
    for (var i = 0; i !== path.length; ++i) {
      var p = path[i];
      if (typeof(object) === 'object' && p in object) {
        object = object[p];
      } else if (typeof(p) !== 'undefined') {
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

  function constTrue() {
    return true;
  }

  function noop() {
    return true;
  }

  function makeLabel(labelTranslations, container, id) {
    var name = deref(labelTranslations, [id, 'name'], id);
    var help = deref(labelTranslations, [id, 'help']);
    var label = document.createElement('span');
    label.textContent = name;
    label.className = 'param-label';
    if (container) {
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

  function paramText(paramName, labelTranslations, initial, callback, validate) {
    var span = document.createElement('span');
    if (paramName) {
      span.id = paramId(paramName);
    }
    span.className = 'param-text';
    makeLabel(labelTranslations, span);
    var box = document.createElement('input');
    box.className = 'param-box';
    if (initial) {
      box.value = initial;
    }
    if (typeof(callback) !== 'function') {
      callback = noop;
    }
    if (typeof(validate) !== 'function') {
      validate = constTrue;
    }
    box.onchange = function() {
      if (validate(box.value)) {
        box.classList.remove('invalid');
        callback();
      } else {
        box.classList.add('invalid');
      }
    }
    span.appendChild(box);
  }

  // Creates a custom selection box
  // labelTranslations: A dictionary with two optional keys; 'name' gives the
  // label to display and 'help' gives HTML help text. 'help' has no effect
  // unless 'name' is also present.
  // values: An array of the IDs of the options in the selection.
  // valueTranslations: A dictionary whose keys are the IDs of the options in the
  // selection, the values are more dictionaries. These dictionaries have
  // two optional keys; 'name' (giving the name to display for this option)
  // and 'help' (giving tooltip HTML text).
  // initial: ID of the option to start selecting (optional)
  // callback: The (nullary) function to call when the value changes (optional)
  // returns element you can add to the DOM
  function paramSelector(labelTranslations, values, valueTranslations, initial, callback) {
    // The button is the area that can be clicked to open up the drop-down
    var button = document.createElement('div');
    button.className = 'param-box';
    button.style.display = 'inline-block';
    var buttonText = document.createElement('span');
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
    forEach(values, function(i,id) {
      var optr = document.createElement('tr');
      optr.classList.add('param-option');
      var opt = document.createElement('td');
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
        span.setParam(id);
        ev.preventDefault();
      };
    });
    var span = document.createElement('span');
    buttonText.onmousedown = downArrow.onmousedown = function(ev) {
      if (open) {
        dropDown.classList.remove('open');
        open = false;
      } else {
        dropDown.classList.add('open');
        span.focus();
        open = true;
      }
      ev.preventDefault();
    }
    button.onmousemove = function(ev) {
      ev.preventDefault();
    }
    span.className = 'param-selector';
    span.style.display = 'inline-block';
    makeLabel(labelTranslations, span);
    dropDown.style.position = 'absolute';
    button.appendChild(dropDown);
    span.appendChild(button);
    function setSelected(value) {
      if (selectedOption !== value && value in options) {
        selectedOption = value;
        buttonText.textContent = optionNames[selectedOption];
      }
    };
    span.setParam = function(value) {
      setSelected(value);
      callback();
    };
    span.getParam = function() {
      return selectedOption;
    };
    setShowHide(span);
    setSelected(initial);
    span.tabIndex = 0;
    span.onkeydown = function(ev) {
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
      span.setParam(goTo);
    };
    span.onblur = function() {
      dropDown.classList.remove('open');
      open = false;
    };
    return span;
  }

  function setShowHide(element) {
    var display = element.style.display;
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

  function image() {
    var img = document.createElement('img');
    img.style.display = 'block';
    img.setData = function(data) {
      img.setAttribute('src', data);
    };
    setShowHide(img);
    return img;
  }

  function staticText(labelTranslations) {
    var div = document.createElement('div');
    div.className = 'param-text';
    makeLabel(labelTranslations, div);
    var static = document.createElement('div');
    div.appendChild(static);
    setShowHide(div);
    div.setData = function(data) {
      static.textContent = data;
    };
    return div;
  }

  // elements is a dictionary of ids to elements,
  // each of which must have a setData method.
  function stack(elements) {
    // copy of elements
    var sub = {};
    var div = document.createElement('div');
    forEach(elements, function(id, el) {
      sub[id] = el;
      div.appendChild(el);
    });
    setShowHide(div);
    div.setData = function(data) {
      forEach(sub, function(id, el) {
        el.setData(id in data? data[id] : null);
      });
    };
    return div;
  }

  // pageElements: dictionary of pageIds to elements (that will not be
  // added to the DOM by this function). These elements each need
  // methods show, hide and setData (like the ones returned by
  // image, dataTable, stack, staticText, optionsPage)
  // groupId: the 'name' attribute for each button; anything that
  // is different from any element id or other pages groupId.
  // labelTranslations: dictionary of pageIds to objects with keys
  // name (for the label text) and help (for tooltip help HTML)
  // Returns an element that is the radio buttons that switch between the
  // pages. It has the following extra methods:
  // setData(data): data is a dictionary with keys matching the pageIds.
  // The values are passed to the setData() functions of the corresponding
  // elements. Pages without any data (and their corresponding radio
  // buttons) are summarily disabled. Pages with data are enabled.
  function pages(groupId, pageElements, labelTranslations) {
    var radios = {};
    var radioInputs = {};
    // a deep copy of pageElements
    var pages = {};
    var active = null;
    var returnPage = null;
    var container = document.createElement('span');
    container.className = 'param-page-switcher';
    forEach(pageElements, function(pageId, page) {
      var span = document.createElement('span');
      span.className = 'param-page-switch';
      makeLabel(labelTranslations, span, pageId);
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = groupId;
      radio.onchange = function() {
        pages[active].hide();
        active = pageId;
        pages[pageId].show();
      };
      if (!active) {
        active = pageId;
        radio.checked = true;
        page.show();
      } else {
        page.hide();
      }
      span.appendChild(radio);
      container.appendChild(span);
      radioInputs[pageId] = radio;
      radios[pageId] = span;
      pages[pageId] = page;
    });
    returnPage = active;
    container.setData = function(data) {
      var first = null;
      forEach(pages, function(pageId, page) {
        if (pageId in data) {
          if (!first) {
            first = pageId;
          }
          page.setData(data[pageId]);
          radioInputs[pageId].disabled = false;
          radios[pageId].classList.remove('disabled');
        } else {
          radioInputs[pageId].disabled = true;
          radios[pageId].classList.add('disabled');
        }
      });
      var newActive = returnPage in data? returnPage : active in data? active : first;
      if (newActive && newActive !== active) {
        radioInputs[newActive].onchange();
      }
    };
    return container;
  }

  return {
    forEach: forEach,
    deref: deref,
    verticalDivide: vDivide,
    whenQuiet: whenQuiet,
    paramText: paramText,
    paramSelector: paramSelector,
    image: image,
    staticText: staticText,
    stack: stack,
    pages: pages
  };
}();

