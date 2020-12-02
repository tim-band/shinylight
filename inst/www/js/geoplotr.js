function geoplotr() {
  var inputGrid;
  var output;
  var outputImg;
  var outputError;
  var outputTable;
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
  var top = document.getElementById('top');
  var statusMessage = document.getElementById('status-message');
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
  function appendColumns(headers, table, data, key) {
    var existingColumnCount = headers.length;
    var columns = data[key];
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
    var headers = [];
    var table = [];
    toolkit.forEach(data, function(k,v) {
      appendColumns(headers, table, data, k);
    });
    return { headers: headers, rows: table };
  }
  function setVisibleOutput(which) {
    outputError.style.display = which === 'error'? 'block' : 'none';
    outputImg.style.display = which === 'plot'? 'block' : 'none';
    outputTable.getTable().style.display = which === 'table'? 'table' : 'none';
  }
  function setTable(data) {
    var t = makeTable(data);
    outputTable.init(t.headers, t.rows);
  }
  function setError(err) {
    outputError.textContent = err;
  }
  function setPlot(plot) {
    outputImg.setAttribute('src', plot);
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
  function downloadPlot() {
    doPlotNow({
      'rrpc.resultformat': {
        type: 'pdf',
        width: 7,
        height: 7
      }
    }, function(result) {
      console.log('result:', result);
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
    var br = output.getBoundingClientRect();
    doPlotNow({
      'rrpc.resultformat': {
        type: 'png',
        width: br.width,
        height: br.height
      }
    }, function(result) {
      var outputs = 0;
      var page = 'error';
      var buttonPdf = document.getElementById('download-pdf');
      if (result.plot && result.plot.length) {
        setPlot(result.plot[0]);
        ++outputs;
        page = 'plot';
        buttonPdf.disabled = false;
      } else {
        buttonPdf.disabled = true;
      }
      var buttonCsv = document.getElementById('download-csv');
      if (result.data) {
        setTable(result.data);
        ++outputs;
        page = 'table';
        buttonCsv.disabled = false;
      } else {
        buttonCsv.disabled = true;
      }
      var pageSettingContainer = document.getElementById('output-page-setting');
      var pageButtonTable = document.getElementById('output-page-table');
      var pageButtonPlot = document.getElementById('output-page-plot');
      if (1 < outputs) {
        console.log('enabled');
        pageSettingContainer.classList.remove('disabled');
        pageButtonPlot.disabled = false;
        pageButtonTable.disabled = false;
        if (pageButtonTable.checked) {
          page = 'table';
        } else {
          page = 'plot';
        }
      } else {
        console.log('disabled');
        pageSettingContainer.classList.add('disabled');
        pageButtonPlot.disabled = true;
        pageButtonTable.disabled = true;
      }
      if (outputs === 0) {
        setError('no data returned');
      }
      console.log('setting page', page);
      pageButtonPlot.checked = page === 'plot';
      pageButtonTable.checked = page === 'table';
      setVisibleOutput(page);
    });
  }
  function doPlotNow(params, callback) {
    var fn = selectedFunction();
    toolkit.forEach(headerParams, function(paramId, columnIndex) {
      params[paramId] = getColumn(columnIndex);
    });
    toolkit.forEach(shownParameters, function(paramKey, paramId) {
      var es = allParameterSelectors[paramKey].getElementsByTagName('select');
      if (es.length === 0) {
        console.error('Internal error, no such parameter select element', paramKey);
      } else {
        params[paramId] = es[0].value;
      }
    });
    if (subheaderParam) {
      params[subheaderParam] = unitSettings();
    }
    rrpc.call(fn, params, function(result, err) {
      statusMessage.textContent = '';
      if (err) {
        setError(err);
        setVisibleOutput('error');
      } else if (result) {
        callback(result);
      }
    });
  };
  var doplot2 = toolkit.whenQuiet(14, displayPlotNow);
  function doplot() {
    statusMessage.textContent = 'updating...';
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
    var selects = inputGrid.getColumnSubheader(index).getElementsByTagName('select');
    if (selects.length === 0) {
      return '';
    }
    return selects[0].value;
  }
  function unitSelect(unit, initial, onchange) {
    var sel = document.createElement('select');
    toolkit.forEach(unit, function(id, text) {
      var opt =document.createElement('option');
      opt.textContent = text;
      opt.setAttribute('value', id.toLowerCase());
      if (initial === id) {
        opt.setAttribute('selected', 'true');
      }
      sel.appendChild(opt);
    });
    sel.onchange = onchange;
    return sel;
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
    toolkit.forEach(functionDescriptor, function(paramId, paramKey) {
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
        columnFn(paramId, d, getUnitValues(t));
      } else {
        console.warn('Did not understand type kind', t.kind[0]);
      }
    });
  }
  function forEachEnumParam(callback) {
    toolkit.forEach(schema.params, function(paramKey, p) {
      var d = schema.data[p.data[0]];
      var t = schema.types[p.type[0]];
      if (typeof(t) === 'object' && t.kind[0] === 'enum') {
        callback(paramKey, d, t.values);
      }
    });
  }
  // turn an array of ids into an object mapping
  // ids to localized strings (if available)
  function localizeArray(array) {
    var vals = {};
    toolkit.forEach(array, function(i, v) {
      vals[v] = v; // TODO: locallization
    });
    return vals;
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
  function setInputGrid(headers, subheaders, units, data) {
    var rows = transpose(data);
    inputGrid.init(headers, rows);
    if (!subheaders) return;
    for (c = 0; c !== subheaders.length; ++c) {
      var s = subheaders[c];
      if (s) {
        inputGrid.getColumnSubheader(c).appendChild(
            unitSelect(localizeArray(s), units[c], doplot)
        );
      }
    }
  }
  function setParameters() {
    toolkit.forEach(shownParameters, function(k,i) {
      allParameterSelectors[k].style.display = 'none';
    });
    shownParameters = {};
    var selected = selectedFunction();
    subheaderParam = null;
    var fd = schema.functions[selected];
    var headers = [];
    var data = [];
    subheaderChoices = [];
    var subheaderInitials = [];
    headerParams = {};
    forEachParam(fd, function(paramId, initialEnum, enumValues, paramKey) {
      shownParameters[paramKey] = paramId;
      var e = allParameterSelectors[paramKey];
      e.style.display = 'inline';
      e.selected = initialEnum;
    }, function(paramId, columnData, units) {
      headerParams[paramId] = headers.length;
      headers.push(paramId);
      data.push(columnData);
      subheaderChoices.push(units);
    }, function(paramId, dataUnits) {
      subheaderParam = paramId;
      subheaderInitials = dataUnits;
    });
    setInputGrid(headers,
      subheaderParam? subheaderChoices : null,
      subheaderInitials,
      data);
  }
  rrpc.initialize(function() {
    rrpc.call('getSchema', {}, function(result, err) {
      schema = result.data;
      setupScreen();
      var fns = localizeArray(Object.keys(schema.functions));
      var fs = toolkit.paramButton('function', 'Function', fns, null, setParameters);
      functionSelector = fs.getElementsByTagName('select')[0];
      top.textContent ='';
      top.appendChild(functionSelector);
      addParamButtons();
      setParameters();
    });
  });
  function selectedFunction() {
    var selected = functionSelector.value;
    if (!selected) {
      selected = functionSelector.options[0].value;
    }
    return selected;
  }

  function setupScreen() {
    inputGrid = createDataEntryGrid(null, 5, 5);
    var table = inputGrid.getTable();
    table.id = 'input-table';
    // vertical dividing line
    var left = document.createElement('div');
    left.style.overflow = 'auto';
    left.appendChild(table);
    output = document.createElement('div');
    output.id = 'output';
    outputImg = document.createElement('img');
    outputImg.id = 'output-plot';
    outputImg.setAttribute('style', 'width: 100%; height: 100%; display: none;');
    outputError = document.createElement('div');
    outputError.id = 'output-error';
    outputError.setAttribute('style', 'width: 100%; height: 100%; display: none;');
    outputTable = createDataEntryGrid(null, 5, 5);
    outputTable.getTable().classList.add('data-entry-grid');
    outputTable.getTable().setAttribute('style', 'width: 100%; height: 100%; display: none;');
    output.append(outputError, outputImg, outputTable.getTable());
    toolkit.verticalDivide(document.getElementById('middle'), left, output, doplot);
    inputGrid.addWatcher(doplot);
    doplot();
    document.getElementById('download-pdf').onclick = downloadPlot;
    document.getElementById('download-csv').onclick = downloadCsv;
    document.getElementById('output-page-plot').onchange = function() { setVisibleOutput('plot') };
    document.getElementById('output-page-table').onchange = function() { setVisibleOutput('table') };
  }

  function addParamButtons() {
    allParameterSelectors = {};
    forEachEnumParam(function(paramKey, initial, values) {
      var button = toolkit.paramButton(paramKey, paramKey,
        localizeArray(values), initial[0], doplot);
      top.appendChild(button);
      allParameterSelectors[paramKey] = button;
    });
  }
}
