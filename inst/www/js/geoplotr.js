function geoplotr() {
  var inputGrid;
  var output;
  var outputImg;
  var outputError;
  var outputTable;
  var schema;
  // The SELECT element that chooses the function to be called
  var functionSelector;
  // paramId -> parameter element
  var parameterSelectors = {};
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
  function showTable(data) {
    var headers = [];
    var table = [];
    toolkit.forEach(data, function(k,v) {
      appendColumns(headers, table, data, k);
    });
    outputTable.init(headers, table);
    outputError.style.display = 'none';
    outputTable.getTable().style.display = 'table';
    outputImg.style.display = 'none';
  }
  function showError(err) {
    outputError.textContent = err;
    outputError.style.display = 'block';
    outputTable.getTable().style.display = 'none';
    outputImg.style.display = 'none';
  }
  function showPlot(plot) {
    outputImg.setAttribute('src', plot);
    outputError.style.display = 'none';
    outputTable.getTable().style.display = 'none';
    outputImg.style.display = 'block';
  }
  function getParam(id) {
    return document.getElementById('param-'+id).value;
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
  function doPlotNow() {
    var br = output.getBoundingClientRect();
    var fn = selectedFunction();
    var params = {
      'rrpc.resultformat': {
        type: 'png',
        width: br.width,
        height: br.height
      }
    };
    toolkit.forEach(headerParams, function(paramId, columnIndex) {
      params[paramId] = getColumn(columnIndex);
    });
    toolkit.forEach(parameterSelectors, function(paramId, element) {
      params[paramId] = getParam(paramId);
    });
    if (subheaderParam) {
      params[subheaderParam] = unitSettings();
    }
    rrpc.call(fn, params, function(result, err) {
      statusMessage.textContent = '';
      if (err) {
        showError(err);
      } else if (result) {
        if (result.plot && result.plot.length) {
          showPlot(result.plot[0]);
        } else if (result.data) {
          showTable(result.data);
        } else {
          showError('no data returned');
        }
      }
    });
  };
  var doplot2 = toolkit.whenQuiet(14, doPlotNow);
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
        enumFn(paramId, d, t.values);
      } else if (t.kind[0] === 'column') {
        columnFn(paramId, d, getUnitValues(t));
      } else {
        console.warn('Did not understand type kind', t.kind[0]);
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
    toolkit.forEach(parameterSelectors, function(i,s) {
      if (s.parentNode) {
        s.parentNode.removeChild(s);
      }
    });
    parameterSelectors = {};
    var selected = selectedFunction();
    subheaderParam = null;
    var fd = schema.functions[selected];
    var headers = [];
    var data = [];
    subheaderChoices = [];
    var subheaderInitials = [];
    headerParams = {};
    forEachParam(fd, function(paramId, initialEnum, enumValues) {
      var button = toolkit.paramButton(paramId, paramId, localizeArray(enumValues),
          initialEnum[0], doplot);
      parameterSelectors[paramId] = button;
      top.appendChild(button);
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
      setupScreen()
      // top buttons
      top.textContent = '';
      var fns = localizeArray(Object.keys(schema.functions));
      var fs = toolkit.paramButton('function', 'Function', fns, null, setParameters);
      functionSelector = fs.getElementsByTagName('select')[0];
      top.appendChild(functionSelector);
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
  }
}
