"use strict";

const fscb = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { Builder, By, Key, Origin, until } = require('selenium-webdriver');
const { describe, before, after, it } = require('mocha');
const assert = require("assert");
const { PNG } = require("pngjs");
const { URL } = require( 'url');
const Chrome = require('selenium-webdriver/chrome');
const Firefox = require('selenium-webdriver/firefox');
const floor = Math.floor;
const they = it;

// hand-rolled "fs/promises" module
const fs = {
    mkdtemp: function(path) {
        return new Promise(resolve => {
            fscb.mkdtemp(path, (err, folder) => {
                if (err) throw err;
                resolve(folder);
            });
        });
    },
    exists: function(path) {
        return new Promise(resolve => {
            fscb.exists(path, resolve);
        });
    },
    unlink: function(path) {
        return new Promise(resolve => {
            fscb.unlink(path, err => {
                if (err) throw err;
                resolve()
            });
        });
    },
    readFile: function(path) {
        return new Promise(resolve => {
            fscb.readFile(path, (err, contents) => {
                if (err) throw err;
                resolve(contents);
            });
        });
    },
};

// easy-to-use HTTP Get, returning status
function httpGetStatus(path) {
    return new Promise(function(resolve, reject) {
        let req = http.request(new URL(path), function(response) {
            resolve(response.statusCode);
        });
        req.on('error', function() {
            reject();
        });
        req.end();
    });
}

// We will remove all files in the directory and delete the directory
// We will not worry about directories within directories
function rmrf(dir) {
    return new Promise(resolve => {
        fscb.readdir(dir, (err, files) => {
            if (err) throw err;
            files.forEach(fname => {
                fscb.unlinkSync(path.join(dir, fname));
            });
            fscb.rmdirSync(dir);
            resolve();
        });
    });
}

function getBrowser() {
    const br = /--browser=(.*)/;
    for (let i = 3; i < process.argv.length; ++i) {
        const m = process.argv[i].match(br);
        if (m) {
            return m[1];
        }
    }
    return 'firefox';
}

function spawnR() {
    const args = Array.prototype.slice.apply(arguments);
    return spawn('Rscript', args, { stdio: [ 'ignore', 'inherit', 'inherit' ] });
}

