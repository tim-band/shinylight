function geoplotr() {
  var inputGrid;
  var optionGroups = {};
  var outputImg;
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
  // type names of subheaders in each column
  var subheaderChoices = [];
  var top;
  var statusMessage = document.createElement('p'); //...

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
    for (var i = 0; i != subheaderChoices.length; ++i) {
      if (subheaderChoices[i]) {
        results.push(getUnitSetting(i));
      }
    }
    return results;
  }

  function download(filename, data) {
    const downloader = document.createElement('a');
		downloader.setAttribute("download", filename);
    downloader.setAttribute("href", data);
		downloader.click();
  }

  function downloadPdf() {
    doPlotNow({
      'rrpc.resultformat': {
        type: 'pdf',
        width: 7,
        height: 7
      }
    }, function(result) {
      download('geoplot.pdf', result.plot);
    });
  }

  function downloadCsv() {
    doPlotNow({}, function(result) {
      var t = makeTable(result.data);
      var rs = [t.headers.join(',')];
      toolkit.forEach(t.rows, function(i,r) {
        rs.push(r.join(','));
      });
      download('geoplot.csv', 'data:text/csv;base64,' + btoa(rs.join('\n')));
    });
  }

  function displayPlotNow() {
    var imgSize = outputImg.getSize();
    doPlotNow({
      'rrpc.resultformat': {
        type: 'png',
        width: imgSize.width,
        height: imgSize.height
      }
    }, function(result) {
      var data = {};
      if ('data' in result) {
        data.table = result.data;
      }
      var plot = toolkit.deref(result, ['plot', 0]);
      if (plot) {
        data.plot = plot;
      }
      output.setData(data);
    });
  }

  function doPlotNow(params, callback) {
    var fn = selectedFunction();
    toolkit.forEach(headerParams, function(paramId, columnIndex) {
      params[paramId] = getColumn(columnIndex);
    });
    toolkit.forEach(shownParameters, function(paramKey, paramId) {
      var e = allParameterSelectors[paramKey];
      params[paramId] = e.getData();
    });
    var og = toolkit.deref(schema, ['optiongroups'], {});
    toolkit.forEach(og, function(groupId, group) {
      toolkit.forEach(group, function(optionId, option) {
        params[optionId] = optionGroups[groupId][optionId].getData();
      });
    });
    if (subheaderParam) {
      params[subheaderParam] = unitSettings();
    }
    rrpc.call(fn, params, function(result, err) {
      statusMessage.textContent = '';
      if (err) {
        output.setData({ error: err });
      } else if (result) {
        callback(result);
      }
    });
  };

  var doplot2 = toolkit.whenQuiet(14, displayPlotNow);

  function doplot() {
    var message = translations(['framework', 'updating'], 'updating...');
    statusMessage.textContent = message;
    doplot2();
  }

  function getColumn(index) {
    var c = inputGrid.getColumn(index);
    var i;
    for (i = 0; i !== c.length; ++i) {
      c[i] = parseFloat(c[i]);
    }
    return c;
  }

  function getUnitSetting(index) {
    var nodes = inputGrid.getColumnSubheader(index).childNodes;
    if (nodes.length === 0) {
      return '';
    }
    return nodes[0].getData();
  }

  function getUnitValues(typeDescriptor) {
    if (!('unittype' in typeDescriptor)) {
      return null;
    }
    var t = typeDescriptor.unittype[0];
    if (!(t in schema.types)) {
      console.error('no such type:', t);
      return null;
    }
    var ut = schema.types[t];
    if (ut.kind[0] !== 'enum') {
      console.error('unittype must be enum:', t);
      return null;
    }
    return ut.values;
  }

  function noop() {}

  function forEachParam(functionDescriptor, enumFn, columnFn, subheaderFn) {
    if (!enumFn) {
      enumFn = noop;
    }
    if (!columnFn) {
      columnFn = noop;
    }
    if (!subheaderFn) {
      subheaderFn = noop;
    }
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
        columnFn(paramId, d, getUnitValues(t), t.unittype? t.unittype[0] : null);
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

  // turn an array of ids into an object mapping
  // ids to localized strings (if available)
  function localizeArray(dictionary, array) {
    var vals = {};
    toolkit.forEach(array, function(i, v) {
      vals[v] = v in dictionary && 'name' in dictionary[v]? dictionary[v].name : v;
    });
    return vals;
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

  function setInputGrid(headers, headerParams, subheaders, units, data) {
    var rows = transpose(data);
    inputGrid.init(localizeHeaders(headers), rows);
    if (!subheaders) return;
    for (c = 0; c !== subheaders.length; ++c) {
      var s = subheaders[c];
      if (s) {
        const paramKey = headerParams[c];
        var type = schema.types[paramKey];
        if (type.kind[0] === 'enum') {
          toolkit.paramSelector(paramKey,
            inputGrid.getColumnSubheader(c),
            {},
            type.values, translations(['app', 'types', paramKey], {}),
            units[c], doplot);
        }
      }
    }
  }

  var standardTypes = {
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

  function setOptions() {
    if (typeof(schema.optiongroups) != 'object') {
      return;
    }
    toolkit.forEach(schema.optiongroups, function(groupId, group) {
      if (!(groupId in optionGroups)) {
        optionGroups[groupId] = {};
      }
      var options = optionGroups[groupId];
      toolkit.forEach(group, function(optionId, option) {
        var typeId = toolkit.deref(option, ['type', 0]);
        var tr = translations(['app', 'optiongroups', groupId, optionId], { name: optionId });
        var initial = toolkit.deref(option, ['initial', 0]);
        var e = toolkit.deref(schema, ['types', typeId]);
        if (e) {
          var kindId = toolkit.deref(e, ['kind', 0]);
          if (kindId === 'enum') {
            const valuesTr = translations(['app', 'types', typeId], typeId);
            options[optionId] = toolkit.paramSelector(optionId, optionsPage,
              tr, e.values, valuesTr, initial, doplot);
            return;
          }
        }
        if (typeId in standardTypes) {
          options[optionId] = standardTypes[typeId](optionId, optionsPage, tr, initial, doplot);
        } else {
          options[optionId] = toolkit.paramText(optionId, optionsPage, tr, initial, doplot);
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
    subheaderChoices = [];
    var subheaderInitials = [];
    var subheaderTypes = [];
    headerParams = {};
    forEachParam(fd, function(paramId, initialEnum, enumValues, paramKey) {
      shownParameters[paramKey] = paramId;
      var e = allParameterSelectors[paramKey];
      e.show();
      e.setData(initialEnum[0]);
    }, function(paramId, columnData, units, columnType) {
      headerParams[paramId] = headers.length;
      headers.push(paramId);
      data.push(columnData);
      subheaderChoices.push(units);
      subheaderTypes.push(columnType);
    }, function(paramId, dataUnits) {
      subheaderParam = paramId;
      subheaderInitials = dataUnits;
    });
    setInputGrid(headers,
      subheaderTypes,
      subheaderParam? subheaderChoices : null,
      subheaderInitials,
      data);
    }

  loadTranslations(function(tr) {
    translationDict = tr;
    rrpc.initialize(function() {
      rrpc.call('getSchema', {}, function(result, err) {
        schema = result.data;
        setupScreen();
        addFunctionSelectButton();
        addparamSelectors();
        setParameters();
        setOptions();
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

  function setupScreen() {
    inputGrid = createDataEntryGrid(null, 5, 5);
    var table = inputGrid.getTable();
    table.id = 'input-table';
    output = document.createElement('div');
    output.id = 'output';
    outputImg = toolkit.image(doplot);
    outputImg.setAttribute('style', 'width: 100%; height: 100%;');
    var outputError = toolkit.staticText(translations(['framework', 'error']));
    outputError.setAttribute('style', 'width: 100%; height: 100%;');
    var outputTable = createDataEntryGrid(null, 5, 5);
    var oTable = outputTable.getTable();
    oTable.classList.add('data-entry-grid');
    oTable.setAttribute('style', 'width: 100%; height: 100%;');
    oTable.setData = function(data) {
      var t = makeTable(data);
      outputTable.init(t.headers, t.rows);
    };
    oTable.hide = function() {
      oTable.style.display = 'none';
    };
    oTable.show = function() {
      oTable.style.display = 'table';
    };
    var plotFooter = toolkit.banner({
      downloadPlot: toolkit.button('download-pdf',
          downloadPdf, translations(['framework', 'buttons']))
    }, 'output-footer', '35px');
    output = toolkit.pages({
      plot: toolkit.footer(plotFooter, toolkit.nonScrollingWrapper(outputImg)),
      table: outputTable.getTable(),
      error: outputError
    }, translations(['framework', 'pages']));
    optionsPage = toolkit.optionsPage();
    var inputPane = toolkit.pages({
      inputTable: toolkit.scrollingWrapper(table),
      options: optionsPage
    }, translations(['framework', 'pages']));
    var doc = toolkit.verticalDivide(null,
      inputPane,
      output);
    top = toolkit.banner({}, 'top', '50px');
    toolkit.setAsBody(toolkit.header(top, doc));
    inputGrid.addWatcher(doplot);
    doplot();
    addDownloadButtons();
  }

  function addDownloadButtons() {
    //document.getElementById('download-pdf').onclick = downloadPlot;
    //document.getElementById('download-csv').onclick = downloadCsv;
    // Add these buttons to banners in their appropriate pages?
    //...
  }

  function addparamSelectors() {
    allParameterSelectors = {};
    forEachEnumParam(function(paramKey, initial, values, typeKey) {
      var button = toolkit.paramSelector(
        paramKey,
        top,
        translations(['app', 'params', paramKey]),
        values,
        translations(['app', 'types', typeKey]),
        initial[0], doplot);
      allParameterSelectors[paramKey] = button;
    });
  }
}
