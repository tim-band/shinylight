function geoplotr() {
  var headers = ['TIO2(WT%)', 'ZR(PPM)', 'Y(PPM)'];
  var inputGrid;
  function getNumberColumn(header) {
    var index = headers.indexOf(header);
    if (index < 0) {
      console.error("No such column", header);
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
      var left = document.createElement('div');
      left.style.overflow = 'auto';
      left.appendChild(table);
      var right = document.createElement('p');
      right.textContent = 'Here is the text of the right bit of this thing, where the output should go. It also has some words in it, which hopefully should wrap at some point, and they certainly will if the left does, as the right is longer.';
      toolkit.verticalDivide(document.getElementById('middle'), left, right);
    })}, function(err) {
      console.error(err);
    }
  );
  document.getElementById('doplot').onclick = function() {
    var br = document.getElementById('plot').getBoundingClientRect();
    console.log('current plot bounding rectangle', br);
    rrpc.call('TiZrY', {
      Ti: getNumberColumn('TIO2(WT%)'),
      Zr: getNumberColumn('ZR(PPM)'),
      Y: getNumberColumn('Y(PPM)'),
      units: ['wt%', 'ppm', 'ppm'],
      type: 'QDA',
      plot: 'ternary',
      'rrpc.resultformat': {
        type: 'png',
        width: '200',
        height: '300'
      }
    }, function(result, err) {
      console.log(err, result);
      if (result) {
        document.getElementById('plot').setAttribute('src', result[0]);
      }
    })
  };
  document.getElementById('data').onclick = function() {
    rrpc.call('testData', {}, function(result, err) {
      console.log(err, result);
    });
  }
}