function kill(process) {
    return new Promise(resolve => {
        process.on('exit', resolve);
        process.kill('SIGHUP');
    });
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function retry(attempts, ms, untilFn) {
    while (!await untilFn()) {
        if (--attempts === 0) {
            return false;
        }
        await wait(ms);
    }
    return true;
}

function checkPort(port) {
    return new Promise(resolve => {
        const c = new net.Socket();
        c.on('connect', () => resolve(true));
        c.on('error', () => resolve(false));
        c.connect(port, 'localhost');
    });
}

async function portIsOpen(port) {
    return await retry(10, 300, checkPort.bind(null, port));
}

// Gets the content width (so ignoring margins and border)
async function getWidth(element) {
    const w = await element.getCssValue('width');
    if (w.endsWith('px')) {
        return Number(w.slice(0, -2));
    }
    return Number(w);
}

async function makeTempDir() {
    // In case Firefox is running as a snap, we need to make
    // the temporary directory in the user's home directory :-(
    return await fs.mkdtemp(path.join(os.homedir(), 'tmp'));
}

async function startSelenium(tmpdir) {
    let firefoxOptions = new Firefox.Options();
    let firefoxService = new Firefox.ServiceBuilder();
    let chromeOptions = new Chrome.Options();
    if (typeof(tmpdir) === 'string') {
        // Prevent Firefox from opening up a download dialog when a CSV file is requested
        firefoxOptions.
            setPreference('browser.download.folderList', 2).  // do not use default download directory
            setPreference('browser.download.manager.showWhenStarting', false).  // do not show download progress
            setPreference('browser.download.dir', tmpdir).
            setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/*').
            setPreference('browser.download.alwaysOpenPanel', false);
        firefoxService.addArguments('--profile-root', tmpdir);
        chromeOptions.setUserPreferences({
            'profile.default_content_settings.popups': 0,
            'download.prompt_for_download': 'false',
            'download.default_directory': tmpdir,
        });
    }
    const driver = new Builder().forBrowser(getBrowser()).
        setFirefoxOptions(firefoxOptions).
        setFirefoxService(firefoxService).
        setChromeOptions(chromeOptions).
        build();
    await driver.manage().setTimeouts({ implicit: 1000 });
    return driver;
}

describe('shinylight framework', function() {
    let rProcess;
    let driver;
    let tmpdir;

    before(async function() {
        this.timeout(15000);
        rProcess = spawnR('test/run.R');
        tmpdir = await makeTempDir();
        driver = await startSelenium(tmpdir);
    });

    after(async function() {
        this.timeout(4000);
        await driver.quit();
        await kill(rProcess);
        await rmrf(tmpdir);
    });

    beforeEach(async function() {
        this.timeout(20000);
        await portIsOpen(8000);
        await driver.get('http://localhost:8000/test.html');
    });

    it('selects parameters based on function chosen', async function() {
        this.timeout(5000);
        await assertParamIs(driver, 'plot_param', 'p');
        await assertParamIs(driver, 'a', null);
        await switchFunction(driver, ['middles', 'test2']);
        await assertParamIs(driver, 'plot_param', null);
        await assertParamIs(driver, 'a', '');
        await switchFunction(driver, 'test1');
        await assertParamIs(driver, 'plot_param', 'p');
        await assertParamIs(driver, 'a', null);
    });

    describe('cascading menus', function() {
        they('allow mouse control', async function() {
            this.timeout(5000);
            await clickId(driver, 'param-plot_param');
            // check that the submenu is not yet open
            await assertNotVisible(driver, 'plot_param-b');
            await assertParamIs(driver, 'plot_param', 'p');
            await clickId(driver, 'plot_param-lines');
            await clickId(driver, 'plot_param-b');
            await assertParamIs(driver, 'plot_param', 'b');
        });

        they('allow keyboard control', async function() {
            this.timeout(5000);
            await assertParamIs(driver, 'plot_param', 'p');
            var box = await driver.findElement(By.xpath(
                "//*[@id='param-plot_param']/ancestor::*[contains(@class,'param-box')]"
            ))
            await box.sendKeys(
                Key.ENTER, Key.DOWN, Key.RIGHT, Key.DOWN, Key.DOWN, Key.TAB
            );
            await assertParamIs(driver, 'plot_param', 'b');
        });

        they('show the correct tooltips', async function() {
            this.timeout(3000);
            await clickId(driver, 'param-function-selector');
            await mouseOver(driver, 'function-selector-middles');
            await assertTooltipVisible(driver, 'functions that are fun');
            await clickId(driver, 'function-selector-middles');
            await mouseOver(driver, 'function-selector-test3');
            await assertTooltipVisible(driver, 'Test three');
        });

        they('all cancel together', async function() {
            await clickId(driver, 'param-function-selector');
            await clickId(driver, 'function-selector-middles');
            await assertVisible(driver, 'function-selector-test2');
            await assertVisible(driver, 'function-selector-test3');
            await clickId(driver, 'param-function-selector');
            await assertNotVisible(driver, 'function-selector-test2');
            await assertNotVisible(driver, 'function-selector-test3');
        });
    });

    it('hides and shows the calculate button', async function() {
        this.timeout(15000);
        const calculateButton = await driver.findElement(By.id('button-calculate'));
        await driver.wait(until.elementIsVisible(calculateButton));
        assert(await calculateButton.isDisplayed());
        await clickInputTab(driver, 'options');
        await driver.sleep(100);
        await clickId(driver, 'param-autorefresh');
        await driver.wait(until.elementIsNotVisible(calculateButton));
        await clickId(driver, 'param-autorefresh');
        await driver.wait(until.elementIsVisible(calculateButton));
    });
 
    it('can run the calculation', async function() {
        this.timeout(15000);
        await clickOutputTab(driver, 'table');
        await typeIn(driver, inputCell(0, 0), '10', Key.RETURN);
        await assertElementText(driver, outputCell(0,0), '15');
        await clickCalculate(driver);
        await assertElementText(driver, outputCell(0,0), '10');
    });

    it('displays the plot', async function() {
        this.timeout(8000);
        await enterCellText(driver, 0, 0, ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']);
        await clickInputTab(driver, 'options');
        await setValue(driver, 'param-pch', '22');
        await setValue(driver, 'param-bg', '#ffff00');
        await clickId(driver, 'button-calculate');
        let img = null;
        let axes = null;
        await driver.wait(async function() {
            img = await getImg(driver, By.css('img#output-plot'));
            if (!img) {
                return false;
            }
            axes = img.getAxes();
            return img.isPoint(axes.leftTick, axes.bottomTick); // 1,1
        });
        assert(img.isPoint(
            floor((axes.leftTick * 2 + axes.rightTick)/3),
            floor((axes.bottomTick * 2 + axes.topTick)/3),
        )); // 2,2
        assert(img.isPoint(
            floor((axes.leftTick + axes.rightTick * 2)/3),
            floor((axes.bottomTick + axes.topTick * 2)/3),
        )); // 3,3
        assert(img.isPoint(axes.rightTick, axes.topTick)); // 4,4
    });

    it('downloads a csv of the results', async function() {
        this.timeout(8000);
        const downloadFile = path.join(tmpdir, 'output.csv');
        if (await fs.exists(downloadFile)) {
            await fs.unlink(downloadFile);
        }
        const input = [['4', '3'], ['2', '1'], ['3', '3'], ['1', '4']];
        await enterCellText(driver, 0, 0, ...input);
        await clickId(driver, 'button-calculate');
        await clickOutputTab(driver, 'table')
        await clickId(driver, 'button-download-csv');
        await driver.wait(async function() {
            return await fs.exists(downloadFile);
        });
        const csvBuffer = await fs.readFile(downloadFile);
        const csv = csvBuffer.toString('utf-8');
        const rows = csv.split('\n');
        for (let i = 0; i !== input.length; ++i) {
            const row = rows[i + 1];
            const cells = row.split(',');
            assert.strictEqual(cells[0], input[i][0]);
            assert.strictEqual(cells[1], input[i][1]);
        }
    });

    it('displays the error', async function() {
        this.timeout(5000);
        await switchFunction(driver, ['middles', 'test2']);
        await clickCalculate(driver);
        await driver.wait(until.elementLocated(By.css('#output-tab-error.active')));
        const text = await driver.findElement(By.css('#output-error')).getText();
        assert.strictEqual(text, 'This does not work');
    });

    it('outputs unheadered tables', async function() {
        this.timeout(3000);
        await switchFunction(driver, ['middles', 'test3']);
        const input = [['2', '3'], ['1', '1'], ['4', '3'], ['3', '1']];
        await enterCellText(driver, 0, 0, ...input);
        await clickCalculate(driver);
        // we should be on the table tab when the calculation returns
        // because toolkit pushes you onto pages with data on them
        await assertElementCss(driver, '#output-tab-table.active');
        await assertElementText(driver, outputCell(0,0), '2');
        await assertElementText(driver, outputCell(0,1), '3');
        // there should be a "comments" column
        await assertElementText(driver, outputCell(0,2), '');
    });

    it('autorefreshes', async function() {
        this.timeout(12000);
        await typeIn(driver, inputCell(0,0), '5');
        await clickCalculate(driver);
        await clickInputTab(driver, 'options');
        await driver.sleep(100);
        await clickId(driver, 'param-autorefresh');
        const calculateButton = await driver.findElement(By.id('button-calculate'));
        await driver.wait(until.elementIsNotVisible(calculateButton));
        await clickOutputTab(driver, 'table');
        await assertElementText(driver, outputCell(0,0), '5');
        await clickInputTab(driver, 'inputTable');
        await typeIn(driver, inputCell(0,0), '9', Key.RETURN);
        await assertElementText(driver, outputCell(0,0), '9');
    });

    it('respects options', async function() {
        this.timeout(10000);
        await enterCellText(driver, 0, 0, ['2', '0'], ['1', '1'], ['0', '0'], ['1', '2']);
        await clickInputTab(driver, 'options');
        await setValue(driver, 'param-offset', '1.5');
        await setValue(driver, 'param-factor', '2.4');
        await clickOutputTab(driver, 'table');
        await clickCalculate(driver);
        await assertOutputCells(driver, 0, 0, 2, 2, [
            [4.8, 1.5],
            [2.4, 2.5]
        ]);
    });

    it('respects option dependencies', async function() {
        this.timeout(5000);
        await clickInputTab(driver, 'options');
        var bg = await driver.findElement(By.id('param-bg'));
        await driver.wait(until.elementIsNotVisible(bg));
        var pch = await driver.findElement(By.id('param-pch'));
        await pch.sendKeys(Key.BACK_SPACE, '22', Key.RETURN);
        await driver.wait(until.elementIsVisible(bg));
    });

    it('respects column dependencies', async function() {
        this.timeout(10000);
        await switchFunction(driver, 'test5');
        await clickIds(driver, ['param-dimensions', 'dimensions-3d']);
        await assertInputHeaders(driver, ['lengths', 'depths', 'widths', '']);
        await assertSubheaders(driver, ['mm', 'mm', 'mm', '']);
        await selectSubheader(driver, 0, 'in');
        await selectSubheader(driver, 1, 'in');
        await assertSubheaders(driver, ['in', 'in', 'mm', '']);
        const cells = [['2', '1', '0'], ['8', '7', '6']];
        const cells02 = cells.map(function(row) {
            return [row[0], row[2]];
        });
        await enterCellText(driver, 0, 0, cells[0], cells[1]);
        await clickIds(driver, ['param-dimensions', 'dimensions-2d']);
        await assertInputHeaders(driver, ['lengths', 'widths', '']);
        await assertSubheaders(driver, ['in', 'mm', '']);
        await assertInputCells(driver, 0, 0, 2, 2, cells02);
        await clickIds(driver, ['param-dimensions', 'dimensions-3d']);
        await assertInputCells(driver, 0, 0, 2, 3, cells);
        await assertSubheaders(driver, ['in', 'in', 'mm', '']);
        await selectSubheader(driver, 1, 'mm');
        await clickIds(driver, ['param-dimensions', 'dimensions-2d']);
        await assertInputHeaders(driver, ['lengths', 'widths', '']);
        await clickId(driver, 'param-boolean');
        await assertInputHeaders(driver, ['lengths', 'depths', 'widths', '']);
        await clickIds(driver, ['param-dimensions', 'dimensions-2d']);
        await assertInputHeaders(driver, ['lengths', 'depths', 'widths', '']);
        await clickId(driver, 'param-boolean');
        await assertInputHeaders(driver, ['lengths', 'widths', '']);
        await clickId(driver, 'param-boolean');
        await assertSubheaders(driver, ['in', 'mm', 'mm', '']);
    });

    it('saves and restores input data', async function() {
        this.timeout(8000);
        const file = path.join(tmpdir, 'params.json');
        if (await fs.exists(file)) {
            await fs.unlink(file);
        }
        await switchFunction(driver, 'test5');
        await clickIds(driver, ['param-dimensions', 'dimensions-3d']);
        const input1 = [['4', '3', '5'], ['2', '1', '8.9'], ['3', '3', '1'], ['1', '-4', '0.2']];
        await enterCellText(driver, 0, 0, ...input1);
        await clickId(driver, 'button-savedata');
        await driver.wait(async function() {
            return await fs.exists(file);
        });
        const contents1 = (await fs.readFile(file)).toString('utf8');
        await fs.unlink(file);
        await clickIds(driver, ['param-dimensions', 'dimensions-2d']);
        const input2 = [['1.1', '-9'], ['4.2', '9'], ['4.3', '11'], ['-1', '10.5']];
        await enterCellText(driver, 0, 0, ...input2);
        await clickId(driver, 'button-savedata');
        await driver.wait(async function() {
            return await fs.exists(file);
        });
        const contents2 = (await fs.readFile(file)).toString('utf8');
        await fs.unlink(file);
        async function loadAndAssert(fileContents, expectedData) {
            await clickId(driver, 'button-loaddata');
            var loaddata = await driver.findElement(By.id('load-file'));
            for (var i = 0; i < fileContents.length; i += 100) {
                await loaddata.sendKeys(fileContents.slice(i, i+100));
            }
            await loaddata.sendKeys(Key.ENTER);
            await assertInputCells(driver, 0, 0, expectedData.length, expectedData[0].length, expectedData);
        }
        await loadAndAssert(contents1, input1);
        await loadAndAssert(contents2, input2);
    });

    it('allows R code to be run from the client side', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver, "2+2");
        assert.strictEqual(result.error, null);
        assert.deepStrictEqual(result.result.plot, {});
        assert.deepStrictEqual(result.result.data, [4]);
    });

    it('allows R code with data to be run from the client side', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver,
            "data$one + data$two", {
            data: {
                one: [1, 2, 3],
                two: [10, 11, 12]
            }
        });
        assert.strictEqual(result.error, null);
        assert.deepStrictEqual(result.result.plot, {});
        assert.deepStrictEqual(result.result.data, [11, 13, 15]);
    });

    it('returns data frames from R code', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver,
            "data.frame(sum=data$two+data$one,diff=data$two-data$one)", {
            data: {
                one: [1, 2, 3],
                two: [10, 20, 30]
            }
        });
        assert.strictEqual(result.error, null);
        assert.deepStrictEqual(result.result.plot, {});
        assert.deepStrictEqual(result.result.data, [
            { sum: 11, diff: 9 },
            { sum: 22, diff: 18 },
            { sum: 33, diff: 27 },
        ]);
    });

    it('returns accurate data frames', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver,
            "data.frame(sum=data$two+data$one,diff=data$two-data$one)", {
            data: {
                one: [1.00000012],
                two: [10.00000027]
            }
        });
        assert.strictEqual(result.error, null);
        assert.deepStrictEqual(result.result.plot, {});
        assert.deepStrictEqual(result.result.data, [
            { sum: 11.00000039, diff: 9.00000015 }
        ]);
    });

    it('Does not allow R code to be run that includes forbidden symbols', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver, "eval('2+2')");
        assert.notStrictEqual(result.error, null);
        assert.ok(result.error =~ /.*whitelist.*eval.*/);
        assert.strictEqual(result.result, null);
    });

    it('allows R plots to be made from the client side', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver, "y<-c(2,0,1);plot(c(0,1,2),y);y", {
            'rrpc.resultformat': {
                type: 'png',
                width: 200,
                height: 300,
            }
        });
        assert.strictEqual(result.error, null);
        assert.strictEqual(typeof(result.result.plot), 'object');
        assert.strictEqual(typeof(result.result.plot[0]), 'string');
        assert.ok(200 < result.result.plot[0].length);
        const img = getImgFromData(result.result.plot[0]);
        const axes = img.getAxes();
        assert.strictEqual(axes.left, 58);
        assert.strictEqual(axes.width, 111);
        assert.strictEqual(axes.bottom, 226);
        assert.strictEqual(axes.height, 167);
        assert.deepStrictEqual(result.result.data, [2,0,1]);
    });

    it('receives progress and info reports', async function() {
        this.timeout(10000);
        await switchFunction(driver, 'test4');
        await clickCalculate(driver);
        const expectedInfos = [
            { progress: 0, progressText: '0 / 100' },
            { info: 'first information' },
            { progress: 0.5, progressText: '50%' },
            { info: 'second thing'}
        ];
        const progressBar = await driver.findElement(
            By.css('#progress-bar .progress-bar-foreground')
        );
        const progressBarBackground = await driver.findElement(
            By.css('#progress-bar')
        );
        const progressText = await driver.findElement(By.css('#progress-text .static-text'));
        const progressStatus = await driver.findElement(By.css('#progress-info .static-text'));
        for (let i in expectedInfos) {
            const e = expectedInfos[i];
            await driver.wait(async function() {
                let r = true;
                if ('info' in e) {
                    const t = await progressStatus.getText();
                    r = r && t === e.info;
                }
                if ('progressText' in e) {
                    const pt = await progressText.getText();
                    r = r && pt == e.progressText;
                }
                if ('progress' in e) {
                    const expected = e.progress * await getWidth(progressBarBackground);
                    const actual = await getWidth(progressBar);
                    r = r && expected - 1 < actual && actual < expected + 1;
                }
                return r;
            });
        }
    });

    describe('preinitialization', function() {
        it('sets the grid appropriately', async function() {
            this.timeout(5000);
            const cells = [[10, 4], [9, 5], [8, 6], [7, 7]];
            const c1 = cells.map(row => row[0]);
            const c2 = cells.map(row => row[1]);
            const settings = `{"fn":"test1","parameters":{"units":["mm","kg",""],"c1":[${c1}],"c2":[${c2}],"type":"p","factor":1,"offset":0,"pch":1,"bg":"#000000"}}`;
            await preinitialze(driver, settings);
            await assertInputCells(driver, 0, 0, cells.length, 2, cells);
        });
        it('sets the units appropriately', async function() {
            this.timeout(5000);
            const headers = ["in", "lb", ""];
            const settings = `{"fn":"test1","parameters":{"units":${JSON.stringify(headers)},"c1":[1,2,3],"c2":[6,5,4],"type":"p","factor":1,"offset":0,"pch":1,"bg":"#000000"}}`;
            await preinitialze(driver, settings);
            await assertSubheaders(driver, headers);
        });
        it('sets the parameters appropriately', async function() {
            this.timeout(5000);
            const plotType = "o";
            const settings = `{"fn":"test1","parameters":{"units":["mm","kg",""],"c1":[1,2,3],"c2":[6,5,4],"type":"${plotType}","factor":1,"offset":0,"pch":1,"bg":"#000000"}}`;
            await preinitialze(driver, settings);
            await assertParamIs(driver, "plot_param", plotType);
        });
        it('sets the options appropriately', async function() {
            this.timeout(5000);
            const pch = "21";
            const settings = `{"fn":"test1","parameters":{"units":["mm","kg",""],"c1":[1,2,3],"c2":[6,5,4],"type":"p","factor":1,"offset":0,"pch":${pch},"bg":"#000000"}}`;
            await preinitialze(driver, settings);
            await assertOptionIs(driver, 'param-pch', pch);
        });
    });
});

