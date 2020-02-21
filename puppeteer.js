const puppeteer = require('puppeteer');
module.exports = function (RED) {
    const outputProperty = {
        textContent: "textContent",
        rawHTML: "outerHTML"
    };

    function PuppeteerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const configOutputFormat = config.outputFormat;
        const configSelector = config.selector;

        function validateParams(url, selector, outputFormat) {
            if (!url) {
                node.send([null, 'No url specified in msg.topic or msg.url']);
                return false;
            }
            if (!selector) {
                node.send([null, 'No selector specified in msg.selector or the node config']);
                return false;
            }
            if (outputFormat) {
                if (!Object.keys(outputProperty).includes(outputFormat)) {
                    node.send([null, 'Invalid output format specified- msg.outputFormat must be textContent or rawHTML']);
                    return false;
                }
            }
            return true;
        }

        node.on('input', function (msg) {
            const url = msg.topic || msg.url;
            const selector = msg.selector || configSelector;
            if (!validateParams(url, selector, msg.outputFormat)) {
                return;
            }
            (async () => {
                const outputFormat = msg.outputFormat || configOutputFormat;
                node.status({fill: "green", shape: "dot", text: 'Launching browser'});
                let browser;
                if (msg.headless === false) {
                    browser = await puppeteer.launch({headless: false});
                } else {
                    browser = await puppeteer.launch();
                }
                node.status({fill: "green", shape: "dot", text: 'Loading page'});
                const page = await browser.newPage();
                await page.goto(url);
                node.status({fill: "green", shape: "dot", text: 'Applying selector'});
                try {
                    const matches = await page.$$eval(selector, function (matches) { //cant use arrow function here as we need to access the arguments object
                        const format = arguments[1];
                        return matches.map(match => {
                            return match[format];
                        });
                    }, outputProperty[outputFormat]);
                    node.send({matches});
                } catch (e) {
                    node.status({fill: "red", shape: "dot", text: e.name});
                    node.send([null, e]);
                } finally {
                    if (browser && msg.closeInstance !== false) {
                        await browser.close(); //todo do we need to wait here?
                    }
                    node.status({});
                }
            })();
        });
    }

    RED.nodes.registerType("puppeteer", PuppeteerNode);
};