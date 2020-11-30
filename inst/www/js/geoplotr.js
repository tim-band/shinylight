function geoplotr() {
  var inputGrid;
  var output;
  var outputImg;
  var outputError;
  var outputTable;
  var schema;
  // The SELECT element that chooses the function to be called
  var functionSelector;
  var parameterSelectors = [];
  // The name of the parameter (if required) that takes the list
  // of column subheaders
  var subheaderParam;
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
  function doPlotNow() {
    var br = output.getBoundingClientRect();
    rrpc.call('TiZrY', {
      Ti: getColumn(0),
      Zr: getColumn(1),
      Y: getColumn(2),
      units: [getUnitSetting(0), getUnitSetting(1), getUnitSetting(2)],
      type: getParam('type'),
      plot: getParam('plot'),
      'rrpc.resultformat': {
        type: 'png',
        width: br.width,
        height: br.height
      }
    }, function(result, err) {
      statusMessage.textContent = "";
      if (err) {
        showError(err);
      } else if (result) {
        if (result.plot && result.plot.length) {
          showPlot(result.plot[0]);
        } else if (result.data) {
          showTable(result.data);
        } else {
          showError("no data returned");
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
  function setInputGrid(headers, subheaders, units, functionDescriptor) {
    var c;
    var rowCount = 0;
    var data = [];
    for (c = 0; c != headers.length; ++c) {
      var e = functionDescriptor.example[headers[c]];
      data[c] = e;
      rowCount = Math.max(e.length, rowCount);
    }
    var r;
    var rows = [];
    for (r = 0; r !== rowCount; ++r) {
      var row = [];
      for (c = 0; c !== headers.length; ++c) {
        row.push(data[c][r]);
      }
      rows.push(row);
    }
    inputGrid.init(headers, rows);
    if (!subheaders) return;
    for (c = 0; c !== subheaders.length; ++c) {
      var s = subheaders[c];
      if (s) {
        var vals = {};
        toolkit.forEach(schema.types[s].values, function(i, v) {
          vals[v] = v; // TODO: localization
        });
        inputGrid.getColumnSubheader(c).appendChild(
            unitSelect(vals, units[c], doplot)
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
    parameterSelectors = [];
    var selected = functionSelector.value;
    if (!selected) {
      selected = functionSelector.options[0].value;
    }
    subheaderParam = null;
    var fd = schema.functions[selected];
    var headers = [];
    var subheaders = [];
    toolkit.forEach(fd.params, function(k, typeName) {
      var t = schema.types[typeName[0]];
      if (typeof(t) === 'undefined') {
        if (typeName[0] === 'subheader') {
          subheaderParam = k;
        } else {
          console.warn('Did not understand type name', typeName[0]);
        }
      } else if (t.kind[0] === 'enum') {
        var vals = {};
        toolkit.forEach(t.values, function(i, v) { vals[v] = v; }); // TODO: localization
        var button = toolkit.paramButton(k, k, vals, doplot);
        parameterSelectors.push(button);
        top.appendChild(button);
      } else if (t.kind[0] === 'column') {
        subheaders.push(t.unittype ? t.unittype[0] : null);
        headers.push(k); // TODO: localization
      } else {
        console.warn('Did not understand type kind', t.kind[0]);
      }
    });
    setInputGrid(headers,
      subheaderParam? subheaders : null,
      subheaderParam? fd.example[subheaderParam] : [],
      fd);
  }
  rrpc.initialize(function() {
    rrpc.call('getSchema', {}, function(result, err) {
      schema = result.data;
      setupScreen()
      // top buttons
      top.textContent = '';
      var fns = {};
      toolkit.forEach(schema.functions, function(k) {
        fns[k] = k; // TODO: localization
      });
      var fs = toolkit.paramButton('function', 'Function', fns, setParameters);
      functionSelector = fs.getElementsByTagName('select')[0];
      top.appendChild(functionSelector);
      setParameters();
    });
  });
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
