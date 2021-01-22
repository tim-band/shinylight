function geoplotr() {
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

  function arrayWidth(a) {
    var max = 0;
    for(var i = 0; i !== a.length; ++i) {
      var r = a[i];
      var n = typeof(r) === 'object'? r.length : 1;
      if (max < n) {
        max = n;
      }
    }
    return max;
  }

  function appendColumns(headers, table, key, columns) {
    var existingColumnCount = headers.length;
    var width = arrayWidth(columns);
    if (width === 1) {
      headers.push(key);
    } else {
      for (var w = 0; w !== width; ++w) {
        headers.push(key + ' ' + (w + 1));
      }
    }
    for (var r = 0; r !== columns.length; ++r) {
      if (typeof(table[r]) === 'undefined') {
        table[r] = new Array(existingColumnCount).fill('');
      }
      var row = columns[r];
      if (typeof(row) !== 'object') {
        row = [row];
      }
      for (var c = 0; c !== width; ++c) {
        var v = row[c];
        if (typeof(v) === 'undefined') {
          v = '';
        }
        table[r][existingColumnCount + c] = v;
      }
    }
  }

  function makeTable(data) {
    if (Array.isArray(data)) {
      return { headers: ['out'], rows: data.map(function(x) { return [x]; }) };
    }
    var headers = [];
    var table = [];
    toolkit.forEach(data, function(k,v) {
      appendColumns(headers, table, k, v);
    });
    return { headers: headers, rows: table };
  }

  function unitSettings() {
    var results = [];
    var index = 0;
    toolkit.forEach(headerParams, function() {
      var node = getUnitElement(index);
      if (node) {
        results.push(node.getData());
      }
      ++index;
    });
    return results;
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

  function downloadCsv(table) {
    var h = table.getColumnHeaders();
    var rows = table.getCells();
    var rs = [h.join(',')];
    toolkit.forEach(rows, function(i,r) {
      rs.push(r.join(','));
    });
    download('geoplot.csv', 'data:text/csv;base64,' + btoa(rs.join('\n')));
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

  function getUnitElement(index) {
    const subheader = inputGrid.getColumnSubheader(index);
    var nodes = subheader? subheader.childNodes : [];
    return nodes.length === 0? null : nodes[0];
  }

  function noop() {}

  function forEachParam(functionDescriptor, enumFn, columnFn, subheaderFn) {
    toolkit.forEach(functionDescriptor.params, function(paramId, paramKey) {
      var p = schema.params[paramKey[0]];
      var d = schema.data[p.data[0]];
      var t = schema.types[p.type[0]];
      if (typeof(t) === 'undefined') {
        if (p.type[0] === 'subheader') {
          subheaderFn(paramId, d);
        } else {
          console.warn('Did not understand type name', p.type[0]);
        }
      } else if (t.kind[0] === 'enum') {
        enumFn(paramId, d, t.values, paramKey);
      } else if (t.kind[0] === 'column') {
        try {
          var unitTypeName = t.unittype[0];
          columnFn(paramId, d, unitTypeName);
        } catch (e) {
          console.error("error:", e);
        }
      } else {
        console.warn('Did not understand type kind', t.kind[0]);
      }
    });
  }

  // calls callback(paramKey, initial, values, typeKey) for each param,
  // where paramKey is the ID of the type, initial[0] is the
  // default value, values is an array of all possible values and
  // typeKey is the ID of the type
  function forEachEnumParam(callback) {
    toolkit.forEach(schema.params, function(paramKey, p) {
      var d = schema.data[p.data[0]];
      var t = schema.types[p.type[0]];
      if (typeof(t) === 'object' && t.kind[0] === 'enum') {
        callback(paramKey, d, t.values, p.type[0]);
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
    var rows = transpose(data);
    var headers = localizeHeaders(headers);
    inputGrid.init(headers, rows);
    var c = 0;
    toolkit.forEach(headerParams, function(k, paramKey) {
      if (paramKey in schema.types) {
        var type = schema.types[paramKey];
        if (type.kind[0] === 'enum') {
          var index = c;
          var currentValue = units[c];
          toolkit.paramSelector(paramKey,
            inputGrid.getColumnSubheader(c),
            {},
            type.values,
            translations(['app', 'types', paramKey], {}),
            currentValue,
            function(newValue) {
              if ('factors' in type) {
                var was = type.values.indexOf(currentValue);
                var is = type.values.indexOf(newValue);
                var num = type.factors[is];
                var den = type.factors[was];
                var col = inputGrid.getColumn(index);
                var newRs = [];
                toolkit.forEach(col, function(i, v) {
                  newRs.push([ num * v / den ]);
                });
                var sel = inputGrid.getSelection();
                inputGrid.putCells(0, col.length, index, index+1, newRs);
                inputGrid.setSelection(sel.anchorRow, sel.anchorColumn, sel.selectionRow, sel.selectionColumn);
              }
              currentValue = newValue;
              markPlotDirty();
            }
          );
        }
      } else {
        console.warn("no such type", paramKey);
      }
      ++c;
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
      if (groupId === 'framework') {
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
        var e = toolkit.deref(schema, ['types', typeId]);
        if (e) {
          var kindId = toolkit.deref(e, ['kind', 0]);
          if (kindId === 'enum') {
            var valuesTr = translations(['app', 'types', typeId], {});
            if (groupId === 'framework') {
              valuesTr = translations(['framework', 'framework-types', typeId], valuesTr);
            }
            options[optionId] = toolkit.paramSelector(optionId, optionsPage,
              tr, e.values, valuesTr, initial, callback);
            return;
          }
        }
        if (typeId in standardTypes) {
          options[optionId] = standardTypes[typeId](optionId, optionsPage, tr, initial, callback);
        } else {
          options[optionId] = toolkit.paramText(optionId, optionsPage, tr, initial, callback);
        }
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
    forEachParam(fd, function(paramId, initialEnum, enumValues, paramKey) {
      shownParameters[paramKey] = paramId;
      var e = allParameterSelectors[paramKey];
      e.show();
      e.setData(initialEnum[0]);
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
        var body = setupScreen();
        addFunctionSelectButton();
        addParamSelectors();
        setParameters();
        setOptions();
        toolkit.setAsBody(body);
        displayPlotNow(function() {
          setCalculateMode(calculateMode());
        });
      });
    });
  });

  function addFunctionSelectButton() {
    var fns = Object.keys(schema.functions);
    top.deleteAll();
    functionSelector = toolkit.paramSelector('', top,
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
    translateGrid(outputTable);
    var oTable = outputTable.getTable();
    oTable.classList.add('data-entry-grid');
    oTable.setAttribute('style', 'width: 100%; height: 100%;');
    oTable.setData = function(data) {
      var t = makeTable(data);
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
      downloadJsonText('geoplotr-params.json', JSON.stringify(getParams()));
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
          downloadCsv(outputTable)
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
          downloadJsonText('geoplotr.json', debugJson);
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
    }, translations(['framework', 'pages']));
    optionsPage = toolkit.optionsPage();
    var inputPane = toolkit.pages({
      inputTable: table,
      options: optionsPage
    }, translations(['framework', 'pages']));
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
    var header = toolkit.leftSideBar(toolkit.scrollingWrapper(logo, 10, 30), top);
    header.classList.add('top-header');
    inputGrid.addWatcher(markPlotDirty);
    return toolkit.header(header, doc);
  }

  function addParamSelectors() {
    allParameterSelectors = {};
    forEachEnumParam(function(paramKey, initial, values, typeKey) {
      var button = toolkit.paramSelector(
        paramKey,
        top,
        translations(['app', 'params', paramKey]),
        values,
        translations(['app', 'types', typeKey]),
        initial[0], markPlotDirty);
      allParameterSelectors[paramKey] = button;
    });
  }
}
