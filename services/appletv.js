const regex = /https:\/\/tv\.apple\.com\/.*/;
const serviceName = 'appletv';

async function ensureVideoPlaying(page, videoSelector, playButtonSelector, checkInterval = 500, timeoutWait = 5000, timeoutEnsure = 1000) {
    let video = null;

    // Give it a little pause before checking...
    await delay(checkInterval);
    let startTime = Date.now();
    while ((Date.now() - startTime) < timeoutWait) {
        // Check if the video is there
        video = await page.$(videoSelector);

        if (video != null) {
            console.log('The video player is visible');
            return;
        } else {
            console.log('The video not there yet, trying to click again...');
            try {
                await page.click(playButtonSelector);
            } catch (e) {
                console.log('Error clicking play button: ' + e);
            }
        }

        // Wait for the specified interval before checking again
        await delay(checkInterval);
    }

    console.log('Finished checking video play status');
}

const appletvService = {
    isMatchingPage: (url) => regex.test(url),
    handlePage: async (page, email, password, autoplay) => {
        await AppleTVLogin(page, email, password);
        // Wait for persistent sign-in to be complete before trying to click on play...
        console.log("Trying to wait for login state.")
        await page.waitForSelector(signInSection + " .nav-header-auth")
        console.log("Waited for login state...")
        const buttonSelector = '.product-header__content__buttons button[title*="play" i], button[title*="resume" i]';
        // Need to wait for it first, just clicking fails.
        await page.waitForSelector(buttonSelector);
        if (autoplay) {
            console.log("Trying to click play button.");
            await page.click(buttonSelector);
            console.log('Clicked play button');
            await ensureVideoPlaying(page, 'video', buttonSelector);
        } else {
            await page.focus(buttonSelector);
            console.log('Focused play button');
        }
    }
}

module.exports = appletvService;

const signInSection = '.nav-header__content .nav-header__user-controls'
const signInButtonSelector = signInSection + ' button.commerce-button'

async function getSignInButton(page) {
    return await page.$(signInButtonSelector);
}

async function FAppleTVLoggedIn(page) {
    const btn = await getSignInButton(page);
    return !btn;
}

