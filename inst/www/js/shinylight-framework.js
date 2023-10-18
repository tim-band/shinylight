/**
 * @namespace framework
 */
/**
 * Starts the Shinylight Framework, if you want to use it.
 *
 * The Shinylight Framework allows you to declare all your functions
 * in R and have a nice-looking web front end for your code without
 * having to write any JavaScript.
 *
 * You should never need to call this function yourself; if you do not
 * provide your own \code{index.html}, the default Shinylight one
 * will be used that will call this function on page load.
 *
 * Using the Shinylight Framework entails calling the {@link slServer}
 * function with the \code{interface} argument set to
 * \code{list(getSchema=schema)}, where
 * \code{schema} is defined in the following section.
 * 
 * }\section{The Schema}{
 * 
 * It is a list with the following members:
 * \describe{
 *  \item{\code{functions}}{a list of functions (keyed by their names),
 *   each of which is a list with the following members: \describe{
 *    \item{\code{params}}{a list of the main parameters the function
 *     accepts. The keys are the parameter names and the values are
 *     keys into the schema's \code{params} list.}
 *    \item{\code{optiongroups}}{a vector of keys into the schema's
 *     \code{optiongroups} list giving other parameters to this function.}
 *  }}
 *  \item{\code{functiongroups}}{optional: the menu structure for the
 *   functions menu. Each item in the list is either a function name (a
 *   string referencing a key in the \code{functions} list) or a list
 *   representing a submenu. Submenu keys are the name to be
 *   displayed in the list, which can be overridden in the app.json
 *   file's \code{functions} object, just like providing localized
 *   names for functions.
 *  }
 *  \item{\code{params}}{a list of the parameters the functions take,
 *   each of which is a list with the following members: \describe{
 *    \item{\code{type}}{either a key into the schema's \code{types} list,
 *     giving the type of this parameter or the values it can take, or one
 *     of a set of standard types: \describe{
 *      \item{\code{'b'}}{Boolean}
 *      \item{\code{'f'}}{Floating point}
 *      \item{\code{'u8'}}{8-bit unsigned integer}
 *      \item{\code{'color'}}{Colour}
 *      \item{\code{'subheader'}}{Vector of settings the user can choose
 *       for each column using selectors in the subheader row. This is
 *       usually used to select units (for example percent-by-weight versus
 *       parts-per-million) for the columns.}
 *    }}
 *    \item{\code{data}}{a key into the schema's \code{data} list,
 *     giving initial or example data for this parameter.}
 *  }}
 *  \item{\code{types}}{a list of types with keys referened from the
 *   schema's \code{params} lists's \code{type} values. The values
 *   are a list with the following members: \describe{
 *    \item{\code{kind}}{Mandatory; one of: \describe{
 *     \item{\code{'enum'}}{Enumeration type}
 *     \item{\code{'column'}}{A column from the input grid}
 *   }}
 *   \item{\code{values}}{A vector of permitted values (only if
 *    \code{kind='enum'})}
 *   \item{\code{factors}}{Only if \code{kind='enum'} and this enum
 *    is used as the unit type for some column; a vector of factors to
 *    multiply column data by if the unit is changed by the user. Must
 *    have the same number of elements as the \code{values}
 *    vector. For every n, \code{factors[[n]]} of unit
 *    \code{values[[n]]} must be equal. For example, if
 *    \code{values=c('mm', 'cm', 'inch')} then \code{factors} could be
 *    \code{c(25.4, 2.54, 1.0)}.}
 *   \item{\code{subtype}}{Only if \code{kind='column'}. The type of
 *    data that can be entered into the column. Currenly only \code{'f'}
 *    works well.}
 *   \item{\code{unittype}}{Optional and only if \code{kind='column'}.
 *    The name of an enum type defining the units that the data in this
 *    column can be expressed in.}
 *  }}
 *  \item{\code{data}}{A list of initial data with which table columns and
 *   controls will be populated. Can be a single value or vector (or list)
 *   as appropriate.}
 *  \item{\code{optiongroups}}{A list of option groups. Each one is a set
 *   of parameters that can be added as a block to functions that want
 *   them. Each element is a list with the following keys: \describe{
 *    \item{\code{type}}{The same as for \code{param}'s \code{type}:
 *     either a key into the schema's \code{types} list or one of the
 *     standard types (\code{'b'}, \code{'u8'}, \code{'f'} or
 *     \code{'color'}).}
 *    \item{\code{initial}}{The initial value for this option.}
 *   }
 *   There is one special key in the \code{optiongroups} list; this is the
 *   \code{framework} key. This is reserved for options that apply to
 *   the framework itself, not to any of your functions. So far, the only
 *   option it has is \code{autorefresh=list(type="b", initial=FALSE)}.
 *   You can set its initial value to \code{TRUE} if you prefer. If you add
 *   this option, it controls whether the GUI has a "Calculate" button
 *   (\code{FALSE}) or whether the output should refresh a second or
 *   two after the user finishes changing parameters (\code{TRUE}).
 * }}
 *
 * }\section{Localization}{
 *
 * To display human-friendly text on the controls and to get tooltip
 * help text, you need one or more localization files. These files
 * are named \code{inst/www/locales/XX/app.json} where
 * \code{XX} is replaced with the appropriate ISO language code.
 * 
 * These files are JSON files containing an object with the following
 * keys: \describe{
 *  \item{\code{title}}{Text for the link to put in the top left}
 *  \item{\code{homepage}}{Destination for the link to put in the top left}
 *  \item{\code{functions}}{One pair of translations for each
 *   function in the schema.}
 *  \item{\code{params}}{One pair of translations for each
 *   parameter in the schema.}
 *  \item{\code{optiongroups}}{Each of the \code{optiongroups}
 *   in the schema gets a key which maps to an object which has
 *   the following keys: \describe{
 *   \item{\code{@title}}{A translation pair for the option group itself.}
 *   \item{...}{One translation pair for each option in the group.}
 *  }}
 *  \item{\code{types}}{One object for each \code{'enum'} type in
 *  the schema. Each value is an object with one key per possible
 *  enum value. Each value in this object is that enum value's
 *  translation pair.}
 * }
 * 
 * A "translation pair" is an object with the following keys: \describe{
 *  \item{\code{name}}{A short name}
 *  \item{\code{help}}{Tooltip text}
 * }
 * @param {object} [options] An optional object containing options
 * to modify the behaviour of the framework.
 * @param {function} [options.createFileInput] A function to create
 * an element that uploads a file, as required for
 * \code{toolkit.loadFileButton}.
 * @see toolkit.loadFileButton
 */
