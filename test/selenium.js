"use strict";

const { spawn } = require('child_process');
const { Builder, By, Key, until } = require('selenium-webdriver');
const { describe, before, after, it } = require('mocha');
const assert = require("assert");
//const { PNG } = require("pngjs");
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
        this.timeout(12000);
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
        this.timeout(5000);
        const calculateButton = await driver.findElement(By.id('button-calculate'));
        await driver.wait(until.elementIsVisible(calculateButton));
        assert(await calculateButton.isDisplayed());
        await clickInputTab(driver, 'options');
        await clickId(driver, 'param-autorefresh');
        await driver.wait(until.elementIsNotVisible(calculateButton));
        await clickId(driver, 'param-autorefresh');
        await driver.wait(until.elementIsVisible(calculateButton));
    });
 
    it('can run the calculation', async function() {
        this.timeout(15000);
        await clickOutputTab(driver, 'table');
        const cell = await driver.findElement(inputCell(0, 0));
        await cell.click();
        await cell.findElement(By.css('input')).sendKeys('10', Key.RETURN);
        await assertElementText(driver, outputCell(0,0), '15');
        await clickCalculate(driver);
        await assertElementText(driver, outputCell(0,0), '10');
    });
});

async function assertElementText(driver, by, text) {
    await driver.wait(until.elementTextIs(
        await driver.findElement(by),
        text
    ));
}

async function clickCalculate(driver) {
    await driver.findElement(By.id('button-calculate')).click();
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
