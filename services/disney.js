const regex = /https:\/\/www\.disneyplus\.com\/.*/;
//const serviceName = 'netflix';

const playButtonSelector = '#explore-ui-main-content-container div[data-testid="details-featured-actions"] a[data-testid="playback-action-button"]';

const disneyService = {
    isMatchingPage: (url) => regex.test(url),
    handlePage: async (page, email, password, autoplay) => {
        await DisneyLogin(page, email, password);
        // Need to wait for it first, just clicking fails.
        await page.waitForSelector(playButtonSelector);
        if (autoplay) {
            console.log("Trying to click play button.");
            await page.click(playButtonSelector);
            console.log('Clicked play button');
        } else {
            await page.focus(buttonSelector);
            console.log('Focused play button');
        }
    }
}

module.exports = disneyService;

const signInButtonSelector = 'a[data-testid="log_in_header"], a[data-testid="login-header"]';

async function getSignInButton(page) {
    return await page.$(signInButtonSelector);
}

async function FDisneyLoggedIn(page) {
    const btn = await getSignInButton(page);
    return !btn;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function DisneyLogin(page, email, password) {
    //await page.waitForSelector("header nav a");
    if (!await FDisneyLoggedIn(page)) {
        // Save initial url in case login fails to redirect in the end (it currently does always).
        const urlInitial = await page.url();
        console.log("Trying to DisneyLogin");
        await Promise.all([
            page.waitForNavigation(),
            page.click(signInButtonSelector)
        ]);
        console.log("Filling in email...");
        await page.locator('#email').fill(email);
        await Promise.all([
            page.waitForNavigation(),
            page.click('button[data-testid="continue-btn"]')
        ]);
        console.log("Filling in password...");
        await page.locator('#password').fill(password);
        await Promise.all([
            page.waitForNavigation(),
            page.click('button[type="submit"]')
        ]);
        console.log("Submitted login info.");
        await page.waitForNavigation()
        // Waiting for two different page navigations before looking to see if we have a profile link
        const url1 = await page.url();
        console.log("At url1: " + url1);
        await page.waitForNavigation();
        const url2 = await page.url();
        console.log("At url2: " + url2);
        //if (!await page.$(playButtonSelector))
        // Click on profile (if there), just do the first one for now.
        const profileButtonSelector = 'section[data-testid="profiles-wrapper"] div[role="button"]';
        const profileButton = await page.$(profileButtonSelector);
        console.log("Checking for profile link...");
        if (profileButton) {
            console.log("Clicking on profile link.");
            await Promise.all([
                page.waitForNavigation(),
                page.click(profileButtonSelector)
            ]);
            const urlFinal = await page.url();
            if (urlFinal.includes("/home")) {
                await page.goto(urlInitial);
            }
        }
    }
}