describe('shinylight framework with preinitialization from R', function() {
    let rProcess;
    let driver;
    let tmpdir;

    before(async function() {
        this.timeout(15000);
        rProcess = spawnR('test/run.R', 'test/init1.json');
        tmpdir = await makeTempDir();
        driver = await startSelenium(tmpdir);
    });

    after(async function() {
        this.timeout(3000);
        await driver.quit();
        await kill(rProcess);
        await rmrf(tmpdir);
    });

    beforeEach(async function() {
        this.timeout(4000);
        await portIsOpen(8000);
        await driver.get('http://localhost:8000/');
    });

    it('sets the input grid', async function() {
        this.timeout(3000);
        await assertInputCells(driver, 0, 0, 4, 2, [
            [1, 2],
            [4, 5],
            [7, 8],
            [20, 22]
        ]);
    });
});

describe('freeform shinylight', function() {
    let rProcess;
    let driver;
    let tmpdir;

    before(async function() {
        this.timeout(15000);
        rProcess = spawnR('test/run_freeform.R');
        tmpdir = await makeTempDir();
        driver = await startSelenium(tmpdir);
    });

    after(async function() {
        this.timeout(4000);
        await driver.quit();
        await kill(rProcess);
        await rmrf(tmpdir);
    });

    beforeEach(async function() {
        this.timeout(20000);
        await portIsOpen(8001);
        await driver.get('http://localhost:8001');
    });

    it('returns 200 from the test endpoint', async function() {
        this.timeout(5000);
        let unknown = await httpGetStatus('http://localhost:8001/doesnotexist');
        assert(unknown == 404);
        let test = await httpGetStatus('http://localhost:8001/test');
        assert(test == 200);
    });

    it('calls R that returns a data frame', async function() {
        this.timeout(10000);
        await enterCellText(driver, 0, 0, ['2', '0'], ['3', '4'], ['10', '11'], ['21', '2']);
        await clickId(driver, 'button-plot');
        await driver.wait(async () => outputHeaderIs(driver, 0, 'sum'));
        await assertOutputHeaders(driver, ['sum', 'diff']);
        await assertOutputCells(driver, 0, 0, 4, 1, [
            [2, 2], [7, -1], [21, -1], [23, 19]
        ]);
    });

    it('calls R that returns a plot', async function() {
        this.timeout(10000);
        await enterCellText(driver, 0, 0, ['1', '3'], ['2', '2'], ['3', '1']);
        await clickId(driver, 'button-plot');
        let img = null;
        let axes = null;
        await driver.wait(async function() {
            img = await getImg(driver, By.css('img#plot'));
            if (!img) {
                return false;
            }
            axes = img.getAxes();
            return img.isPoint(axes.leftTick, axes.topTick); // 1,3
        });
        assert(img.isPoint(
            floor((axes.leftTick + axes.rightTick)/2),
            floor((axes.bottomTick + axes.topTick)/2),
        )); // 2,2
        assert(img.isPoint(axes.rightTick, axes.bottomTick)); // 3,3
    });

    it('receives progress and info reports', async function() {
        this.timeout(10000);
        await switchFunction(driver, 'test3');
        await clickId(driver, 'button-plot');
        const expectedInfos = [
            'progress: 0%',
            'first information',
            'progress: 50%',
            'second thing',
            'progress: 100%'
        ];
        const errorElement = await driver.findElement(By.id('error'));
        for (let i in expectedInfos) {
            const e = expectedInfos[i];
            await driver.wait(async function() {
                const t = await errorElement.getAttribute('value');
                return t === e;
            });
        }
    });

    describe('passing data to framework mechanism', function() {
        var frameworkProcess = null;

        before(async function() {
            this.timeout(10000);
            frameworkProcess = spawnR('test/run.R');
            await portIsOpen(8000);
        });

        after(async function() {
            await kill(frameworkProcess);
        });

        it('works', async function() {
            this.timeout(10000);
            await enterCellText(driver, 0, 0, ['2', '0'], ['3', '4'], ['10', '11'], ['21', '2']);
            await clickId(driver, 'button-plot');
            await assertOutputCells(driver, 0, 0, 4, 1, [
                [2, 2], [7, -1], [21, -1], [23, 19]
            ]);
            const firstTab = await driver.getWindowHandle();
            var allTabs = null;
            await clickId(driver, 'send-to-framework');
            await driver.wait(async function() {
                allTabs = await driver.getAllWindowHandles();
                return 1 < allTabs.length;
            });
            var secondTab = null;
            allTabs.forEach(id => {
                if (id !== firstTab) {
                    secondTab = id;
                }
            });
            await driver.switchTo().window(secondTab);
            await assertInputCells(driver, 0, 0, 4, 1, [
                [2, 2], [7, -1], [21, -1], [23, 19]
            ]);
        });
    });
});

