"use strict";

const { spawn } = require('child_process');
const { Builder, By, Key, until } = require('selenium-webdriver');
const { describe, before, after, it } = require('mocha');
const assert = require("assert");
const { PNG } = require("pngjs");
const floor = Math.floor;

describe('shinylight', function() {
    let rProcess;
    let driver;

    before(function() {
        rProcess = spawn('Rscript', ['test/run.R'], { stdio: [ 'ignore', 'inherit', 'inherit' ] });
        driver = new Builder().forBrowser('firefox').build();
        driver.manage().setTimeouts({ implicit: 1000 });
    });

    after(function() {
        rProcess.kill('SIGHUP');
        driver.quit();
    })

    beforeEach(async function() {
        this.timeout(20000);
        await driver.get('http://localhost:8000');
    });

    it('selects parameters based on function chosen', async function() {
        this.timeout(5000);
        await assertParamIs(driver, 'plot_param', 'p');
        await assertParamIs(driver, 'a', null);
        await switchFunction(driver, 'test2');
        await assertParamIs(driver, 'plot_param', null);
        await assertParamIs(driver, 'a', '');
        await switchFunction(driver, 'test1');
        await assertParamIs(driver, 'plot_param', 'p');
        await assertParamIs(driver, 'a', null);
    });

    it('hides and shows the calculate button', async function() {
        this.timeout(8000);
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
        await typeIn(driver, inputCell(0,0),
            '1', Key.TAB, '1', Key.RETURN,
            '2', Key.TAB, '2', Key.RETURN,
            '3', Key.TAB, '3', Key.RETURN,
            '4', Key.TAB, '4', Key.RETURN
        );
        await clickInputTab(driver, 'options');
        await setValue(driver, 'param-pch', '22');
        await setValue(driver, 'param-bg', '#ffff00');
        await clickId(driver, 'button-calculate');
        const img = await driver.wait(until.elementLocated(By.css('img#output-plot')));
        const imgSrc = await img.getAttribute('src');
        const imgB64 = imgSrc.split(',')[1];
        const png = PNG.sync.read(Buffer.from(imgB64, 'base64'));
        const axes = getAxes(png);
        // Test the points are present
        assert(isPoint(png, 'Y', axes.leftTick, axes.bottomTick)); // 1,1
        assert(isPoint(
            png, 'Y',
            floor((axes.leftTick * 2 + axes.rightTick)/3),
            floor((axes.bottomTick * 2 + axes.topTick)/3),
        )); // 2,2
        assert(isPoint(
            png, 'Y',
            floor((axes.leftTick + axes.rightTick * 2)/3),
            floor((axes.bottomTick + axes.topTick * 2)/3),
        )); // 3,3
        assert(isPoint(png, 'Y', axes.rightTick, axes.topTick)); // 4,4
    });

    it('displays the error', async function() {
        this.timeout(5000);
        await switchFunction(driver, 'test2');
        await clickCalculate(driver);
        await driver.wait(until.elementLocated(By.css('#output-tab-error.active')));
        const error = await driver.findElement(By.css('#output-error'));
        const text = await error.getText();
        assert.strictEqual(text, 'This does not work');
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
        this.timeout(6000);
        await typeIn(driver, inputCell(0,0),
            '2', Key.TAB, '0', Key.RETURN,
            '1', Key.TAB, '1', Key.RETURN,
            '0', Key.TAB, '0', Key.RETURN,
            '1', Key.TAB, '2', Key.RETURN
        );
        await clickInputTab(driver, 'options');
        await setValue(driver, 'param-offset', '1.5');
        await setValue(driver, 'param-factor', '2.4');
        await clickOutputTab(driver, 'table');
        await clickCalculate(driver);
        await assertElementText(driver, outputCell(0, 0), '4.8');
        await assertElementText(driver, outputCell(1, 0), '2.4');
        await assertElementText(driver, outputCell(0, 1), '1.5');
        await assertElementText(driver, outputCell(1, 1), '2.5');
    });

    it('allows R code to be run from the client side', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver, "2+2");
        assert.deepStrictEqual(result.plot, {});
        assert.deepStrictEqual(result.data, [4]);
    });

    it('Does not allow R code to be run that includes forbidden symbols', async function() {
        this.timeout(2000);
        const result = await executeRrpc(driver, "eval('2+2')");
        assert.deepStrictEqual(result.plot, {});
        assert.deepStrictEqual(result.data, [4]);
    });
});

async function executeRrpc(driver, code) {
    const ecode = code.replace(/"/g, '\\"');
    await pageLoaded(driver);
    await driver.executeScript(`window.rrpc_x=null;rrpc.call("runR", {Rcommand:"${ecode}"}, x=>{window.rrpc_x=x});`);
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
    const tag = await e.getTagName();
    const b = tag.toLowerCase() === 'input'? e : await e.findElement(By.css('input'));
    await b.sendKeys.apply(b, text);
}

async function setValue(driver, id, text) {
    await driver.executeScript(
        `var id=arguments[0], text=arguments[1];document.getElementById(id).value=text;`,
        id, text
    );
}

async function assertElementText(driver, by, text) {
    await driver.wait(async function() {
        const e = await driver.findElement(by);
        try {
            const t = await e.getText();
            return text === t.trim();
        } catch {
            return false;
        }
    });
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

async function switchFunction(driver, funcName) {
    await driver.findElement(By.id('param-function-selector')).click();
    await driver.findElement(By.id('function-selector-' + funcName)).click();
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

function isPoint(png, col, x, y) {
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

function getAxes(png) {
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
}