async function waitForFrameNetworkIdle(page, frame, timeout = 30000, idleTime = 500) {
    let resolveIdlePromise;
    const start = Date.now();
    const idlePromise = new Promise((resolve) => {
        resolveIdlePromise = resolve;
    });

    let activeRequests = 0;
    let idleTimeout;

    const checkIdle = () => {
        clearTimeout(idleTimeout);
        console.log(`checkIdle when activeRequests = ${activeRequests} and time is ${(Date.now() - start) / 1000}`);
        if (activeRequests === 0) {
            idleTimeout = setTimeout(resolveIdlePromise, idleTime);
        }
    };

    // Listen to network events on the page
    const onRequest = (request) => {
        if (request.frame() === frame) {
            activeRequests += 1;
            clearTimeout(idleTimeout);
        }
    };

    const onRequestFinished = (request) => {
        if (request.frame() === frame) {
            activeRequests -= 1;
            // We may have some pending requests, so ignore and never go < 0
            if (activeRequests < 0) {
                activeRequests = 0;
            }
            checkIdle();
        }
    };

    const onRequestFailed = (request) => {
        if (request.frame() === frame) {
            activeRequests -= 1;
            checkIdle();
        }
    };

    page.on('request', onRequest);
    page.on('requestfinished', onRequestFinished);
    page.on('requestfailed', onRequestFailed);

    try {
        // Need to setup an idle timeout in case of no requests.
        idleTimeout = setTimeout(resolveIdlePromise, idleTime);
        await Promise.race([
            idlePromise,
            new Promise((_, reject) => setTimeout(reject, timeout, new Error('Frame did not reach network idle state within the timeout')))
        ]);
    } finally {
        console.log(`Finishing when time is ${(Date.now() - start) / 1000}`);
        // Clean up listeners
        page.off('request', onRequest);
        page.off('requestfinished', onRequestFinished);
        page.off('requestfailed', onRequestFailed);
    }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getAidAuthWidgetFrame(page) {
    return page.frames().find(frame => frame.name() === 'aid-auth-widget');
}

async function waitForAidAuthWidgetFrame(page) {
    console.log('Running waitForAidAuthWidgetFrame');
    let n = 0;
    let frame = getAidAuthWidgetFrame(page);
    while (n < 30) {
        if (frame !== null) {
            return;
        }
        await delay(200);
        console.log("aid-auth-widget still not there, trying again...")
        frame = getAidAuthWidgetFrame(page);
    }
}

async function waitForFrameSelector(page, selector) {
    console.log('Running waitForFrameSelector');
    let frame = getAidAuthWidgetFrame(page);
    let n = 0
    let el = null;
    while (n < 20) {
        n++;
        try {
            el = await frame.waitForSelector(selector);
            return el;
        } catch (err) {
            console.log("Error in waitForFrameSelector, trying again.");
            await delay(200);
            // Fetch the frame again...
            frame = getAidAuthWidgetFrame(page);
        }
    }
}

async function waitForFrameClick(page, selector) {
    let frame = getAidAuthWidgetFrame(page);
    let n = 0;
    while (n < 20) {
        n++;
        try {
            let button = await frame.waitForSelector(selector, {timeout: 5000});
            await button.click();
        } catch (err) {
            console.log('Unexpected error:', err);
            console.log("Ignoring error in waitForFrameClick, returning");
            //return;
            console.log("Error in waitForFrameClick, trying again.")
            await delay(200);
            // Fetch the frame again...
            frame = getAidAuthWidgetFrame(page);
        }
    }
}

// await TestClick(page, email, password)
async function TestClick(page, email, password) {
    await page.goto("https://tv.apple.com");
    console.log("Went to tv.apple.com");
    await DoLogin(page, email, password);
}

const ClearPlayCloseSelector = '#ClearPlayFilterRoot >>> header svg.icon.clickable'

async function DoLogin(page, email, password){
    await page.waitForSelector(signInButtonSelector);
    console.log("Waited for sign in section.");
    const clearPlayClose = await page.$(ClearPlayCloseSelector);
    if (clearPlayClose) {
        // Close ClearPlay, blocks Sign In button...
        await page.click(ClearPlayCloseSelector);
    }
    //await delay(1000);
    await page.click(signInButtonSelector);
    console.log('clicked on sign in button')
    await delay(200);
    while (!await page.$('dialog iframe')) {
        console.log("Trying to click again...");
        await page.click(signInButtonSelector);
        await delay(200);
    }
    //console.log("dialog should be up now.");
    console.log("Waiting for dialog iframe");
    const frameElement = await page.waitForSelector('dialog iframe');
    const frame = await frameElement.contentFrame();
    console.log("Waiting for frame network idle...");
    await waitForFrameNetworkIdle(page, frame);
    console.log("Waiting for #accountName");
    const account = await frame.waitForSelector('#accountName');
    // We need to click into the account before it will let us type...
    await account.click();
    await account.type(email);
    console.log("Waiting for email to be filled in.");
    await frame.waitForFunction(((el, email) => el.value === email), account, email);
    console.log("account: " + await frame.evaluate(el => el.value, account));
    await delay(200);
    console.log("Filled in email, trying to submit...")
    await frame.waitForSelector('button[type="submit"]');
    //await waitForAidAuthWidgetFrame(page);
    await waitForFrameSelector(page, 'body');
    //console.log("Waiting for AidAuthWidgetFrame network idle...");
    //await waitForFrameNetworkIdle(page, getAidAuthWidgetFrame(page));
    //await page.waitForNetworkIdle();
    //console.log("Frame count: " + page.frames().length);
    //await delay(200);
    console.log("Actually clicking now...")
    await frame.click('button[type="submit"]');
    await waitForFrameSelector(page, 'body');
    // Not waiting for anything here:
    //console.log("Waiting for AidAuthWidgetFrame network idle...");
    //await waitForFrameNetworkIdle(page, getAidAuthWidgetFrame(page));
    //console.log("Frame count: " + page.frames().length);
    await waitForFrameSelector(page, '#continue-password');
    //console.log("clicking on #continue-password");
    //await waitForFrameClick(page, '#continue-password');
    await getAidAuthWidgetFrame(page).click('#continue-password');
    //await frame.click('#continue-password');
    console.log("Waiting for #password_text_field");
    const passwordInput = await waitForFrameSelector(page, '#password_text_field');
    console.log("Entering password");
    await passwordInput.type(password);
    console.log("Waiting for #sign-in");
    await waitForFrameSelector(page, '#sign-in');
    console.log("Waiting for AidAuthWidgetFrame network idle...");
    await waitForFrameNetworkIdle(page, getAidAuthWidgetFrame(page));
    //const loginButton = await frame2.$('#sign-in')
    console.log("Clicking on #sign-in");
    //await waitForFrameClick(page, '#sign-in');
    //await delay(200);
    await getAidAuthWidgetFrame(page).click('#sign-in');
}

async function AppleTVLogin(page, email, password) {
    console.log("AppleTVLogin...");
    await page.waitForSelector(signInSection);
    if (!await FAppleTVLoggedIn(page)) {
        console.log('Trying to login for AppleTV');
        await DoLogin(page, email, password);
    }
}