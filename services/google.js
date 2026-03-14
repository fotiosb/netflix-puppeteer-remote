const regex = /https:\/\/play\.google\.com\/.*/;
//const serviceName = 'netflix';

const playButtonSelector = 'c-wiz [data-video-url] button';
const rentButtonSelector = 'c-wiz button[aria-label*=" rent" i]';
const buyButtonSelector = 'c-wiz button[aria-label$=" buy" i]';

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

async function findFirstVisibleElementWithText(page, selector, textContent) {
    // Evaluate the page to find the first visible element matching the selector and textContent
    const visibleElementHandle = await page.evaluateHandle((selector, textContent) => {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const style = window.getComputedStyle(element);
            const isVisible = style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.offsetWidth > 0 && element.offsetHeight > 0;
            const textMatches = element.textContent.trim().includes(textContent);
            if (isVisible && textMatches) {
                return element;
            }
        }
        return null;
    }, selector, textContent);

    if (!visibleElementHandle) {
        throw new Error(`No visible elements found for selector: ${selector} with text content: "${textContent}"`);
    }

    // Wrap the handle in a Puppeteer element handle for further use
    return visibleElementHandle.asElement();
}

async function findFirstVisibleElement(page, selector) {
    // Evaluate the page to find the first visible element matching the selector
    const visibleElementHandle = await page.evaluateHandle((selector) => {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const style = window.getComputedStyle(element);
            const isVisible = style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.offsetWidth > 0 && element.offsetHeight > 0;
            if (isVisible) {
                return element;
            }
        }
        return null;
    }, selector);

    if (!visibleElementHandle) {
        throw new Error(`No visible elements found for selector: ${selector}`);
    }

    // Wrap the handle in a Puppeteer element handle for further use
    return visibleElementHandle.asElement();
}

async function waitForFirstVisibleElement(page, selector, timeout = 30000) {
    // Use page.waitForFunction to wait until a visible element matching the selector is found
    const visibleElementHandle = await page.waitForFunction(
        (selector) => {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const style = window.getComputedStyle(element);
                const isVisible = style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.offsetWidth > 0 && element.offsetHeight > 0;
                if (isVisible) {
                    return element;
                }
            }
            return null;
        },
        { timeout },
        selector
    );

    if (!visibleElementHandle) {
        throw new Error(`No visible elements found for selector: ${selector}`);
    }

    // Wrap the handle in a Puppeteer element handle for further use
    return visibleElementHandle.asElement();
}

const googleService = {
    isMatchingPage: (url) => regex.test(url),
    handlePage: async (page, email, password, autoplay, autorent) => {
        await GoogleLogin(page, email, password);
        await page.waitForSelector('c-wiz');
        const watchBtn = await page.$(playButtonSelector);
        if (autorent && autoplay && !watchBtn) {
            // Don't try to clickOrFocusPlay if rentPlay returns TRUE.
            if (await rentPlay(page, password)) {
                return;
            }
        }
        // Do this after renting or instead of renting if it failed.
        await clickOrFocusPlay(page, autoplay);
    }
}

async function clickOrFocusPlay(page, autoplay) {
    // Need to wait for it first, just clicking fails.
    await page.waitForSelector(playButtonSelector);
    if (autoplay) {
        console.log("Trying to click play button.");
        await Promise.all([
            page.waitForNavigation(),
            page.click(playButtonSelector)
        ]);
        //await page.click(playButtonSelector);
        console.log('Clicked play button');
        await ClickWarningBtn(page);
    } else {
        await page.focus(playButtonSelector);
        console.log('Focused play button');
    }
}

// Click on a warning button if it is there...
async function ClickWarningBtn(page) {
    console.log("Checking for warning button (should only occur for rentals).");
    // Wait until the video is up, could check status if any issues...
    //await page.waitForSelector('video');
    try {
        const warningButton = await page.waitForSelector('mat-dialog-container button.confirm', {timeout: 5000});
        if (warningButton) {
            console.log("There was one, clicking on it.")
            await warningButton.click();
        }
    } catch (e) {
        // Ignore error warnings for timeout, nothing needs to be done...
    }
    console.log("Finished ClickWarningBtn.");
}

async function getRentOrBuyButton(page) {
    const rgBtn =  await Promise.all([
        page.$(rentButtonSelector),
        findFirstVisibleElement(page, buyButtonSelector)
    ]);
    return rgBtn[0] || rgBtn[1];
}

async function getPurchaseDialogFrame(page) {
    let rentalFrameElement = await page.waitForSelector('iframe[src*="tokenized.play.google"]');
    return await rentalFrameElement.contentFrame();
}

async function waitForPageOrFrameNavigation(page, frame) {
    await Promise.race([
        await page.waitForNavigation(),
        await frame.waitForNavigation()
    ]);
}

async function DoChoiceClick(page, frame, button) {
    console.log("DoChoiceClick beginning.")
    await Promise.all([
        //waitForPageOrFrameNavigation(page, frame),
        frame.waitForNavigation(),
        //page.waitForNetworkIdle(),
        button.click()
        //frame.page().keyboard.press('Enter')
    ]);
    console.log("DoChoiceClick done.")
}

async function getPurchaseChoiceButton(page) {
    // Return a purchase button to click.  If multiple entries, pick the highest resolution.
    const rgBtn = await Promise.all([
        findFirstVisibleElement(page, 'button[aria-label$=" HD"]'),
        findFirstVisibleElement(page,'button[aria-label$=" SD"]')
    ]);
    return rgBtn[0] || rgBtn[1];
}


