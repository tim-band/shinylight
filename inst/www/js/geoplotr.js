function geoplotr() {
  var headers = ['TIO2(WT%)', 'ZR(PPM)', 'Y(PPM)'];
  var inputGrid;
  var output;
  var outputImg;
  function doPlotNow() {
    var br = output.getBoundingClientRect();
    rrpc.call('TiZrY', {
      Ti: getNumberColumn('TIO2(WT%)'),
      Zr: getNumberColumn('ZR(PPM)'),
      Y: getNumberColumn('Y(PPM)'),
      units: ['wt%', 'ppm', 'ppm'],
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
  function getNumberColumn(header) {
    var index = headers.indexOf(header);
    if (index < 0) {
      console.warn("No such column", header);
      return [];
    }
    var c = inputGrid.getColumn(index);
    var i;
    for (i = 0; i != c.length; ++i) {
      c[i] = parseFloat(c[i]);
    }
    return c;
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
      inputGrid = createDataEntryGrid(null, headers, rows);
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
