function geoplotr() {
  var testData;
  rrpc.initialize(function() {
    rrpc.call('testData', {}, function(result, err) {
      testData = {Ti:[],Zr:[],Y:[]};
      if (err) {
        console.error(err);
        return;
      }
      for (var i = 0; i != result.length; ++i) {
        var d = result[i];
        testData.Ti.push(d['TIO2(WT%)']);
        testData.Zr.push(d['ZR(PPM)']);
        testData.Y.push(d['Y(PPM)']);
      }
    })}, function(err) {
      console.error(err);
    }
  );
  document.getElementById('doplot').onclick = function() {
    rrpc.call('TiZrY', {
      Ti: testData.Ti,
      Zr: testData.Zr,
      Y: testData.Y,
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
