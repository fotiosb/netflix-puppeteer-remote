//import puppeteer from 'puppeteer-core';
//import puppeteer from 'puppeteer-extra';

const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const chromeBrowser = await puppeteer.launch({
  headless: false,
  //headless: 'new',
  
  ignoreDefaultArgs: ["--enable-automation"], //Remove "automation" browser banner
  //args: ['--no-sandbox', '--disable-notifications'],
  args: ['--disable-notifications'], //Disable page notification pop ups
  
  //browser: 'chrome', //Old style browser calling
  //protocol: 'webDriverBiDi', // CDP will be used by default for Chrome.
  
  channel: 'chrome' //New style Browser calling (OS & Path agnostic).
                    //Avoids explicit CDP/WebSocket Programming complications 7 bugs.
});

const page = await chromeBrowser.newPage();

//App specific code goes here
////////////////////////////////////////////////////////////////////////////
// Navigate the page to netflix.
await page.goto('https://www.netflix.com/login');
console.log("Loading Netflix login page...");

// Set screen size.
await page.setViewport({width: 1280, height: 800});

await page.type('input[name="userLoginId"]', 'alexfotios@gmail.com');
await page.type('input[name="password"]', 'fgkwpGQINS@*^(');
await page.keyboard.press('Enter');

console.log("Logging in to Netflix...");

await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0 });

await sleep(5000);

await page.goto('https://www.netflix.com/watch/*');

////////////////////////////////////////////////////////////////////////////

//await chromeBrowser.close();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}