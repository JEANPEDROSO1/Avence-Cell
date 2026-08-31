const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  console.error("JSDOM Error:", error.message, error.detail);
});
virtualConsole.on("error", (error) => {
    console.error("Console Error:", error);
});
virtualConsole.on("log", (log) => {
    console.log("Console Log:", log);
});

const dom = new JSDOM(html, { 
    runScripts: "dangerously", 
    resources: "usable",
    virtualConsole 
});

setTimeout(() => {
    console.log("Done waiting.");
}, 2000);
