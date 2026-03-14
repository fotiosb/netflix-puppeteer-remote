const regex = /https:\/\/.*\.netflix\.com\/.*/;
//const serviceName = 'netflix';

const netflixService = {
    isMatchingPage: (url) => regex.test(url),
    handlePage: async (page, email, password, autoplay) => {
        await NetflixLogin(page, email, password);
        const buttonSelector = '[data-uia="mini-modal-controls"] a[data-uia="play-button"]';
        // Need to wait for it first, just clicking fails.
        await page.waitForSelector(buttonSelector);
        if (autoplay) {
            console.log("Trying to click play button.");
            await page.click(buttonSelector);
            console.log('Clicked play button');
        } else {
            await page.focus(buttonSelector);
            console.log('Focused play button');
        }
    }
}

module.exports = netflixService;

async function getSignInButton(page) {
    const rgBtn = await Promise.all([
        page.$('#signIn'),
        page.$('[data-uia=header-login-link]')
    ]);
    return rgBtn[0] || rgBtn[1];
}

async function FNetflixLoggedIn(page) {
    const btn = await getSignInButton(page);
    return !btn;
}

async function NetflixLogin(page, email, password) {
    if (!await FNetflixLoggedIn(page)) {
        const signInButton = await getSignInButton(page);
        await Promise.all([
            page.waitForNavigation(),
            signInButton.click()
        ]);
        // This is a react page, so fill, or text by itself doesn't suffice if there is an old entry saved.
        await page.click('form input[name="userLoginId"]', { clickCount: 3 });
        await page.type('form input[name="userLoginId"]', email);
        await page.click('form input[name="password"]', { clickCount: 3 });
        await page.type('form input[name="password"]', password);
        //await page.locator('form input[name="userLoginId"]').fill(email);
        //await page.locator('form input[name="password"]').fill(password);
        await Promise.all([
            page.waitForNavigation(),
            page.click('form button[type="submit"]')
        ]);
    }
    // Click on profile (if there), just do the first one for now.
    const profileButton = await page.$('a.profile-link');
    console.log("Checking for profile link...");
    if (profileButton) {
        console.log("Clicking on profile link.");
        await page.click('a.profile-link');
    }
}