describe('minimal shinylight', function() {
    let rProcess;
    let driver;
    let tmpdir;

    before(async function() {
        this.timeout(15000);
        rProcess = spawnR('test/run_minimal.R');
        tmpdir = await makeTempDir();
        driver = await startSelenium(tmpdir);
    });

    after(async function() {
        this.timeout(4000);
        await driver.quit();
        await kill(rProcess);
        await rmrf(tmpdir);
    });

    beforeEach(async function() {
        this.timeout(20000);
        await portIsOpen(8000);
        await driver.get('http://localhost:8000');
    });

    it('calls R that returns a vector', async function() {
        this.timeout(10000);
        await typeIn(driver, 'headers_input', 'one,two');
        await clickId(driver, 'headers_button');
        await enterCellText(driver, 0, 0, ['2', '0'], ['3', '4'], ['10', '11'], ['21', '2']);
        await typeIn(driver, 'command_param', 'data$one+data$two');
        await clickId(driver, 'compute_button');
        await assertOutputCells(driver, 0, 0, 4, 1, [
            [2], [7], [21], [23]
        ]);
    });

    it('calls R that returns a data frame', async function() {
        this.timeout(10000);
        await typeIn(driver, 'headers_input', 'one,two');
        await clickId(driver, 'headers_button');
        await enterCellText(driver, 0, 0, ['2', '0'], ['3', '4'], ['10', '11'], ['21', '2']);
        await typeIn(driver, 'command_param', 'data.frame(sum=data$one+data$two, diff=data$one-data$two)');
        await clickId(driver, 'compute_button');
        await driver.wait(async () => outputHeaderIs(driver, 0, 'sum'));
        await assertOutputHeaders(driver, ['sum', 'diff']);
        await assertOutputCells(driver, 0, 0, 4, 1, [
            [2, 2], [7, -1], [21, -1], [23, 19]
        ]);
    });

    it('calls R that returns a list of vectors', async function() {
        this.timeout(10000);
        await typeIn(driver, 'headers_input', 'one,two');
        await clickId(driver, 'headers_button');
        await enterCellText(driver, 0, 0, ['2', '0'], ['3', '4'], ['10', '11'], ['21', '2']);
        await typeIn(driver, 'command_param', 'list(diff=data$one-data$two, sum=data$one+data$two)');
        await clickId(driver, 'compute_button');
        await driver.wait(async () => outputHeaderIs(driver, 0, 'diff'));
        await assertOutputHeaders(driver, ['diff', 'sum']);
        await assertOutputCells(driver, 0, 0, 4, 1, [
            [2, 2], [-1, 7], [-1, 21], [19, 23]
        ]);
    });

    it('calls R that returns a plot', async function() {
        this.timeout(10000);
        await typeIn(driver, 'headers_input', 'one,two');
        await clickId(driver, 'headers_button');
        await typeIn(driver, 'command_param', 'plot(x=c(1,2,3), y=c(3,2,1), pch=22, bg="#ffff00")');
        await clickId(driver, 'plot_button');
        let img = null;
        let axes = null;
        await driver.wait(async function() {
            img = await getImg(driver, By.css('img#plot'));
            if (!img) {
                return false;
            }
            axes = img.getAxes();
            return img.isPoint(axes.leftTick, axes.topTick); // 1,3
        });
        assert(img.isPoint(
            floor((axes.leftTick + axes.rightTick)/2),
            floor((axes.bottomTick + axes.topTick)/2),
        )); // 2,2
        assert(img.isPoint(axes.rightTick, axes.bottomTick)); // 3,3
    });
});

