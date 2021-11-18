/**
 * @namespace shinylight
 */
var shinylight = function () {
    function forEach(a, f) {
        var k = Object.keys(a), i = 0;
        for (; i !== k.length; ++i) {
            var ki = k[i];
            f(ki, a[ki]);
        }
    }

    function getElement(elementOrId) {
        const t = typeof (elementOrId);
        if (t === 'string') {
            return document.getElementById(elementOrId);
        }
        if (t === 'undefined') {
            return null;
        }
        return elementOrId;
    }

    function setPlot(element, result) {
        if (typeof (result.plot) === 'object' && 0 in result.plot) {
            element.setAttribute('src', result.plot[0]);
        }
    }

    function arrayWidth(a) {
        return Math.max.apply(null, a.map(function (r) {
            return typeof (r) === 'object' ? r.length : 1;
        }));
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
            if (typeof (table[r]) === 'undefined') {
                table[r] = new Array(existingColumnCount).fill('');
            }
            var row = columns[r];
            if (typeof (row) !== 'object') {
                row = [row];
            }
            for (var c = 0; c !== width; ++c) {
                var v = row[c];
                if (typeof (v) === 'undefined') {
                    v = '';
                }
                table[r][existingColumnCount + c] = v;
            }
        }
    }

    function makeTable(data, extraColumns) {
        var extraColumnCount = 0;
        if (typeof (extraColumns) === 'number') {
            extraColumnCount = extraColumns;
            extraColumns = new Array(extraColumnCount);
        } else if (typeof (extraColumns) === 'object') {
            extraColumnCount = extraColumns.length;
        }
        if (Array.isArray(data)) {
            if (0 < data.length && data[0] instanceof Object) {
                // data frame was returned
                var table = [];
                var headerSet = {};
                var headers = [];
                forEach(data, function (i, row) {
                    var tableRow = [];
                    forEach(row, function (k, v) {
                        if (!(k in headerSet)) {
                            headerSet[k] = headers.length;
                            headers.push(k);
                        }
                        tableRow[headerSet[k]] = v;
                    });
                    table.push(tableRow);
                });
                return {
                    headers: headers.concat(extraColumns),
                    rows: table
                };
            }
            // array of scalars was returned
            return {
                headers: 1 + extraColumnCount,
                rows: data.map(function (x) { return [x]; })
            };
        }
        var headers = [];
        var table = [];
        forEach(data, function (k, v) {
            appendColumns(headers, table, k, v);
        });
        return {
            headers: headers.concat(extraColumns),
            rows: table
        };
    }

    function setElementText(elementOrId, text) {
        var element = getElement(elementOrId)
        if ('value' in element) {
            element.value = text;
        } else {
            element.textContent = text;
        }
    }

    function copyValue(to, from, key) {
        if (typeof(from) === 'object' && key in from) {
            to[key] = from[key];
        }
    }

    function callServer(fn, params, plotElement, extra) {
        if (typeof(extra) !== 'object') {
            extra = {};
        }
        const infoCallbacks = {};
        copyValue(infoCallbacks, extra, 'progress');
        copyValue(infoCallbacks, extra, 'info');
        return new Promise(function (resolve, errorFn) {
            plotElement = getElement(plotElement);
            if (plotElement) {
                if ('imgType' in extra && extra.imgType === 'svg') {
                    const dpi = 96 * window.devicePixelRatio;
                    params['rrpc.resultformat'] = {
                        type: 'svg',
                        width: plotElement.clientWidth / dpi,
                        height: plotElement.clientHeight / dpi
                    };
                } else {
                    params['rrpc.resultformat'] = {
                        type: 'png',
                        width: plotElement.clientWidth,
                        height: plotElement.clientHeight
                    };
                }
            }
            rrpc.call(fn, params, function (result, error) {
                if (error) {
                    errorFn(error);
                } else {
                    if (plotElement) {
                        setPlot(plotElement, result);
                    }
                    resolve(result);
                }
            }, infoCallbacks);
        });
    }

    return {
        /**
         * Call this before calling any other ShinyLight function.
         * Returns a promise that resolves (to nothing) when the
         * connection is ready.
         */
        initialize: function() {
            return new Promise((resolve, reject) => {
                rrpc.initialize(() => resolve(), error => reject(error));
            });
        },

        /**
         * Sets the text condent of an element (or its \code{value} as
         * appropriate).
         *
         * @param {string|HTMLElement} elementOrId The element (or its id)
         * that will have its text set
         * @param {string} text The text to set into the element
         */
        setElementText: setElementText,

        /**
         * Sets the text condent of an element (or its \code{value} as
         * appropriate) to the JSON representation of an object.
         *
         * @param {string|HTMLElement} elementOrId The element (or its id)
         * that will have its text set
         * @param {any} object The object whose JSON representation will be
         * set as the text content of the element
         */
        setElementJson: function (elementOrId, object) {
            var text = JSON.stringify(object);
            setElementText(elementOrId, text);
        },

        /**
         * Sets an \code{<img>} element to display a plot returned by
         * {@link runR}.
         * 
         * Normally you do not need to call this because to get
         * \code{shinylight} to produce a plot you need to set the
         * \code{plotElement} argument, and doing so will cause this
         * element to receive the plot automatically.
         *
         * @param {string|HTMLImageElement} elementOrId The
         * \code{<img>} element (or its id) that will receive the image.
         * @param {object} result The result from {@link runR}.
         */
        setElementPlot: function (elementOrId, result) {
            setPlot(getElement(elementOrId), result);
        },

        /**
         * Sets a \code{dataentrygrid} object to the result of
         * {@link runR}, if appropriate.
         * 
         * @param {DataEntryGrid} grid Table that receives the result
         * @param {object} result Return value promised by {@link runR}
         */
        setGridResult: function (grid, result) {
            const t = makeTable(result.data);
            if (t) {
                grid.init(t.headers, t.rows);
            }
        },

        /**
         * @typedef TableData
         * @property {string[]|number} headers Array of strings to become the new
         * column headers, or the number of columns to create
         * @param {Array.<Array.<string>>} rows Array of rows, each of which is an
         * array of cell contents.
         */
        /**
         * Turns data received from R into a form that can be set into
         * dataentrygrid.js.
         * @param {object} data Data as returned from R
         * @param {string[]|number} extraColumns The extra column headers
         * required or the number of extra columns required.
         * @returns {TableData} Headers and rows
         * @example
         * t = shinylight.makeTable(data);
         * grid.init(t.headers, t.rows);
         */
        makeTable: makeTable,

        /**
         * Calls a server function as defined in the server's call to the
         * \code{slServer} function.
         *
         * @param {string} fn The name of the R function to call.
         * @param {object} data An object whose keys are the arguments
         * to the function being called.
         * @param {string|HTMLElement} plotElement If provided, the
         * \code{<img>} element (or id of the element) that will receive the
         * plot output (if any). The plot returned will be the size that this
         * element already has, so ensure that it is styled in a way that it has
         * the correct size even if no image (or an old image) has been set.
         * @param {object} [extra={}] An object whose keys can be:
         * "imgType": Type of image required, "png" (default) or "svg";
         * "info": Funtion to be called if the R function {@link sendInfoText}
         * is called; "progress": Function to be called if the R function
         * {@link sendProgress} is called.
         * @returns {Promise} Result object that might have a \code{plot}
         * property (giving a string that would work as the \code{src}
         * attribute of an \code{img} element, representing graphics
         * drawn by the command) and a \code{data} property (giving
         * the value returned by the command). If the promise resolves
         * to an error, the argument to the error function is a string
         * representing the cause of the error.
         */
        call: function (fn, data, plotElement, extra) {
            var params = {};
            forEach(data, function(k,v) {
                params[k] = v;
            });
            return callServer(fn, params, plotElement, extra);
        },

        /**
         * Runs an R function.
         *
         * The R side must be running the slRunRServer function.
         * @param {string} rCommand The R text to run. It can plot a graph
         * and/or return some R data structure (such as a data frame).
         * @param {any} data A javascript value that will be translated
         * to the R command as a value also called 'data'.
         * @param {string|HTMLElement} plotElement If provided, the
         * \code{<img>} element (or id of the element) that will receive the
         * plot output (if any). The plot returned will be the size that this
         * element already has, so ensure that it is styled in a way that it has
         * the correct size even if no image (or an old image) has been set.
         * @param {object} [extra={}] An object whose keys can be:
         * "imgType": Type of image required, "png" (default) or "svg";
         * "info": Funtion to be called if the R function {@link sendInfoText}
         * is called; "progress": Function to be called if the R function
         * {@link sendProgress} is called.
         * @returns {Promise} Result object that might have a \code{plot}
         * property (giving a string that would work as the \code{src}
         * attribute of an \code{img} element, representing graphics
         * drawn by the command) and a \code{data} property (giving
         * the value returned by the command). If the promise resolves
         * to an error, the argument to the error function is a string
         * representing the cause of the error.
         */
        runR: function (rCommand, data, plotElement, extra) {
            var params = {
                Rcommand: rCommand,
                data: data,
            };
            return callServer('runR', params, plotElement, extra);
        }
    }
}();
