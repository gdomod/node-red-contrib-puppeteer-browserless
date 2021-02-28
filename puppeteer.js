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

        function getOptions(headless, sandbox) {
            let options = {};
            if (headless === false) {
                options.headless = false;
            }
            if(sandbox === false){
                options.args = ['--no-sandbox', '--disable-setuid-sandbox'];
            }
            return options;
        }

        node.on('input', function (msg) {
            //const url = msg.topic || msg.url;
            //const selector = msg.selector || configSelector;
            
            (async () => {
                let browser;
                try {
                    const outputFormat = msg.outputFormat || configOutputFormat;
                    node.status({fill: "green", shape: "dot", text: 'Launching browser'});
                    const options = getOptions(msg.headless, msg.sandbox);
                    browser = await puppeteer.launch(options);
                    node.status({fill: "green", shape: "dot", text: 'Loading page'});
                    const page = await browser.newPage();
                    await page.goto(url);
                    node.status({fill: "green", shape: "dot", text: 'Applying selector'});
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