async function getImg(driver, locator) {
    const img = await driver.findElement(locator);
    if (!img) {
        return null;
    }
    const imgSrc = decodeURIComponent(await img.getAttribute('src'));
    return getImgFromData(imgSrc);
}

function getImgFromData(data) {
    const colon = data.split(':');
    if (colon[0] !== 'data') {
        return null;
    }
    const semicolon = colon[1].split(';');
    const comma = semicolon[1].split(',');
    if (comma[0] === 'base64') {
        const imgB64 = comma[1];
        if (typeof(imgB64) !== 'string') {
            return null;
        }
        const imgBuffer = Buffer.from(imgB64, 'base64');
        const mimeType = semicolon[0];
        if (mimeType === 'image/svg+xml') {
            return getSvg(imgBuffer.toString());
        } else if (mimeType === 'image/png') {
            return getPng(imgBuffer);
        }
    }
    return null;
}

function getPng(data) {
    const png = PNG.sync.read(data);
    return {
        getAxes: function() {
            const originX = findLeftLine(png);
            const originY = findBottomLine(png);
            const row = png.width * 4;
            const originRowStart = originY * row;
            const originIndex = originRowStart + originX * 4;
            const topIndex = lineEndIndex(png, originIndex, -row);
            const rightIndex = lineEndIndex(png, originIndex, 4);
            const height = originY - floor(topIndex / row);
            const width = floor((rightIndex - originRowStart) / 4) - originX;
            // find ticks
            let bottomTick = originIndex - 8;
            bottomTick = findDot(png, bottomTick, -row, height, bottomTick);
            let topTick = topIndex - 8;
            topTick = findDot(png, topTick, row, height, topTick);
            const tickRow = originRowStart + 2 * row;
            let leftTick = tickRow + originX * 4;
            let rightTick = leftTick + width * 4;
            leftTick = findDot(png, leftTick, 4, width, leftTick);
            rightTick = findDot(png, rightTick, -4, width, rightTick);
            return {
                bottom: originY,
                left: originX,
                height: height,
                width: width,
                leftTick: floor((leftTick - tickRow) / 4),
                rightTick: floor((rightTick - tickRow) / 4),
                topTick: floor(topTick / row),
                bottomTick: floor(bottomTick / row)
            };
        },
        isPoint: function(x, y) {
            return isPointInPng(png, 'Y', x, y);
        }
    };
}

