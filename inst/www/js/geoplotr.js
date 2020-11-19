function geoplotr() {
  var headers = ['TIO2(WT%)', 'ZR(PPM)', 'Y(PPM)'];
  var inputGrid;
  var output;
  var outputImg;
  function doPlotNow() {
    var br = output.getBoundingClientRect();
    rrpc.call('TiZrY', {
      Ti: getColumn(0),
      Zr: getColumn(1),
      Y: getColumn(2),
      units: [getUnitSetting(0), getUnitSetting(1), getUnitSetting(2)],
      type: 'QDA',
      plot: 'ternary',
      'rrpc.resultformat': {
        type: 'png',
        width: br.width,
        height: br.height
      }
    }, function(result, err) {
      if (result) {
        outputImg.setAttribute('src', result[0]);
      }
    })
  };
  var doplot = toolkit.whenQuiet(14, doPlotNow);
  function getColumn(index) {
    var c = inputGrid.getColumn(index);
    var i;
    for (i = 0; i != c.length; ++i) {
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
    for (var i = 0; i != ids.length; ++i) {
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
      if (err) {
        console.error(err);
        return;
      }
      var i, j;
      var rows = [];
      for (i = 0; i != result.length; ++i) {
        var d = result[i];
        var row = [];
        for (j = 0; j != headers.length; ++j) {
          row.push(d[headers[j]]);
        }
        rows.push(row);
      }
      var colHeaders = [];
      var colSubheaders = [];
      var re = /^(.*)\((.*)\)\s*$/;
      for (i = 0; i != headers.length; ++i) {
        var parts = re.exec(headers[i]);
        colHeaders.push(parts[1]);
        colSubheaders.push(parts[2]);
      }
      inputGrid = createDataEntryGrid(null, colHeaders, rows);
      var unitProportion = {
        'WT%': '% by weight',
        'PPM': 'ppm'
      };
      for (let i = 0; i != headers.length; ++i) {
        inputGrid.getColumnSubheader(i).appendChild(
          unitSelect(unitProportion, colSubheaders[i], doplot)
        );
      }
      var table = inputGrid.getTable();
      table.classList.add('data-entry-grid');
      table.id = 'input-plot';
      var left = document.createElement('div');
      left.style.overflow = 'auto';
      left.appendChild(table);
      output = document.createElement('div');
      outputImg = document.createElement('img');
      outputImg.setAttribute('style', 'width: 100%; height: 100%;');
      output.appendChild(outputImg);
      toolkit.verticalDivide(document.getElementById('middle'), left, output, doplot);
      inputGrid.addWatcher(doplot);
      doplot();
    })}, function(err) {
      console.error(err);
    }
  );
  document.getElementById('doplot').onclick = doplot;
  document.getElementById('data').onclick = function() {
    rrpc.call('testData', {}, function(result, err) {
      console.log(err, result);
    });
  }
}
