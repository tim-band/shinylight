function geoplotr() {
  var headers = ['TIO2(WT%)', 'ZR(PPM)', 'Y(PPM)'];
  var inputGrid;
  var output;
  var outputImg;
  var outputError;
  var outputTable;
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
    var ks = Object.keys(data);
    var headers = [];
    var table = [];
    for (var i = 0; i !== ks.length; ++i) {
      appendColumns(headers, table, data, ks[i]);
    }
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
    var ids = Object.keys(unit);
    for (var i = 0; i !== ids.length; ++i) {
      var id = ids[i];
      var opt =document.createElement('option');
      opt.textContent = unit[id];
      opt.setAttribute('value', id.toLowerCase());
      if (initial === id) {
        opt.setAttribute('selected', 'true');
      }
      sel.appendChild(opt);
    }
    sel.onchange = onchange;
    return sel;
  }
  rrpc.initialize(function() {
    rrpc.call('testData', {}, function(result, err) {
      var data = result.data;
      // table
      if (err) {
        console.error(err);
        return;
      }
      var i, j;
      var rows = [];
      for (i = 0; i !== data.length; ++i) {
        var d = data[i];
        var row = [];
        for (j = 0; j !== headers.length; ++j) {
          row.push(d[headers[j]]);
        }
        rows.push(row);
      }
      var colHeaders = [];
      var colSubheaders = [];
      var re = /^(.*)\((.*)\)\s*$/;
      for (i = 0; i !== headers.length; ++i) {
        var parts = re.exec(headers[i]);
        colHeaders.push(parts[1]);
        colSubheaders.push(parts[2]);
      }
      inputGrid = createDataEntryGrid(null, colHeaders, rows);
      var unitProportion = {
        'WT%': '% by weight',
        'PPM': 'ppm'
      };
      for (let i = 0; i !== headers.length; ++i) {
        inputGrid.getColumnSubheader(i).appendChild(
          unitSelect(unitProportion, colSubheaders[i], doplot)
        );
      }
      var table = inputGrid.getTable();
      table.classList.add('data-entry-grid');
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
      // top buttons
      var top = document.getElementById('top');
      top.textContent = '';
      top.append(
        toolkit.paramButton('plot', 'Plot type', {
          ternary: 'Ternary',
          logratio: 'Log ratio',
          none: 'None'
        }, doplot),
        toolkit.paramButton('type', 'Analysis type', {
          LDA: 'LDA',
          QDA: 'QDA',
          Pearce: 'Pearce'
        }, doplot)
      );
      doplot();
    })}, function(err) {
      console.error(err);
    }
  );
}
