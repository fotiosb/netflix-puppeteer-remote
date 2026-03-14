const puppeteer = require('puppeteer');
const http = require('http');
const { exec } = require('child_process');
/* process.argv.forEach((arg, index) => {
    console.log(`Argument ${index}: ${arg}`);
}); */
// Autoplay IFF first parameter is "true"
const autoplay = process.argv[2] === "true";
//const autoplay = true;
console.log(`autoplay: ${autoplay}`);

// Poll the remote debugging URL until it becomes available
const pollRemoteDebuggingURL = (url, timeout = 60000, interval = 200) => {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const checkAvailability = () => {
            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    retry();
                }
            }).on('error', retry);
        };

        const retry = () => {
            if (Date.now() - start >= timeout) {
                reject(new Error('Timed out waiting for Chrome to start'));
            } else {
                setTimeout(checkAvailability, interval);
            }
        };

        checkAvailability();
    });
};

const startChrome = (command) => {
    return chromeProcess = exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error('Error launching Chrome:', err);
            return;
        }
        console.log('Chrome launched successfully');
    });
}

(async () => {
    //const homeUrl = 'https://mystreme.ai';
    const startUrl = 'https://mystreme:MyStremeAgain!@mystreme.ai/?remote=true';
    //const startUrl = 'http://mystreme:MyStremeAgain!@localhost:3000/?remote=true';
    const initUrl = startUrl; //'about:blank' // Change this to your starting URL
    //const chromeExecutablePath = '/Users/kevindegraaf/.cache/puppeteer/chrome/mac-126.0.6478.182/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    //const userDataDir = '/Users/kevindegraaf/Library/Application Support/ChromePuppeteerProfile/';
    //const chromeExecutablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
	const chromeExecutablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	
    const remoteDebuggingPort = 9222;
    const remoteDebuggingURL = `http://localhost:${remoteDebuggingPort}`;

    /* command line:
    e	/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --allow-pre-commit-input --disable-background-networking
    --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-breakpad
    --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update
    --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-hang-monitor --disable-infobars
    --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding
    --disable-search-engine-choice-screen --disable-sync --enable-automation --export-tagged-pdf
    --generate-pdf-document-outline --force-color-profile=srgb --metrics-recording-only --no-first-run
    --password-store=basic --use-mock-keychain
    --disable-features=Translate,AcceptCHFrame,MediaRouter,OptimizationHints,ProcessPerSiteUpToMainFrameThreshold,IsolateSandboxedIframes --enable-features=PdfOopif
    --user-data-dir=/Users/kevindegraaf/Library/Application Support/ChromePuppeteerProfile --start-fullscreen
    --remote-debugging-port=0 --flag-switches-begin --flag-switches-end about:blank
     */
/*
    const wsChromeEndpointUrl = 'ws://127.0.0.1:9222/devtools/browser/512ab75a-0a74-4b0f-980b-33de58834988';
    const browser = await puppeteer.connect({defaultViewport: null, browserWSEndpoint: wsChromeEndpointUrl});
*/

    const command = `"${chromeExecutablePath}" --remote-debugging-port=${remoteDebuggingPort} --no-default-browser-check --no-first-run "${initUrl}"`;
    console.log("command:" + command);
    // Execute the command to launch Chrome
    const chromeProcess = startChrome(command);
    //const browserUrl = 'http://localhost:9222';
    await pollRemoteDebuggingURL(remoteDebuggingURL);
    const browser = await puppeteer.connect({defaultViewport: null, browserURL: remoteDebuggingURL});

    /*
    // Launch browser in fullscreen/kiosk mode
    const browser = await puppeteer.launch({
        headless: false, // Make sure it opens Chrome, not in headless mode
        defaultViewport: null,
        ignoreDefaultArgs: true, //['--enable-automation'], //true,
        executablePath: chromeExecutablePath,
        //userDataDir: `/Users/kevindegraaf/Library/Application Support/ChromePuppeteerProfile/`,
        // /Users/kevindegraaf/Library/Application Support/Google/Chrome/Profile 1
        args: [
            //'--start-fullscreen',
            `--user-data-dir=${userDataDir}`,
            //'--enable-automation',
            '--no-first-run',
            '--no-default-browser-check',
            //'--kiosk',
        ],
    }); */

    async function getMainPage() {
        const pages = await browser.pages();
        return pages[0];
    }

    const page = await getMainPage();
    //const page = await browser.newPage();

    // Navigate to the specified URL
    await page.goto(startUrl);
    console.log("went to: " + startUrl);
    await page.exposeFunction('mystreme_autologin', async (serviceName, url, email, password, autorent) => {
        const service = require(`./services/${serviceName}`);
        try {
            await page.goto(url);
            await service.handlePage(page, email, password, autoplay, autorent);
        } catch (err) {
            console.log(`Unexpected error in handlePage for ${serviceName}: ${err}`);
        }
    });
    console.log("Exposed mystreme_autologin function...");
    // Add close event logger.
    chromeProcess.on('close', (code) => {
        console.log(`Chrome closed with code ${code}`);
    });
    // Wait for the browser to close
    await new Promise((resolve) => {
        chromeProcess.on('close', resolve);
    });
    console.log('Done waiting for user to close the browser...');

    //await page.evaluate(() => window.localStorage.setItem('autologin', 'true'));

    /* while (true) {
        try {
            await new Promise(resolve => setTimeout(resolve, 3600000)); // Keep open for an hour seconds for testing
            // Wait for the URL to change, timeouts at an hour and tries again
            /* await page.waitForNavigation({timeout: 3600000});

            const newUrl = await page.evaluate(() => window.location.href);

            const {email, password} = await page.evaluate((service) => {
                return { email: window.localStorage.getItem(service + '_email'),
                    password: window.localStorage.getItem(service + '_password')};
            });

            // Check if the current URL matches the Amazon video URL pattern
            if (amazonVideoRegex.test(newUrl)) {
                // Login if not
                await AmazonLogin(page, email, password);
                await clickPlay(page);
            } else {
                console.log('Not an Amazon video page');
            }
        } catch (err) {
            console.log('Unexpected error:', err);
        }
    }
*/
    // Add a delay before closing the browser (just to see the result)
    //await page.waitForTimeout(10000);

    //await browser.close();
})();