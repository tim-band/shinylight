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
        await assertParamIs(driver, 'plot_param', 'p');
        await assertParamIs(driver, 'a', null);
        await switchFunction(driver, 'test2');
        await assertParamIs(driver, 'plot_param', null);
        await assertParamIs(driver, 'a', '');
        await switchFunction(driver, 'test1');
        await assertParamIs(driver, 'plot_param', 'p');
        await assertParamIs(driver, 'a', null);
    });
});

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