async function DoRentalChoice(page) {
    console.log("DoRentalChoice starting...")
    let frame = await getPurchaseDialogFrame(page);
    // Wait until some buttons show up...
    console.log("Waiting for button in frame.")
    await frame.waitForSelector('button');
    // Need to find inside document to click on it.  Clicking on an element found in the frame fails.
    console.log('Seeing if there is a visible buy-button');
    let btn = await findFirstVisibleElement(frame, '#buy-button');
    /* const rgBtn = await Promise.all([
        frame.$('#buy-button'),
        frame.$('button[aria-label$=" HD"]'),
        frame.$('button[aria-label$=" SD"]')
    ]); */
    if (btn) {
        await DoChoiceClick(page, frame, btn);
    } else {
        let btn = await getPurchaseChoiceButton(frame);
        await DoChoiceClick(page, frame, btn);
        frame = await getPurchaseDialogFrame(page);
        // Wait until network idle?
        //await waitForFrameNetworkIdle(page, frame);
        // Wait until some buttons show up...
        //await frame.waitForSelector('#buy-button');
        console.log("Waiting for button in frame again.");
        btn = await waitForFirstVisibleElement(frame, '#buy-button');
        //btn = await findFirstVisibleElement(frame, '#buy-button');
        //if (btn) {
            await DoChoiceClick(page, frame, btn);
        //}
    }
}

// Returns true if video is playing so we won't try to click play again.
async function rentPlay(page, password) {
    try {
        const btn = await getRentOrBuyButton(page);
        if (btn) {
            await btn.click();
            await DoRentalChoice(page);
            await FillInPwd(page, password);
            // Somehow wait for dialog if it occurs? Only needs to happen once, then...
            console.log("Waiting for authentication popup to click through.");
            let rentalFrame = await getPurchaseDialogFrame(page);
            await waitForFrameNetworkIdle(page, rentalFrame);
            rentalFrame = await getPurchaseDialogFrame(page);
            const settingsButton = await rentalFrame.$('[aria-label="Only app installs through play.google.com"]');
            if (settingsButton) {
                //rentalFrame.click('[aria-label="Purchases and app installs through play.google.com"]')
                console.log("Clicking on only app installs.");
                await settingsButton.click();
                // Click on save button.
                console.log("Clicking on save button.")
                await rentalFrame.click('button');
                rentalFrame = await getPurchaseDialogFrame(page);
                await waitForFrameNetworkIdle(page, rentalFrame);
            }
            //rentalFrame = await getPurchaseDialogFrame(page);
            const watchButton = await findFirstVisibleElementWithText(rentalFrame, 'button', 'Watch');
            if (watchButton) {
                await watchButton.click();
            }
            await ClickWarningBtn(page);
            const video = await page.$('video');
            if (video) {
                return true;
            }
        }
    } catch (err) {
        console.log('Unexpected error:', err);
    }
    return false;
}

module.exports = googleService;

const openMenuButtonSelector = 'header button[aria-label="Open account menu"]';
const signInButtonSelector = 'header ul[aria-label="Account menu"] li[role="menuitem"]';

async function getOpenMenuButton(page) {
    return await page.$(openMenuButtonSelector);
}

async function FGoogleLoggedIn(page) {
    return !await getOpenMenuButton(page);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Array.find can't handle async functions, so write a helper to do that...
async function findAsync(arr, asyncCallback) {
    const promises = arr.map(asyncCallback);
    const results = await Promise.all(promises);
    const index = results.findIndex(result => result);
    return arr[index];
}

async function FillInPwd(page, password) {
    // Should be on password page now via either pathway...
    if (page.url().includes("/pwd?")) {
        await page.locator('form input[name="Passwd"]').fill(password);
        await Promise.all([
            page.waitForNavigation(),
            page.click('#passwordNext button')
        ]);
    } else {
        console.log(`Error: FillInPwd called at incorrect url (${page.url()})`);
    }
}

async function GoogleLogin(page, email, password) {
    //await page.waitForSelector("header nav a");
    if (!await FGoogleLoggedIn(page)) {
        // Save initial url in case login fails to redirect in the end (it currently does always).
        const urlInitial = await page.url();
        console.log("Trying to GoogleLogin");
        await page.click(openMenuButtonSelector);
        await Promise.all([
            page.waitForNavigation(),
            page.click(signInButtonSelector)
        ]);
        if (page.url().includes("/signinchooser?")) {
            await page.waitForSelector('form');
            const emails = await page.$$('form ul li [data-email]')
            const foundEmail = await findAsync(emails, async (el) =>
                await page.evaluate(el => el.textContent, el) === email
            );
            if (foundEmail) {
                await Promise.all([
                    page.waitForNavigation(),
                    foundEmail.click()
                ]);
            } else {
                const entries = await page.$$('form ul li');
                const anotherEmail = await findAsync(entries, async (el) =>
                    await page.evaluate(el => el.textContent, el) === "Use another account"
                );
                if (anotherEmail) {
                    await Promise.all([
                        page.waitForNavigation(),
                        anotherEmail.click()
                    ]);
                    if (page.url().includes("/identifier?")) {
                        await page.locator('#identifierId').fill(email);
                        await Promise.all([
                            page.waitForNavigation(),
                            page.click('#identifierNext button')
                        ]);
                    }
                }
            }
            await FillInPwd(page, password);
        }
    }
}