function shinylightFrameworkStart(options) {
  var userOptions = typeof(options) === 'object'? options : {};
  var inputGrid;
  var optionGroups = {};
  var optionGroupTitle = {};
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
  var calculateButtons = [];
  // All the data for the columns that are currently disabled (i.e.
  // valid for the current function but the settings the parameters
  // currently have make irrelevant). These columns will be put
  // back into the table if the columns become enabled again.
  // It is a mapping of parameter IDs -> array of data
  var hiddenColumns = null;
  // subheader values for currently hidden columns
  var hiddenSubheaders = null;
  var top;
  var body;
  // Called when the R function returns and we want to see the output
  var endProgress = function() {};
  // Sets the progress bar
  var setProgress = function(numerator, denominator) {};
  // Sets progress info text
  var setProgressInfo = function(text) {};

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

  function unitSettings() {
    return inputGrid.getSubheaders();
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

  function downloadCsv(table, filename) {
    var h = table.getColumnHeaders();
    var rows = table.getCells();
    var rs = [h.join(',')];
    toolkit.forEach(rows, function(i,r) {
      rs.push(r.join(','));
    });
    download(filename, 'data:text/csv;base64,' + btoa(rs.join('\n')));
  }

  function prettyJson(j) {
    return JSON.stringify(j, null, 2);
  }

  var dotsPerUnit = {
    png: 1,
    svg: 75
  };

  function displayPlotNow(done, plotFormat='svg') {
    var imgSize = outputImgWrapper.getSize();
    var dpu = dotsPerUnit[plotFormat];
    doPlotNow({
      'rrpc.resultformat': {
        type: plotFormat,
        width: imgSize.width / dpu,
        height: imgSize.height / dpu
      }
    }, function(result, params, fn) {
      var data = {};
      if ('data' in result) {
        data.table = result.data;
      }
      var plot = toolkit.deref(result, ['plot', 0]);
      if (plot) {
        data.plot = plot;
      }
      data.debug = prettyJson({
        fn: fn,
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
    unsetEnableDisableParameters();
    // the function itself
    if (data.fn in schema.functions) {
      functionSelector.setData(data.fn);
    } else {
      console.error('no such function', data.fn);
    }
    headerParams = {};
    hiddenColumns = {};
    hiddenSubheaders = {};
    var units = null;
    var columns = [];
    var headers = [];
    var subheaderTypes = {};
    var p = data.parameters;
    var fd = schema.functions[data.fn];
    forEachParam(fd, function(paramId, initial, paramKey) {
      // parameters from the main screen
      var e = allParameterSelectors[paramKey];
      e.setData(p[paramId]);
    }, function(paramId, columnData, unitTypeName) {
      // a column for the input table
      if (paramId in p) {
        subheaderTypes[paramId] = unitTypeName;
        headerParams[paramId] = headers.length;
        columns[headers.length] = p[paramId];
        headers.push(paramId);
      } else {
        hiddenColumns[paramId] = [];
        hiddenSubheaders[paramId] = '';
      }
    }, function(paramId, dataUnits) {
      // subheader parameter
      units = toolkit.deref(p, [paramId]);
    });
    // options
    var optionGroup = toolkit.deref(schema.functions[data.fn], ['optiongroups'], {});
    toolkit.forEach(optionGroup, function(i, groupId) {
      toolkit.forEach(optionGroups[groupId], function(id, e) {
        e.setData(p[id]);
      });
    });
    setInputGrid(inputGrid.getColumnHeaders(), subheaderTypes, units, columns);
    setEnableDisableParameters();
    enableDisableParameters();
  }

  function addMainParams(params) {
    toolkit.forEach(shownParameters, function(k, id) {
      var e = allParameterSelectors[k];
      params[id] = e.getData();
    });
  }

  function getParams() {
    var p = {};
    var fn = selectedFunction();
    forEachParam(
      schema.functions[fn],
      noop,
      noop,
      function(subheaderParamId, dataUnits) {
        p[subheaderParamId] = unitSettings();
      }
    );
    // data from columns
    toolkit.forEach(headerParams, function(id, columnIndex) {
      p[id] = getColumn(columnIndex);
    });
    // find number of useful rows (ignoring trailing empty rows)
    var usefulCount = 0;
    toolkit.forEach(headerParams, function(id) {
      var col = p[id];
      for (var i = col.length; i !== usefulCount; --i) {
        var e = col[i - 1];
        if (!isNaN(e) && e !== '') {
          usefulCount = i;
          return;
        }
      }
    });
    // truncate columns
    toolkit.forEach(headerParams, function(id) {
      p[id].length = usefulCount;
    });
    // parameters from the main screen
    addMainParams(p);
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
      endProgress();
      if (err) {
        output.setData({
          error: { 'error-page': err },
          debug: prettyJson({ input: params })
        });
      } else if (result) {
        callback(result, params, p.fn);
      }
    }, {
      progress: setProgress,
      info: setProgressInfo
    });
  };

  var doPlot2 = noop;
  var dirtyPlot = noop;
  var enableDisableParameters = noop;

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

  function noop() {}

  function forEachParam(functionDescriptor, singleFn, columnFn, subheaderFn) {
    toolkit.forEach(functionDescriptor.params, function(paramId, paramKey) {
      var p = schema.params[paramKey[0]];
      var d = schema.data[p.data[0]];
      if (!d) {
        d = [null];
      }
      var t = schema.types[p.type[0]];
      if (typeof(t) === 'undefined') {
        if (p.type[0] === 'subheader') {
          subheaderFn(paramId, d);
        } else {
          singleFn(paramId, d[0], paramKey[0]);
        }
      } else if (t.kind[0] === 'enum') {
        singleFn(paramId, d[0], paramKey[0]);
      } else if (t.kind[0] === 'column') {
        try {
          var unitTypeName = 'unittype' in t? t.unittype[0] : null;
          columnFn(paramId, d, unitTypeName);
        } catch (e) {
          console.error("error:", e);
        }
      } else {
        console.warn('Did not understand type kind', t.kind[0]);
      }
    });
  }

  function translations(path, defaultValue) {
    var dr = toolkit.deref(translationDict, path, defaultValue);
    return dr === null? {} : dr;
  }

  function localizeHeaders(array) {
    var trs = translations(['app', 'params']);
    var h = [];
    toolkit.forEach(array, function(i, v) {
      h[i] = toolkit.deref(trs, [v, 'name'], v);
    });
    return h;
  }

  // transposes an array of arrays so that
  // result[i][j] === arrays[j][i] for each i and j
  function transpose(arrays) {
    var rows = 1;
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

  function setSubheaderTooltips(grid, tooltipArray) {
    toolkit.forEach(tooltipArray, function(i, text) {
      if (text) {
        grid.setSubheaderTooltip(i, text);
      }
    });
  }

  function setSubheaderOptionsTooltips(grid, tooltipMapArray) {
    toolkit.forEach(tooltipMapArray, function(col, opts) {
      if (opts) {
        toolkit.forEach(opts, function(opt, text) {
          if (text) {
            grid.setSubheaderOptionTooltip(col, opt, text);
          }
        });
      }
    });
  }

  // headers: Array of parameter IDs for the columns
  // subheaderTypes: Array of type IDs for the subheaders
  // units: Array of initial values for subheaders
  // data: Array of rows; each row is an array of cell values.
  function setInputGrid(headers, subheaderTypes, units, data) {
    var c = 0;
    var subheaderSpecs = [];
    var subheaderHelp = [];
    var subheaderOptionsHelp = [];
    var subheaderDefaults = [];
    var hasSubheaders = false;
    toolkit.forEach(subheaderTypes, function(k, paramKey) {
      if (paramKey in schema.types) {
        var type = schema.types[paramKey];
        if (type.kind[0] === 'enum') {
          hasSubheaders = true;
          subheaderDefaults.push(units? units[c] : null);
          var ts = translations(['app', 'types', paramKey], {});
          subheaderHelp.push(toolkit.deref(ts, ['@title', 'help']));
          var spec = {};
          var optionsHelp = {};
          toolkit.forEach(type.values, function(i, value) {
            spec[value] = toolkit.deref(ts, [value, 'name'], value);
            optionsHelp[value] = toolkit.deref(ts, [value, 'help'], value);
          });
          subheaderSpecs.push(spec);
          subheaderOptionsHelp.push(optionsHelp);
        } else {
          subheaderSpecs.push(null);
          subheaderOptionsHelp.push(null);
          subheaderHelp.push(null);
          subheaderDefaults.push(null);
        }
      } else {
        if (paramKey) {
          console.warn("no such type", paramKey);
        }
        subheaderSpecs.push(null);
        subheaderDefaults.push(null);
      }
      ++c;
    });
    var headers = localizeHeaders(headers);
    var rows = transpose(data);
    const trailingZeroes = /\.?0*$/;
    inputGrid.init(headers, rows, hasSubheaders? subheaderSpecs : null, subheaderDefaults);
    setSubheaderTooltips(inputGrid, subheaderHelp);
    setSubheaderOptionsTooltips(inputGrid, subheaderOptionsHelp);
    inputGrid.setReunittingFunction(function(index, currentValue, newValue, col) {
      paramKey = subheaderTypes[index];
      if (paramKey in schema.types) {
        var type = schema.types[paramKey];
        if (type.kind[0] === 'enum') {
          if ('factors' in type) {
            var was = type.values.indexOf(currentValue);
            var is = type.values.indexOf(newValue);
            var num = type.factors[is];
            var den = type.factors[was];
            var prec = newValue === units[index]? 8:9;
            return col.map(function(v) {
              const r = num * v / den;
              if (Number.isNaN(r)) {
                return v;
              }
              return r.toPrecision(prec).replace(trailingZeroes, '');
            });
          }
        }
      } else {
        console.warn("no such type", paramKey);
      }
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

  function addControl(typeId, elementId, container, tr, initial, callback) {
    var e = toolkit.deref(schema, ['types', typeId]);
    if (e) {
      var kindId = toolkit.deref(e, ['kind', 0]);
      if (kindId === 'enum') {
        var valuesTr = translations(['app', 'types', typeId],
          translations(['framework', 'framework-types', typeId], {}));
        return toolkit.paramSelector(elementId, container,
          tr, e.values, valuesTr, initial, callback);
      }
      return null;
    }
    if (typeId in standardTypes) {
      return standardTypes[typeId](elementId, container, tr, initial, callback);
    }
    return toolkit.paramText(elementId, container, tr, initial, callback);
  }

  // taking a dependency declaration (from schema.optiondepends.<optionId>
  // or schema.functions.<functionId>.paramdepends.<paramId>) and a
  // dictionary of all relevant param or option IDs to their current values,
  // returns whether or not the option is enabled.
  function dependencyEnabled(depends, values) {
    if (!depends) {
      return true;
    }
    return toolkit.any(depends, function(i, dependAnd) {
      return toolkit.all(dependAnd, function(paramId, d) {
        var p = toolkit.deref(values, [paramId]);
        if (typeof(d) === 'object') {
          return toolkit.any(d, function(i, v) { return v === p; });
        }
        return p === d;
      });
    });
  }

  // Look into schema.optiondepends to see if any options need to be
  // disabled or enabled.
  // For now we are just hiding or showing it.
  function enableDisableOptions() {
    var depends = toolkit.deref(schema, ['optiondepends']);
    if (!depends) {
      return;
    }
    var options = optionsPage.getData();
    toolkit.forEach(optionGroups, function(groupId, group) {
      toolkit.forEach(group, function(optionId, option) {
        var dependOr = toolkit.deref(depends, [optionId]);
        if (dependencyEnabled(dependOr, options)) {
          option.show();
        } else {
          option.hide();
        }
      });
    });
  }

  // Look into schema.optiondepends to see if any options need to be
  // disabled or enabled.
  // For now we are just hiding or showing it.
  function doEnableDisableParameters() {
    var params = {};
    addMainParams(params);
    var fd = schema.functions[selectedFunction()];
    var depends = toolkit.deref(fd, ['paramdepends']);
    var selected = selectedFunction();
    var newHeaders = [];
    var newHiddenHeaders = [];
    var subheaderTypes = {};
    var newHeaderParams = {};
    var subheaderParam = null;
    var changed = false;
    var fd = schema.functions[selected];
    forEachParam(fd, function(paramId, initial, paramKey) {
      // normal parameters are easy: just show or hide
      var e = allParameterSelectors[paramKey];
      var dependOr = toolkit.deref(depends, [paramId]);
      if (dependencyEnabled(dependOr, params)) {
        if (!(paramKey in shownParameters)) {
          shownParameters[paramKey] = paramId;
          e.show();
        }
      } else if (paramKey in shownParameters) {
        delete shownParameters[paramKey];
        e.hide();
      }
    }, function(paramId, columnData, unitTypeName) {
      subheaderTypes[paramId] = unitTypeName;
      var dependOr = toolkit.deref(depends, [paramId]);
      if (dependencyEnabled(dependOr, params)) {
        newHeaderParams[paramId] = newHeaders.length;
        newHeaders.push(paramId);
        if (paramId in hiddenColumns) {
          changed = true;
        }
      } else {
        newHiddenHeaders.push(paramId);
        if (!(paramId in hiddenColumns)) {
          changed = true;
        }
      }
    }, function(paramId, dataUnits) {
      subheaderParam = paramId;
    });
    if (!changed) {
      return;
    }
    var currentData = inputGrid.getColumnArray();
    var currentSubheaderValues = unitSettings();
    var newColumns = [];
    var subheaderValues = [];
    var subheaderTypeArray = [];
    toolkit.forEach(newHeaders, function(i, h) {
      if (h in hiddenColumns) {
        // Column is newly shown
        newColumns.push(hiddenColumns[h]);
        subheaderValues.push(hiddenSubheaders[h]);
      } else {
        // Column is still shown
        var columnIndex = headerParams[h];
        newColumns.push(currentData[columnIndex]);
        subheaderValues.push(currentSubheaderValues[columnIndex]);
      }
      subheaderTypeArray.push(subheaderTypes[h]);
    });
    var newHiddenColumns = {};
    var newHiddenSubheaders = {};
    toolkit.forEach(newHiddenHeaders, function(i, h) {
      if (h in hiddenColumns) {
        // column is still hidden
        newHiddenColumns[h] = hiddenColumns[h];
        newHiddenSubheaders[h] = hiddenSubheaders[h];
      } else {
        // column is newly hidden
        var columnIndex = headerParams[h];
        newHiddenColumns[h] = currentData[columnIndex];
        newHiddenSubheaders[h] = currentSubheaderValues[columnIndex];
      }
    });
    hiddenColumns = newHiddenColumns;
    hiddenSubheaders = newHiddenSubheaders;
    headerParams = newHeaderParams;
    newHeaders.push('');
    newColumns.push([]);
    setInputGrid(newHeaders,
      subheaderTypeArray,
      subheaderParam? subheaderValues : null,
      [[]]);
    inputGrid.setColumnArray(newColumns);
    body.resize();
  }

  function unsetEnableDisableParameters() {
    enableDisableParameters = noop;
  }

  function setEnableDisableParameters() {
    var fd = schema.functions[selectedFunction()];
    if (toolkit.deref(fd, ['paramdepends'])) {
      enableDisableParameters = doEnableDisableParameters;
    } else {
      unsetEnableDisableParameters();
    }
  }

  function ensureCallable(fn) {
    return typeof(fn) === 'function'? fn : noop;
  }

  function forEachOptionGroup(groupFn, optionFn) {
    if (typeof(schema.optiongroups) !== 'object') {
      return;
    }
    groupFn = ensureCallable(groupFn);
    optionFn = ensureCallable(optionFn);
    toolkit.forEach(schema.optiongroups, function(groupId, group) {
      groupFn(groupId, group);
      toolkit.forEach(group, function(optionId, option) {
        optionFn(optionId, option, groupId);
      });
    });
  }

  function enableDisableOptionGroups() {
    var selected = selectedFunction();
    var wantedGroups = toolkit.deref(
      schema, ['functions', selected, 'optiongroups'], {}
    );
    var wanted = false;
    forEachOptionGroup(function(groupId) {
      wanted = groupId == 'framework' ||
        toolkit.any(wantedGroups, function(i, g) {
          return g === groupId;
        });
      if (wanted) {
        optionGroupTitle[groupId].show();
      } else {
        optionGroupTitle[groupId].hide();
      }
    }, function(optionId, option, groupId) {
      if (wanted) {
        optionGroups[groupId][optionId].show();
      } else {
        optionGroups[groupId][optionId].hide();
      }
    });
  }

  function setOptions() {
    if (typeof(schema.optiongroups) !== 'object') {
      return;
    }
    forEachOptionGroup(function(groupId) {
      if (!(groupId in optionGroups)) {
        optionGroups[groupId] = {};
      }
      var groupTr = translations(['framework', 'framework-options', '@title'], { name: groupId });
      if (groupId !== 'framework') {
        groupTr = translations(['app', 'optiongroups', groupId, '@title'], groupTr);
      }
      optionGroupTitle[groupId] = toolkit.groupTitle(optionsPage, groupTr);
    }, function(optionId, option, groupId) {
      var typeId = toolkit.deref(option, ['type', 0]);
      var tr = translations(['app', 'optiongroups', groupId, optionId], { name: optionId });
      if (groupId === 'framework') {
        tr = translations(['framework', 'framework-options', optionId], tr);
      }
      var initial = toolkit.deref(option, ['initial', 0]);
      var callback = toolkit.deref(
        optionCallbacks, [groupId, optionId],
        function() {
          enableDisableOptions();
          markPlotDirty();
        }
      );
      optionGroups[groupId][optionId] = addControl(typeId, optionId, optionsPage, tr, initial, callback);
    });
    body.resize();
  }

  function setParameters() {
    enableDisableOptionGroups();
    unsetEnableDisableParameters();
    toolkit.forEach(shownParameters, function(k,i) {
      allParameterSelectors[k].hide();
    });
    headerParams = {};
    hiddenColumns = {};
    hiddenSubheaders = {};
    shownParameters = {};
    var selected = selectedFunction();
    var fd = schema.functions[selected];
    var headers = [];
    var data = [];
    var subheaderInitials = null;
    var subheaderTypes = [];
    forEachParam(fd, function(paramId, initial, paramKey) {
      shownParameters[paramKey] = paramId;
      var e = allParameterSelectors[paramKey];
      e.show();
      e.setData(initial);
    }, function(paramId, columnData, unitTypeName) {
      headerParams[paramId] = headers.length;
      headers.push(paramId);
      data.push(columnData);
      subheaderTypes.push(unitTypeName);
    }, function(paramId, dataUnits) {
      subheaderInitials = dataUnits;
    });
    headers.push('');
    setInputGrid(headers,
      subheaderTypes,
      subheaderInitials,
      data);
    setEnableDisableParameters();
    enableDisableParameters();
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

  function reconnect(error) {
    console.log('Attempting to connect after error');
    setTimeout(
      rrpc.initialize,
      2000,
      function() {
        console.log('Reconnected.')
      },
      reconnect
    );
  }

  loadTranslations(function(tr) {
    translationDict = tr;
    rrpc.initialize(function() {
      rrpc.call('getSchema', {}, function(result, err) {
        schema = result.data;
        body = setupScreen();
        toolkit.setAsBody(body);
        removeTopParameters();
        addFunctionSelectButton();
        addParamSelectors();
        setOptions();
        setParameters();
        if (typeof(shinylight_initial_data) === 'string') {
          try {
            setParams(JSON.parse(shinylight_initial_data));
          } catch (e) {
            console.error(e);
            console.error('Failing JSON data:', shinylight_initial_data);
          }
        }
        enableDisableOptions();
        displayPlotNow(function() {
          setCalculateMode(calculateMode());
        });
      });
    }, reconnect);
  });

  function removeTopParameters() {
    var nodes = top.childNodes;
    var i = 0;
    while (i < nodes.length) {
      if (nodes[i].classList.contains('param-box')) {
        top.removeChild(nodes[i]);
      } else {
        ++i;
      }
    }
  }

  function addFunctionSelectButton() {
    var fns = Object.keys(schema.functions);
    if ('functiongroups' in schema) {
      fns = schema.functiongroups;
    }
    functionSelector = toolkit.paramSelector('function-selector', top,
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
    var outputErrorPage = toolkit.stack();
    var outputError = toolkit.staticText(
      'error-page',
      outputErrorPage,
      translations(['framework', 'error'])
    );
    var outputTable = createDataEntryGrid(null, 5, 5);
    outputImg.id = 'output-plot';
    outputError.id = 'output-error';
    translateGrid(outputTable);
    var oTable = outputTable.getTable();
    oTable.id = 'output-table';
    oTable.classList.add('data-entry-grid');
    oTable.setAttribute('style', 'width: 100%; height: 100%;');
    oTable.setData = function(data) {
      var t = shinylight.makeTable(data, 1);
      outputTable.init(t.headers, t.rows);
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
      downloadJsonText('params.json', JSON.stringify(getParams()));
    }), buttonTranslations);
    const createFileInput = toolkit.deref(userOptions, ['createFileInput']);
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
    }, buttonTranslations, createFileInput);
    var clearData = toolkit.button('cleardata', function(callback) {
      var cs = new Array(inputGrid.columnCount()).fill([null]);
      inputGrid.setColumnArray(cs);
      callback();
    }, buttonTranslations);
    var plotFooter = toolkit.banner({
      downloadPlot: toolkit.button('download-pdf',
        downloadPdf, translations(['framework', 'buttons']))
    }, 'output-footer');
    var tableFooter = toolkit.banner({
      downloadCsv: toolkit.button(
        'download-csv',
        function(callback) {
          downloadCsv(outputTable, 'output.csv')
          setTimeout(callback, 200);
        },
        buttonTranslations
      )
    }, 'output-footer');
    var outputDebugPage = toolkit.stack();
    toolkit.preformattedText(
      'debug-text',
      outputDebugPage,
      translations(['framework', 'labels', 'debug-text'])
    );
    var debugJson = '';
    var debugFooter = toolkit.banner({
      downloadDebug: toolkit.button(
        'download-json',
        function() {
          downloadJsonText('debug.json', debugJson);
        },
        buttonTranslations
      )
    }, 'output-footer');
    debugFooter.setData = function(json) {
      debugJson = json;
    };
    outputImgWrapper = toolkit.nonScrollingWrapper(outputImg);
    output = toolkit.pages({
      plot: toolkit.footer(plotFooter, outputImgWrapper),
      table: toolkit.footer(tableFooter, toolkit.scrollingWrapper(oTable)),
      error: outputErrorPage,
      debug: toolkit.footer(debugFooter, toolkit.scrollingWrapper(outputDebugPage))
    }, translations(['framework', 'pages']), 'output-tab-');
    optionsPage = toolkit.optionsPage();
    var inputPane = toolkit.pages({
      inputTable: table,
      options: optionsPage
    }, translations(['framework', 'pages']), 'input-tab-');
    var leftFooter = toolkit.banner({
      savedata: saveData,
      loaddata: loadData,
      cleardata: clearData,
      calculate: calculate1
    }, 'input-footer')
    var leftPane = toolkit.footer(leftFooter, inputPane);
    var progressBar = toolkit.progressBar(20);
    progressBar.id = 'progress-bar';
    var progressPage = toolkit.optionsPage();
    toolkit.staticText(
      'progress-text',
      progressPage,
      translations(['framework', 'progressText'])
    ).id = 'progress-text';
    toolkit.staticText(
      'progress-info',
      progressPage,
      translations(['framework', 'statusText'])
    ).id = 'progress-info';
    var progress = toolkit.nonScrollingWrapper(toolkit.header(
      toolkit.nonScrollingWrapper(progressBar, 8, 13),
      toolkit.nonScrollingWrapper(progressPage)
    ), 12, 20);
    progress.id = 'progress-page';
    endProgress = function() {
      progress.hide();
      progressBar.setData(0);
      progressPage.setData({
        'progress-text': '',
        'progress-info': ''
      });
    };
    setProgress = function(numerator, denominator) {
      progress.show();
      if (denominator !== 0) {
        progressBar.setData(numerator/denominator);
      }
      const text = denominator === 1?
        Math.ceil(numerator * 100) + '%' : numerator + ' / ' + denominator;
      progressPage.setData({
        'progress-text': text
      });
    };
    setProgressInfo = function(text) {
      progress.show();
      progressPage.setData({
        'progress-info': text
      });
    };
    progress.hide();
    var outputAndProgress = toolkit.overlay(progress, output);
    var doc = toolkit.verticalDivide(null, leftPane, outputAndProgress);
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
    logo.style.float = 'left';
    //var header = toolkit.leftSideBar(toolkit.scrollingWrapper(logo, 10, 30), top);
    //header.classList.add('top-header');
    top.classList.add('top-header');
    top.appendChild(logo);
    inputGrid.addWatcher(markPlotDirty);
    return toolkit.header(top, doc);
  }

  function addParamSelectors() {
    paramKeys = {};
    toolkit.forEach(schema.functions, function(fid, fd) {
      toolkit.forEach(fd.params, function(pid, paramKey) {
        var v = toolkit.deref(schema.params, [paramKey]);
        if (v) {
          paramKeys[paramKey] = v;
        }
      });
    });
    allParameterSelectors = {};
    toolkit.forEach(paramKeys, function(paramKey, p) {
      var c = addControl(
        p.type[0],
        paramKey,
        top,
        translations(['app', 'params', paramKey]),
        toolkit.deref(schema.data, [p.data[0], 0], null),
        function() {
          markPlotDirty();
          enableDisableParameters();
        }
      );
      if (c) {
        allParameterSelectors[paramKey] = c;
        c.hide();
      }
    });
  }
}