// isAbove(x, y, x0, y0, x1, y1) returns true if and only if
// a line drawn directly down (increasing y) from y would intersect
// the line from (x0,y0) to (x1,y1), including the point on the left
// but not on the right.
function isAbove(x, y, x0, y0, x1, y1) {
    // (x0,y0) should be the left hand point
    if (x1 <= x0) {
        if (x0 === x1) {
            // special case -- vertical line must never be hit
            return false;
        }
        const xt = x0;
        x0 = x1;
        x1 = xt;
        const yt = y0;
        y0 = y1;
        y1 = yt;
    }
    if (x1 <= x) {
        // missed to the right
        return false;
    }
    if (x < x0) {
        // missed to the left
        return false;
    }
    // find y value of intersection of vertical line through (x,y)
    const py = y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    return y < py;
}

// cs is alternating x and y co-ordinates of the vertices of a polygon.
// Returns true if and only if (x,y) is within that polygon.
function isWithin(x, y, cs) {
    let aboveCount = 0;
    let x0 = cs[cs.length - 2];
    let y0 = cs[cs.length - 1];
    for (let j = 0; j < cs.length; j += 2) {
        const x1 = cs[j];
        const y1 = cs[j + 1];
        if (isAbove(x, y, x0, y0, x1, y1)) {
            ++aboveCount;
        }
        x0 = x1;
        y0 = y1;
    }
    return (aboveCount & 1) == 1;
}

function getSvg(data) {
    const quads = data.match(/<path\b[^>]+\bd="M *[0-9\.]+ +[0-9\.]+ +L *[0-9\.]+ +[0-9\.]+ +L *[0-9\.]+ +[0-9\.]+ +L *[0-9\.]+ +[0-9\.]+/mg);
    if (!quads) {
        return null;
    }
    let plotArea = 0;
    let plotLeft = null;
    let plotRight = null;
    let plotTop = null;
    let plotBottom = null;
    quads.forEach(quad => {
        const qs = quad.match(/\bd="M *([0-9\.]+) +([0-9\.]+) +L *([0-9\.]+) +([0-9\.]+) +L *([0-9\.]+) +([0-9\.]+) +L *([0-9\.]+) +([0-9\.]+)/m);
        // biggest polygon is probably the plot area
        if (qs) {
            const vs = [];
            for (let i = 1; i !== qs.length; ++i) {
                vs.push(Number(qs[i]));
            }
            const xmin = Math.min(vs[0], vs[2], vs[4], vs[6]);
            const xmax = Math.max(vs[0], vs[2], vs[4], vs[6]);
            const ymin = Math.min(vs[1], vs[3], vs[5], vs[7]);
            const ymax = Math.max(vs[1], vs[3], vs[5], vs[7]);
            const area = (xmax - xmin) * (ymax - ymin);
            if (plotArea < area) {
                plotArea = area;
                plotLeft = xmin;
                plotRight = xmax;
                plotTop = ymin;
                plotBottom = ymax;
            }
        }
    });
    const width = plotRight - plotLeft;
    const height = plotBottom - plotTop;
    const maxTickProportion = 0.05;
    const potentialTicks = data.match(/<path [^>]*\bd="M *[0-9\.]+ +[0-9\.]+ +L *[0-9\.]+ +[0-9\.]+ *"/mg);
    let xTicks = [];
    let yTicks = [];
    potentialTicks.forEach(pt => {
        const gs = pt.match(/\bd="M *([0-9\.]+) +([0-9\.]+) +L *([0-9\.]+) +([0-9\.]+) *"/m);
        let x0 = Number(gs[1]);
        let x1 = Number(gs[3]);
        let y0 = Number(gs[2]);
        let y1 = Number(gs[4]);
        if (gs && x0 === x1 && Math.abs(y1 - y0) < maxTickProportion * height) {
            xTicks.push(x0);
        }
        if (gs && y0 === y1 && Math.abs(x1 - x0) < maxTickProportion * width) {
            yTicks.push(y0);
        }
    });
    xTicks.sort((x,y) => x - y);
    yTicks.sort((x,y) => x - y);
    let potentialPoints = data.match(/<path [^>]*style="([^";]+;)*\bfill: *rgb[^>]*>/mg);
    if (!potentialPoints) {
        potentialPoints = [];
    }
    const coords = [];
    potentialPoints.forEach(pp => {
        const rgb = pp.match(/\bstyle="[^"]*\bfill: *rgb\(([0-9]+)%,([0-9]+)%,([0-9]+)%\)/m);
        if (rgb && 40 < Number(rgb[1]) && 40 < Number(rgb[2]) && Number(rgb[3]) < 40) {
            const d = pp.match(/\bd="([^"]*)"/m);
            if (d) {
                const xytexts = d[1].match(/[0-9.]+/mg);
                const xys = xytexts.map(t => Number(t));
                coords.push(xys);
            }
        }
    });
    if (xTicks.length ===0 || yTicks.length === 0) {
        return null;
    }
    return {
        getAxes: function() {
            return {
                bottom: plotBottom,
                left: plotLeft,
                height: height,
                width: width,
                leftTick: xTicks[0],
                rightTick: xTicks[xTicks.length - 1],
                topTick: yTicks[0],
                bottomTick: yTicks[yTicks.length - 1]
            }
        },
        isPoint: function(x, y) {
            for (let i = 0; i !== coords.length; ++i) {
                if (isWithin(x, y, coords[i])) {
                    return true;
                }
            }
            return false;
        }
    };
}

