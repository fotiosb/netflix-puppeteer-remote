const regex = /https:\/\/.*\.amazon\.com\/gp\/video\/.*/;
const serviceName = 'amazon';

const amazonService = {
    isMatchingPage: (url) => regex.test(url),
    handlePage: async (page, email, password, autoplay, autorent) => {
        try {
            await AmazonLogin(page, email, password);
            if (autorent && autoplay) {
                await rentPlay(page);
            } else {
                if (autoplay) {
                    await clickPlay(page);
                }
                else {
                    await focusPlay(page);
                }
            }
        }
        catch (err) {
            console.log('Unexpected error in handlePage for amazonService:', err);
        }
    }
}

module.exports = amazonService;

async function getText(page, element) {
    return await page.evaluate(el => el.textContent, element);
}

async function FAmazonLoggedIn(page) {
    const signInButton = await page.$('#nav-link-accountList-nav-line-1');
    if (signInButton) {
        const txt = await page.evaluate(el => el.textContent, signInButton);
        if (txt.toLowerCase().includes("sign in")) {
            return false;
        }
    }
    return true;
}

async function AmazonLogin(page, email, password) {
    if (!await FAmazonLoggedIn(page)) {
        await Promise.all([
            page.waitForNavigation(),
            page.click('#nav-link-accountList-nav-line-1')
        ]);
        //await page.click('#nav-link-accountList-nav-line-1');
        // Assert correct url?
        //const url = await page.evaluate(() => window.location.href);
        await fillEmailAndContinue(page, email);
        await fillPasswordAndContinue(page, password);
    }
}

async function fillEmailAndContinue(page, email) {
    // Select all text to ensure replacement
    //await page.click('#ap_email', { clickCount: 3 });
    //await page.$eval('#ap_email', el => el.value = '');
    await page.locator('#ap_email').fill(email);
    await Promise.all([
        page.waitForNavigation(),
        page.click('#continue')
    ]);
    //await page.click('#continue');
}

async function fillPasswordAndContinue(page, password) {
    //await page.click('#ap_password', { clickCount: 3 });
    //await page.$eval('#ap_password', el => el.value = '');
    //await page.type('#ap_password', password);
    await page.locator('#ap_password').fill(password);
    await page.click('input[name="rememberMe"]')
    // Avoid saved password problems?
    await Promise.all([
        page.waitForNavigation(),
        page.click('#signInSubmit')
    ]);
}

// Wait for up to timeout (currently 1s) for movie to play.  Once it does (if it does), will wait another timeout to ensure
// it continues to play.
async function ensureVideoPlaying(page, videoSelector, playButtonSelector, checkInterval = 200, timeoutWait = 5000, timeoutEnsure = 1000) {
    let playTime = null;
    let isPlaying = false;

    // Give it a little pause before checking...
    await new Promise(resolve => setTimeout(resolve, 200));
    let startTime = Date.now();
    while ((!isPlaying && (Date.now() - startTime) < timeoutWait) ||
            (isPlaying && (Date.now() - playTime) < timeoutEnsure)) {
        // Check if the video is playing
        isPlaying = await page.evaluate((videoSelector) => {
            const videoElement = document.querySelector(videoSelector);
            if (videoElement) {
                return !videoElement.paused /* && !videoElement.ended */ && videoElement.readyState > 2;
            }
            return false;
        }, videoSelector);

        if (isPlaying) {
            console.log('The video is playing');
            // Set the playTime clock if playing and time not set
            if (playTime === null) {
                playTime = Date.now();
            }
        } else {
            // Reset the playTime if not playing
            playTime = null;
            console.log('The video is paused, attempting to play...');
            await page.click(playButtonSelector);
            // Only should need to click once.
            //return;
        }

        // Wait for the specified interval before checking again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.log('Finished checking video play status');
}

// Also buy a TV episode for demo purposes now.  Not sure if this makes sense long term.
async function getRentalButton(page) {
    // Return a rental button to click.  If multiple entries, pick the highest resolution.
    const rgBtn = await Promise.all([
        page.$('#tvod-btn-ab-movie-uhd-tvod_rental button[type="submit"]'),
        page.$('#tvod-btn-ab-movie-hd-tvod_rental button[type="submit"]'),
        page.$('#tvod-btn-ab-movie-sd-tvod_rental button[type="submit"]'),
        /* page.$('#tvod-btn-ab-movie-uhd-tvod_purchase button[type="submit"]'),
        page.$('#tvod-btn-ab-movie-hd-tvod_purchase button[type="submit"]'),
        page.$('#tvod-btn-ab-movie-sd-tvod_purchase button[type="submit"]'), */
        page.$('#tvod-btn-ab-episode-hd-tvod_purchase button[type="submit"]'),
        page.$('#tvod-btn-ab-episode-sd-tvod_purchase button[type="submit"]'),
    ]);
    return rgBtn[0] || rgBtn[1] || rgBtn[2] || rgBtn[3] || rgBtn[4];
}

async function continueResolutionSupport(page) {
    const header = await page.$('#GeneralDialog header');
    console.log("In continueResolutionSupport...");
    if (header) {
        const txt = await getText(page, header);
        console.log('continueResolutionSupport txt=' + txt.toString());
        if (txt === 'Resolution support') {
            const checkbox = await page.$('#GeneralDialog form label[for="checkboxConfirm"]');
            await checkbox.click();
            const continueButton = await page.$('#GeneralDialog button[type="submit"]');
            await continueButton.click();
        }
    }
}

async function continueConfirmRental(page) {
    const header = await page.$('#GeneralDialog header');
    console.log("In continueConfirmRental...");
    if (header) {
        const txt = await getText(page, header);
        console.log('continueConfirmRental txt=' + txt.toString());
        if (txt === 'Confirm rental' || txt === 'Confirm purchase') {
            const continueButton = await page.$('#GeneralDialog button[type="submit"]');
            await continueButton.click();
        }
    }
}

async function ensureRentalCompletes(page) {
    await continueResolutionSupport(page);
    await continueConfirmRental(page);
    // click the play button when finished with popups.
    await clickPlay(page);
}

async function rentPlay(page) {
    try {
        const rentButton = await getRentalButton(page);
        if (rentButton) {
            await rentButton.click();
            await page.waitForSelector('#GeneralDialog');
            // Check for and close all popups...
            await ensureRentalCompletes(page);
        } else {
            // Try just clicking on a play button if already there...
            await clickPlay(page);
        }
    } catch (err) {
        console.log('Unexpected error:', err);
    }
}

const playButtonSelector = '#dv-action-box a[aria-label*="continue watching" i], a[aria-label="play" i], #dv-action-box a[aria-label*="watch now" i], #dv-action-box a[aria-label*="resume" i], #dv-action-box a[aria-label*="watch again" i]';

async function clickPlay(page) {
    try {
        // Try to find and click the play button
        await page.waitForSelector(playButtonSelector);
        await page.click(playButtonSelector);
        console.log("Clicked play button...");
        await ensureVideoPlaying(page, '#dv-web-player video', playButtonSelector);
    } catch (err) {
        console.log('Unexpected error:', err);
    }
}

async function focusPlay(page) {
    try {
        // Try to find the play button
        await page.focus(playButtonSelector)
        console.log("Focus play button...");
    } catch (err) {
        console.log('Unexpected error:', err);
    }
}