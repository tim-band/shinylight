function shinylight() {
  var inputGrid;
  var optionGroups = {};
  var outputImgWrapper;
  var output;
  var optionsPage;
  var translationDict = {};
  var schema;
  // The SELECT element that chooses the function to be called
  var functionSelector;
  // paramKey -> parameter element
  var allParameterSelectors ={};
  // paramKeys that are currently active, mapped to their paramId
  // (the paramKey is the parameters ID in the schema, the paramId
  // is its ID in the currently selected function)
  var shownParameters = {};
  // paramId -> column index in input table
  var headerParams = {};
  // The name of the parameter (if required) that takes the list
  // of column subheaders
  var subheaderParam;
  var calculateButtons = [];
  var subheaderInitials = [];
  var subheaderTypes = [];
  var top;
  var body;

  function getHttp(url, callback, errorCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          callback(xhr.responseText);
        } else {
          errorCallback(xhr);
        }
      }
    }
    xhr.send();
  }

  function getJson(url, callback) {
    getHttp(url, function(text) {
      callback(JSON.parse(text));
    }, function() {
      callback({});
    });
  }

  function loadTranslations(callback) {
    getJson('lang/app.json', function(app) {
      getJson('lang/framework.json', function(fw) {
        callback({ app: app, framework: fw });
      });
    });
  }

  function unitSettings() {
    return inputGrid.getSubheaders();
  }

  function download(filename, data) {
    const downloader = document.createElement('a');
		downloader.setAttribute("download", filename);
    downloader.setAttribute("href", data);
		downloader.click();
  }

  function downloadJsonText(filename, text) {
    download(filename, 'data:text/json;base64,' + btoa(text));
  }

  function downloadPdf(callback) {
    doPlotNow({
      'rrpc.resultformat': {
        type: 'pdf',
        width: 7,
        height: 7
      }
    }, function(result) {
      callback();
      download('geoplot.pdf', result.plot);
    });
  }

  function downloadCsv(table, filename) {
    var h = table.getColumnHeaders();
    var rows = table.getCells();
    var rs = [h.join(',')];
    toolkit.forEach(rows, function(i,r) {
      rs.push(r.join(','));
    });
    download(filename, 'data:text/csv;base64,' + btoa(rs.join('\n')));
  }

  function prettyJson(j) {
    return JSON.stringify(j, null, 2);
  }

  function displayPlotNow(done) {
    var imgSize = outputImgWrapper.getSize();
    doPlotNow({
      'rrpc.resultformat': {
        type: 'png',
        width: imgSize.width,
        height: imgSize.height
      }
    }, function(result, params) {
      var data = {};
      if ('data' in result) {
        data.table = result.data;
      }
      var plot = toolkit.deref(result, ['plot', 0]);
      if (plot) {
        data.plot = plot;
      }
      data.debug = prettyJson({
        input: params,
        output: result
      });
      output.setData(data);
      if (typeof(done) === 'function') {
        done();
      }
    });
  }

  function setParams(data) {
    if (!('fn' in data && 'parameters' in data)) {
      console.error('did not understand parameter file format');
      return;
    }
    // the function itself
    if (data.fn in schema.functions) {
      functionSelector.setData(data.fn);
    } else {
      console.error('no such function', data.fn);
    }
    var p = data.parameters;
    // parameters from the main screen
    toolkit.forEach(shownParameters, function(k, id) {
      var e = allParameterSelectors[k];
      e.setData(p[id]);
    });
    // options
    var optionGroup = toolkit.deref(schema.functions[data.fn], ['optiongroups'], {});
    toolkit.forEach(optionGroup, function(i, groupId) {
      toolkit.forEach(optionGroups[groupId], function(id, e) {
        e.setData(p[id]);
      });
    });
    // construct data to set into the input table
    var data = [];
    toolkit.forEach(headerParams, function(id, columnIndex) {
      data[columnIndex] = p[id];
    });
    setInputGrid(inputGrid.getColumnHeaders(),
      subheaderTypes,
      subheaderParam && subheaderParam in p? p[subheaderParam] : null,
      data);
  }

  function getParams() {
    var p = {};
    var fn = selectedFunction();
    // data from columns
    toolkit.forEach(headerParams, function(id, columnIndex) {
      p[id] = getColumn(columnIndex);
    });
    // subheaders (units)
    if (subheaderParam) {
      p[subheaderParam] = unitSettings();
    }
    // parameters from the main screen
    toolkit.forEach(shownParameters, function(k, id) {
      var e = allParameterSelectors[k];
      p[id] = e.getData();
    });
    // relevant options
    var optionGroup = toolkit.deref(schema.functions[fn], ['optiongroups'], {});
    toolkit.forEach(optionGroup, function(i, groupId) {
      // maybe use optionPage.getData() and pick out the relevant ones?
      //...
      toolkit.forEach(optionGroups[groupId], function(id, e) {
        p[id] = e.getData();
      });
    });
    return { fn: fn, parameters: p };
  }

  function doPlotNow(params, callback) {
    var p = getParams();
    toolkit.forEach(p.parameters, function(k,v) { params[k] = v; });
    rrpc.call(p.fn, params, function(result, err) {
      if (err) {
        output.setData({
          error: err,
          debug: prettyJson({ input: params })
        });
      } else if (result) {
        callback(result, params);
      }
    });
  };

  var doPlot2 = noop;
  var dirtyPlot = noop;

  function doPlot(callback) {
    doPlot2(callback);
  }

  function markPlotDirty() {
    dirtyPlot();
  }

  function getColumn(index) {
    var c = inputGrid.getColumn(index);
    var i;
    for (i = 0; i !== c.length; ++i) {
      c[i] = parseFloat(c[i]);
    }
    return c;
  }

  function noop() {}

  function forEachParam(functionDescriptor, singleFn, columnFn, subheaderFn) {
    toolkit.forEach(functionDescriptor.params, function(paramId, paramKey) {
      var p = schema.params[paramKey[0]];
      var d = schema.data[p.data[0]];
      if (!d) {
        d = [null];
      }
      var t = schema.types[p.type[0]];
      if (typeof(t) === 'undefined') {
        if (p.type[0] === 'subheader') {
          subheaderFn(paramId, d);
        } else {
          singleFn(paramId, d[0], paramKey[0]);
        }
      } else if (t.kind[0] === 'enum') {
        singleFn(paramId, d[0], paramKey[0]);
      } else if (t.kind[0] === 'column') {
        try {
          var unitTypeName = 'unittype' in t? t.unittype[0] : null;
          columnFn(paramId, d, unitTypeName);
        } catch (e) {
          console.error("error:", e);
        }
      } else {
        console.warn('Did not understand type kind', t.kind[0]);
      }
    });
  }

  function translations(path, defaultValue) {
    var dr = toolkit.deref(translationDict, path, defaultValue);
    return dr === null? {} : dr;
  }

  function localizeHeaders(array) {
    var trs = translations(['app', 'params']);
    if (!trs) {
      return array;
    }
    var h = [];
    toolkit.forEach(array, function(i, v) {
      h[i] = v in trs && 'name' in trs[v]? trs[v].name : v;
    });
    return h;
  }

  // transposes an array of arrays so that
  // result[i][j] === arrays[j][i] for each i and j
  function transpose(arrays) {
    var rows = 0;
    toolkit.forEach(arrays, function(i, a) {
      if (rows < a.length) rows = a.length;
    });
    var result = [];
    // fill([]) doesn't work: it would give each row a reference to the
    // same array.
    for (var r = 0; r !== rows; ++r) {
      result[r] = [];
    }
    toolkit.forEach(arrays, function(i, a) {
      toolkit.forEach(a, function(j, v) {
        result[j][i] = v;
      });
    });
    return result;
  }

  function setInputGrid(headers, headerParams, units, data) {
    var c = 0;
    var subheaderSpecs = [];
    var subheaderDefaults = [];
    var hasSubheaders = false;
    toolkit.forEach(headerParams, function(k, paramKey) {
      if (paramKey in schema.types) {
        var type = schema.types[paramKey];
        if (type.kind[0] === 'enum') {
          hasSubheaders = true;
          subheaderDefaults.push(units[c]);
          var spec = {};
          var ts = translations(['app', 'types', paramKey], {});
          toolkit.forEach(type.values, function(i, value) {
            spec[value] = toolkit.deref(ts, [value, 'name'], value);
          });
          subheaderSpecs.push(spec);
        } else {
          subheaderSpecs.push(null);
          subheaderDefaults.push(null);
        }
      } else {
        if (paramKey) {
          console.warn("no such type", paramKey);
        }
        subheaderSpecs.push(null);
        subheaderDefaults.push(null);
      }
      ++c;
    });
    var headers = localizeHeaders(headers);
    var rows = transpose(data);
    const trailingZeroes = /\.?0*$/;
    inputGrid.init(headers, rows, hasSubheaders? subheaderSpecs : null, subheaderDefaults);
    inputGrid.setReunittingFunction(function(index, currentValue, newValue, col) {
      paramKey = headerParams[index];
      if (paramKey in schema.types) {
        var type = schema.types[paramKey];
        if (type.kind[0] === 'enum') {
          if ('factors' in type) {
            var was = type.values.indexOf(currentValue);
            var is = type.values.indexOf(newValue);
            var num = type.factors[is];
            var den = type.factors[was];
            var prec = newValue === units[index]? 8:9;
            return col.map(function(v) {
              const r = num * v / den;
              if (Number.isNaN(r)) {
                return v;
              }
              return r.toPrecision(prec).replace(trailingZeroes, '');
            });
          }
        }
      } else {
        console.warn("no such type", paramKey);
      }
    });
  }

  var standardTypes = {
    b: function(id, container, tr, initial, callback) {
      return toolkit.paramBoolean(id, container, tr, initial, callback);
    },
    u8: function(id, container, tr, initial, callback) {
      return toolkit.paramInteger(id, container, tr, initial, callback, 0, 255);
    },
    f: function(id, container, tr, initial, callback) {
      return toolkit.paramFloat(id, container, tr, initial, callback);
    },
    color: function(id, container, tr, initial, callback) {
      return toolkit.paramColor(id, container, tr, initial, callback);
    }
  };

  var optionCallbacks = {
    framework: {
      autorefresh: setCalculateMode
    }
  };

  function addControl(typeId, elementId, container, tr, initial, callback) {
    var e = toolkit.deref(schema, ['types', typeId]);
    if (e) {
      var kindId = toolkit.deref(e, ['kind', 0]);
      if (kindId === 'enum') {
        var valuesTr = translations(['app', 'types', typeId],
          translations(['framework', 'framework-types', typeId], {}));
        return toolkit.paramSelector(elementId, container,
          tr, e.values, valuesTr, initial, callback);
      }
      return null;
    }
    if (typeId in standardTypes) {
      return standardTypes[typeId](elementId, container, tr, initial, callback);
    }
    return toolkit.paramText(elementId, container, tr, initial, callback);
  }

  function setOptions() {
    if (typeof(schema.optiongroups) !== 'object') {
      return;
    }
    toolkit.forEach(schema.optiongroups, function(groupId, group) {
      if (!(groupId in optionGroups)) {
        optionGroups[groupId] = {};
      }
      var options = optionGroups[groupId];
      var groupTr = translations(['framework', 'framework-options', '@title'], { name: groupId });
      if (groupId !== 'framework') {
        groupTr = translations(['app', 'optiongroups', groupId, '@title'], groupTr);
      }
    toolkit.groupTitle(optionsPage, groupTr);
      toolkit.forEach(group, function(optionId, option) {
        var typeId = toolkit.deref(option, ['type', 0]);
        var tr = translations(['app', 'optiongroups', groupId, optionId], { name: optionId });
        if (groupId === 'framework') {
          tr = translations(['framework', 'framework-options', optionId], tr);
        }
        var initial = toolkit.deref(option, ['initial', 0]);
        var callback = toolkit.deref(optionCallbacks, [groupId, optionId], markPlotDirty);
        options[optionId] = addControl(typeId, optionId, optionsPage, tr, initial, callback);
      });
    });
  }

  function setParameters() {
    toolkit.forEach(shownParameters, function(k,i) {
      allParameterSelectors[k].hide();
    });
    shownParameters = {};
    var selected = selectedFunction();
    subheaderParam = null;
    var fd = schema.functions[selected];
    var headers = [];
    var data = [];
    subheaderInitials = [];
    subheaderTypes = [];
    headerParams = {};
    forEachParam(fd, function(paramId, initial, paramKey) {
      shownParameters[paramKey] = paramId;
      var e = allParameterSelectors[paramKey];
      e.show();
      e.setData(initial);
    }, function(paramId, columnData, unitTypeName) {
      headerParams[paramId] = headers.length;
      headers.push(paramId);
      data.push(columnData);
      subheaderTypes.push(unitTypeName);
    }, function(paramId, dataUnits) {
      subheaderParam = paramId;
      subheaderInitials = dataUnits;
    });
    headers.push('');
    setInputGrid(headers,
      subheaderTypes,
      subheaderInitials,
      data);
    body.resize();
  }

  function setCalculateMode(automatic) {
    var dirty = false;
    if (automatic) {
      doPlot2 = toolkit.whenQuiet(14, displayPlotNow);
      dirtyPlot = doPlot;
      toolkit.forEach(calculateButtons, function(i, c) {
        c.hide();
      });
      if (dirty) {
        dirty = false;
        doPlot2();
      }
    } else {
      dirty = false;
      doPlot2 = function(callback) {
        dirty = false;
        displayPlotNow(callback);
      };
      dirtyPlot = function () { dirty = true; };
      toolkit.forEach(calculateButtons, function(i, c) {
        c.show();
      });
    }
  }

  function calculateMode() {
    return toolkit.deref(
      schema,
      [ 'optiongroups', 'framework', 'autorefresh', 'initial', 0 ],
      true
    );
  }

  loadTranslations(function(tr) {
    translationDict = tr;
    rrpc.initialize(function() {
      rrpc.call('getSchema', {}, function(result, err) {
        schema = result.data;
        body = setupScreen();
        toolkit.setAsBody(body);
        removeTopParameters();
        addFunctionSelectButton();
        addParamSelectors();
        setParameters();
        setOptions();
        displayPlotNow(function() {
          setCalculateMode(calculateMode());
        });
      });
    });
  });

  function removeTopParameters() {
    var nodes = top.childNodes;
    var i = 0;
    while (i < nodes.length) {
      if (nodes[i].classList.contains('param-box')) {
        top.removeChild(nodes[i]);
      } else {
        ++i;
      }
    }
  }

  function addFunctionSelectButton() {
    var fns = Object.keys(schema.functions);
    functionSelector = toolkit.paramSelector('function-selector', top,
      { name: translations(['framework','functions'], 'Function') },
      fns, translations(['app','functions']), null, setParameters);
  }

  function selectedFunction() {
    return functionSelector.getData();
  }

  function translateGrid(grid) {
    grid.setText(translations(['framework', 'gridmenu'], {}));
  }

  function setupScreen() {
    inputGrid = createDataEntryGrid(null, 5, 5);
    translateGrid(inputGrid);
    var table = inputGrid.getTable();
    table.id = 'input-table';
    output = document.createElement('div');
    output.id = 'output';
    var outputImg = toolkit.image(markPlotDirty);
    var outputError = toolkit.staticText(translations(['framework', 'error']));
    var outputTable = createDataEntryGrid(null, 5, 5);
    outputImg.id = 'output-plot';
    outputError.id = 'output-error';
    translateGrid(outputTable);
    var oTable = outputTable.getTable();
    oTable.id = 'output-table';
    oTable.classList.add('data-entry-grid');
    oTable.setAttribute('style', 'width: 100%; height: 100%;');
    oTable.setData = function(data) {
      var t = toolkit.makeTable(data);
      var h = t.headers;
      h.push('');
      outputTable.init(h, t.rows);
    };
    oTable.hide = function() {
      oTable.style.display = 'none';
    };
    oTable.show = function() {
      oTable.style.display = 'table';
    };
    var buttonTranslations = translations(['framework', 'buttons']);
    var calculate1 = toolkit.button('calculate',
      doPlot, buttonTranslations);
    calculateButtons.push(calculate1);
    var saveData = toolkit.button('savedata', toolkit.withTimeout(function() {
      downloadJsonText('params.json', JSON.stringify(getParams()));
    }), buttonTranslations);
    var loadData = toolkit.loadFileButton('loaddata', function(file, done) {
      if (20000 < file.size) {
        console.error('file too large!', file.size);
        done();
        return;
      }
      var reader = new FileReader();
      reader.onloadend = function() {
        if (reader.error) {
          console.error(reader.error);
          done();
        } else {
          setParams(JSON.parse(reader.result));
          done();
        }
      };
      reader.readAsText(file);
    }, buttonTranslations);
    var plotFooter = toolkit.banner({
      downloadPlot: toolkit.button('download-pdf',
        downloadPdf, translations(['framework', 'buttons']))
    }, 'output-footer');
    var tableFooter = toolkit.banner({
      downloadCsv: toolkit.button(
        'download-csv',
        function(callback) {
          downloadCsv(outputTable, 'output.csv')
          setTimeout(callback, 200);
        },
        translations(['framework', 'buttons'])
      )
    }, 'output-footer');
    var outputDebug = toolkit.preformattedText(
      translations(['framework', 'labels', 'debug-text']));
    var debugJson = '';
    var debugFooter = toolkit.banner({
      downloadDebug: toolkit.button(
        'download-json',
        function() {
          downloadJsonText('debug.json', debugJson);
        },
        translations(['framework', 'buttons'])
      )
    }, 'output-footer');
    debugFooter.setData = function(json) {
      debugJson = json;
    };
    outputImgWrapper = toolkit.nonScrollingWrapper(outputImg);
    output = toolkit.pages({
      plot: toolkit.footer(plotFooter, outputImgWrapper),
      table: toolkit.footer(tableFooter, toolkit.scrollingWrapper(oTable)),
      error: outputError,
      debug: toolkit.footer(debugFooter, toolkit.scrollingWrapper(outputDebug))
    }, translations(['framework', 'pages']), 'output-tab-');
    optionsPage = toolkit.optionsPage();
    var inputPane = toolkit.pages({
      inputTable: table,
      options: optionsPage
    }, translations(['framework', 'pages']), 'input-tab-');
    var leftFooter = toolkit.banner({
      savedata: saveData,
      loaddata: loadData,
      calculate: calculate1
    }, 'input-footer')
    var leftPane = toolkit.footer(leftFooter, inputPane);
    var doc = toolkit.verticalDivide(null, leftPane, output);
    top = toolkit.banner({}, 'top');
    var homelink = translations(['app', 'homelink']);
    var logo;
    if (homelink) {
      logo = document.createElement('a');
      logo.setAttribute('href', homelink);
    } else {
      logo = document.createElement('span');
    }
    document.title = translations(['app', 'title'], 'R');
    logo.className = 'logo';
    logo.textContent = document.title;
    logo.style.float = 'left';
    //var header = toolkit.leftSideBar(toolkit.scrollingWrapper(logo, 10, 30), top);
    //header.classList.add('top-header');
    top.classList.add('top-header');
    top.appendChild(logo);
    inputGrid.addWatcher(markPlotDirty);
    return toolkit.header(top, doc);
  }

  function addParamSelectors() {
    paramKeys = {};
    toolkit.forEach(schema.functions, function(fid, fd) {
      toolkit.forEach(fd.params, function(pid, paramKey) {
        var v = toolkit.deref(schema.params, [paramKey]);
        if (v) {
          paramKeys[paramKey] = v;
        }
      });
    });
    allParameterSelectors = {};
    toolkit.forEach(paramKeys, function(paramKey, p) {
      var c = addControl(
        p.type[0],
        paramKey,
        top,
        translations(['app', 'params', paramKey]),
        toolkit.deref(schema.data, [p.data[0], 0], null),
        markPlotDirty
      );
      if (c) {
        allParameterSelectors[paramKey] = c;
        c.hide();
      }
    });
  }
}