async function executeRrpc(driver, code, extraOpts) {
    if (typeof(extraOpts) === 'undefined') {
        extraOpts = {};
    }
    extraOpts.Rcommand = code.replace(/"/g, '\\"');
    await pageLoaded(driver);
    await driver.executeScript(
        'var a=arguments[0];window.rrpc_x=null;rrpc.call("runR", a, (x,e)=>{window.rrpc_x={result:x, error:e}});',
        extraOpts
    );
    return await driver.wait(async function() {
        return await driver.executeScript('return window.rrpc_x;');
    });
}

async function pageLoaded(driver) {
    // arbitrarily wait for something to appear
    await clickInputTab(driver, 'inputTable');
}

async function typeIn(driver, id, ...text) {
    const by = typeof(id) === 'string'? By.id(id) : id;
    const e = await driver.findElement(by);
    await e.click();
    const tag = (await e.getTagName()).toLowerCase();
    const b = tag === 'input' || tag === 'textarea'?
        e : await e.findElement(By.css('input,textarea'));
    await b.sendKeys.apply(b, text);
}

async function enterCellText(driver, r, c) {
    let ins = Array.from(arguments);
    let outs = [driver, inputCell(r, c)];
    for (let i = 3; i !== ins.length; ++i) {
        let row = ins[i];
        if (row) {
            outs.push(row[0]);
            for (let j = 1; j !== row.length; ++j) {
            outs.push(Key.TAB);
                outs.push(row[j]);
            }
        }
        outs.push(Key.RETURN);
    }
    await typeIn.apply(null, outs);
}

async function setValue(driver, id, text) {
    await driver.executeScript(
        `var id=arguments[0], text=arguments[1];document.getElementById(id).value=text;`,
        id, text
    );
}

function getValue(driver, id) {
    return driver.executeScript(
        `var id=arguments[0];return document.getElementById(id).value;`,
        id
    );
}

async function assertElementText(driver, by, text) {
    await driver.wait(async function() {
        try {
            const t = await driver.findElement(by).getText();
            return text === t.trim();
        } catch {
            return false;
        }
    });
}

async function assertNotVisible(driver, id) {
    const e = await driver.findElement(By.id(id));
    await driver.wait(
        until.elementIsNotVisible(e),
        500,
        `Element '${id}' is visible, but should not be`
    );
}

async function assertVisible(driver, id) {
    const e = await driver.findElement(By.id(id));
    await driver.wait(
        until.elementIsVisible(e),
        500,
        `Element '${id}' is not visible, but should be`
    );
}

async function assertElementCss(driver, css) {
    const locator = By.css(css);
    await driver.wait(
        until.elementLocated(locator),
        500,
        `Element at '${css} is not locatable, but should be`
    );
}

async function assertTooltipVisible(driver, text) {
    const tooltips = await driver.findElements(By.css('.option-tooltip'));
    const allTooltipTexts = await Promise.all(tooltips.map(e => e.getText()));
    const tooltipTexts = allTooltipTexts.filter(t => t !== '');
    assert.deepStrictEqual(tooltipTexts, [text]);
}

async function mouseOver(driver, id) {
    const e = await driver.findElement(By.id(id));
    const a = driver.actions();
    // We need to move off our current spot in case that is holding
    // a tooltip open
    await a.move({ origin: Origin.POINTER, x: 100, y: 0 }).
        move({ origin: e }).pause(100, a.mouse()).perform();
}

async function clickCalculate(driver) {
    await clickId(driver, 'button-calculate');
}

function cellInTable(id, row, column) {
    return By.css(`#${id} tbody tr:nth-of-type(${row+1}) td:nth-of-type(${column+1})`);
}

function inputCell(row, column) {
    return cellInTable('input-table', row, column);
}

function outputCell(row, column) {
    return cellInTable('output-table', row, column);
}

async function clickInputTab(driver, tabName) {
    await clickId(driver, 'input-tab-' + tabName);
}

async function clickOutputTab(driver, tabName) {
    await clickId(driver, 'output-tab-' + tabName);
}

async function clickId(driver, id) {
    await driver.findElement(By.id(id)).click();
}

async function clickIds(driver, ids) {
    for (let i in ids) {
        await clickId(driver, ids[i]);
    }
}

async function switchFunction(driver, funcName) {
    await driver.findElement(By.id('param-function-selector')).click();
    const names = typeof(funcName) === 'object' ? funcName : [funcName];
    for (var i in names) {
        const e = await driver.findElement(By.id('function-selector-' + names[i]));
        const a = driver.actions();
    // We need to move off our current spot in case that is holding
    // a tooltip open
    await a.move({ origin: Origin.POINTER, x: 100, y: 0 }).
            move({ origin: e }).click(e).perform();
    }
}

async function selectSubheader(driver, index, value) {
    const e = await driver.findElement(By.css(`#input-table .subheader td:nth-of-type(${index+1})`));
    await e.click();
    await e.findElement(By.css(`option[value='${value}']`)).click();
}

async function assertSubheaders(driver, expectedValues) {
    const es = await driver.findElements(By.css('#input-table .subheader select'));
    const vs = await Promise.all(es.map(e => e.getAttribute('value')));
    assert.deepStrictEqual(vs, expectedValues);
}

async function assertOutputCells(driver, r, c, rowCount, columnCount, expectedCells) {
    for (let i = 0; i !== rowCount; ++i) {
        const row = expectedCells[i];
        for (let j = 0; j !== columnCount; ++j) {
            await assertElementText(driver, outputCell(r + i, c + j), '' + row[j]);
        }
    }
}

async function assertInputCells(driver, r, c, rowCount, columnCount, expectedCells) {
    for (let i = 0; i !== rowCount; ++i) {
        const row = expectedCells[i];
        for (let j = 0; j !== columnCount; ++j) {
            await assertElementText(driver, inputCell(r + i, c + j), '' + row[j]);
        }
    }
}

async function assertHeaders(driver, id, expected) {
    for (let i = 0; i !== expected.length; ++i) {
        const t = await driver.findElement(By.css(
            `#${id} thead tr th:nth-child(${i+2})`
        )).getText();
        assert.strictEqual(t, expected[i]);
    }
}

async function assertOutputHeaders(driver, expected) {
    await assertHeaders(driver, 'output-table', expected);
}

async function assertInputHeaders(driver, expected) {
    await assertHeaders(driver, 'input-table', expected);
}

async function outputHeaderIs(driver, index, expected) {
    const t = await driver.findElement(
        By.css(`#output-table thead tr th:nth-child(${index+2})`)
    ).getText();
    return expected === t;
}

async function assertParamIs(driver, id, value) {
    const e = await driver.findElement(By.id('param-' + id));
    if (value === null) {
        await driver.wait(until.elementIsNotVisible(e), 2000,
            `Parameter ${id} should not be visible`)
    } else {
        const v = ''+value;
        await driver.wait(until.elementIsVisible(e), 2000,
            `Parameter ${id} should be visible`);
        const t = await e.getText();
        await driver.wait(async function() {
            const t = await e.getText();
            return v === t;
        }, 500, `Parameter ${id} should have value '${v}'`);
    }
}

async function assertOptionIs(driver, id, value) {
    await clickInputTab(driver, 'options');
    driver.sleep(100);
    const actual = await getValue(driver, id);
    assert.strictEqual(actual, value);
}

function colourFromIndex(png, index) {
    const r = png.data[index];
    const g = png.data[index + 1];
    const b = png.data[index + 2];
    const bright = Math.max(r,g,b,20);
    const threshold = bright * 0.6;
    const colour =
        (r < threshold? 0 : 1) +
        (g < threshold? 0 : 2) +
        (b < threshold? 0 : 4);
    return "KRGYBMCW"[colour];
}

function endOfColour(png, col, pixel, delta) {
    let p = pixel;
    for (; colourFromIndex(png, p) === col; p += delta) {
    }
    return (p - pixel) / delta;
}

function colourPatchSize(png, col, x, y) {
    const row = png.width * 4;
    const pixel = y * row + x * 4;
    return {
        left: -endOfColour(png, col, pixel, -4),
        right: endOfColour(png, col, pixel, 4),
        top: -endOfColour(png, col, pixel, -row),
        bottom: endOfColour(png, col, pixel, row)
    }
}

// returns true if the colour beneath the point (x,y) is
// the colour col (from 'R', 'G', 'B', 'C', 'M', 'Y', 'W' or 'K')
// and is from a patch no wider than 9 pixels and no
// taller than 9 pixels. This is used for detecting points
// on a graph that have a 'background' colour.
function isPointInPng(png, col, x, y) {
    const p = colourPatchSize(png, col, x, y);
    const w = p.right - p.left;
    const h = p.bottom - p.top;
    return 1 < w && w < 9 && 1 < h && h < 9;
}

function isLinePixel(png, index) {
    const d = png.data;
    const brightness = d[index] + d[index + 1] + d[index + 2];
    return brightness < 550;
}

function isOnHorizontalLine(png, index) {
    const pixelsToCheck = floor(png.width / 10);
    index -= floor(pixelsToCheck / 2) * 4;
    let lastIndex = index + pixelsToCheck * 4;
    for (; index < lastIndex; index += 4) {
        if (!isLinePixel(png, index)) {
            return false;
        }
    }
    return true;
}

function findBottomLine(png) {
    const width = png.width;
    const row = width * 4;
    const endIndex = row * png.height;
    let index = endIndex - floor(width / 2) * 4
    // search the bottom third of the image
    const giveUp = index - row * floor(png.height / 3);
    for (; giveUp <= index; index -= row) {
        if (isLinePixel(png, index) && isOnHorizontalLine(png, index)) {
            return floor(index / row);
        }
    }
    return null;
}

function isOnVerticalLine(png, index) {
    const pixelsToCheck = floor(png.height / 10);
    const row = 4 * png.width;
    index -= floor(pixelsToCheck / 2) * row;
    let lastIndex = index + pixelsToCheck * row;
    for (; index < lastIndex; index += row) {
        if (!isLinePixel(png, index)) {
            return false;
        }
    }
    return true;
}

function findLeftLine(png) {
    const width = png.width;
    const row = width * 4;
    let startIndex = floor(png.height / 2) * row;
    // search the left third of the image
    const giveUp = startIndex + floor(width / 3) * 4;
    for (let index = startIndex; index < giveUp; index += 4) {
        if (isLinePixel(png, index) && isOnVerticalLine(png, index)) {
            return floor((index - startIndex) / 4);
        }
    }
    return null;
}

function lineEndIndex(png, index, dIndex) {
    let result = index;
    let gap = 0;
    while (gap < 4) {
        if (isLinePixel(png, index)) {
            result = index;
            gap = 0;
        } else {
            ++gap;
        }
        index += dIndex;
    }
    return result;
}

function findDot(png, index, d, count, defaultReturn) {
    for (let i = 0; i != count; ++i) {
        const ix = index + i * d;
        if (isLinePixel(png, ix)) {
            return ix;
        }
    }
    return defaultReturn;
}

async function preinitialze(driver, text) {
    await driver.get('http://localhost:8000/test_init.html');
    const box = await driver.findElement(By.id('data'));
    await box.sendKeys(text);
    await driver.findElement(By.id('submit')).click();
}
