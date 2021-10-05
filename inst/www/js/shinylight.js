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
                return { headers: headers, rows: table };
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
        return { headers: headers.concat(extraColumns), rows: table };
    }

    function setElementText(elementOrId, text) {
        var element = getElement(elementOrId)
        if ('value' in element) {
            element.value = text;
        } else {
            element.textContent = text;
        }
    }

    function callServer(fn, params, plotElement) {
        return new Promise(function (resolve, errorFn) {
            plotElement = getElement(plotElement);
            if (plotElement) {
                params['rrpc.resultformat'] = {
                    type: 'png',
                    width: plotElement.clientWidth,
                    height: plotElement.clientHeight
                };
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
            });
        });
    }

    return {
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
         * \code{\link{runR}}.
         * 
         * Normally you do not need to call this because to get
         * \code{\link{shinylight}} to produce a plot you need to set the
         * \code{plotElement} argument, and doing so will cause this
         * element to receive the plot automativally.
         *
         * @param {string|HTMLImageElement} elementOrId The
         * \code{<img>} element (or its id) that will receive the image.
         * @param {object} result The result from \code{\link{runR}}.
         */
        setElementPlot: function (elementOrId, result) {
            setPlot(getElement(elementOrId), result);
        },

        /**
         * Sets a \code{dataentrygrid} object to the result of
         * \code{\link{runR}}, if appropriate.
         * 
         * @param grid {DataEntryGrid} Table that recieves the result
         * @param result {object} Return value promised by \code{\link{runR}}
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
         * @param fn {string} The name of the R function to call.
         * @param data {object} An object whose keys are the arguments
         * to the function being called.
         * @param plotElement {string|HTMLElement} If provided, the
         * \code{<img>} element (or id of the element) that will receive the
         * plot output (if any). The plot returned will be the size that this
         * element already has, so ensure that it is styled in a way that it has
         * the correct size even if no image (or an old image) has been set.
         * @returns {Promise} Result object that might have a \code{plot}
         * property (giving a string that would work as the \code{src}
         * attribute of an \code{img} element, representing graphics
         * drawn by the command) and a \code{data} property (giving
         * the value returned by the command). If the promise resolves
         * to an error, the argument to the error function is a string
         * representing the cause of the error.
         */
        call: function (fn, data, plotElement) {
            var params = {};
            forEach(data, function(k,v) {
                params[k] = v;
            });
            return callServer(fn, params, plotElement);
        },

        /**
         * Runs an R function.
         *
         * The R side must be running the slRunRServer function.
         * @param rCommand {string} The R text to run. It can plot a graph
         * and/or return some R data structure (such as a data frame).
         * @param data {any} A javascript value that will be translated
         * to the R command as a value also called 'data'.
         * @param plotElement {string|HTMLElement} If provided, the
         * \code{<img>} element (or id of the element) that will receive the
         * plot output (if any). The plot returned will be the size that this
         * element already has, so ensure that it is styled in a way that it has
         * the correct size even if no image (or an old image) has been set.
         * @returns {Promise} Result object that might have a \code{plot}
         * property (giving a string that would work as the \code{src}
         * attribute of an \code{img} element, representing graphics
         * drawn by the command) and a \code{data} property (giving
         * the value returned by the command). If the promise resolves
         * to an error, the argument to the error function is a string
         * representing the cause of the error.
         */
        runR: function (rCommand, data, plotElement) {
            var params = {
                Rcommand: rCommand,
                data: data,
            };
            return callServer('runR', params, plotElement);
        }
    }
}();
