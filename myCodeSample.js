  //const browser2 = await puppeteer.launch({ headless: 'new',  args: ['--no-sandbox', '--disable-notifications']}); // Launch headless Chrome
  const browser2 = await puppeteer.launch({ headless: false,  args: ['--no-sandbox', '--disable-notifications']}); // Launch headless Chrome
  const page2 = await browser2.newPage(); // Create a new page
  await page2.setViewport({
    width: 1200,
    height: 800,
    deviceScaleFactor: 1,
  });
  var cookies;
  
  haveCookies = false;
  
  const context = browser2.defaultBrowserContext();
  context.overridePermissions("https://www.facebook.com", ["geolocation", "notifications"]);
  
  facebookcookies: try
  {
      // Facebook cookies
      try
      {
        cookies = JSON.parse(await fs.readFile('./facebook_cookies.json'));
        await page2.setCookie(...cookies);
        haveCookies = true;
        //await page.goto("https://www.facebook.com", {timeout: 90000});
        //await page.waitForNavigation();
        //await page2.waitForTimeout(5000);        
      }
      catch(e)
      {
        console.log("Could not read Facebook cookies file or set Facebook cookies: " + e);
        
        haveCookies = false;
        
        console.log("Will try to login explicitly...");
        
        try
        {
          // Facebook Login
          await page2.goto("https://www.facebook.com", {waitUntil: 'networkidle2'});
          await page2.waitForSelector('[name="email"]');
          await page2.type('[name="email"]', "dilhes@outlook.com");
        
          // Wait for the password input field to appear
          await page2.waitForSelector('[type="password"]', { visible: true });
          await page2.type('[type="password"]', "eairugTRJS53648");
        
          await page2.click('[name="login"]');
          await sleep(60000);
          //await page.waitForNavigation();
          //await page.waitForTimeout(10000);
          
          // Write cookies as JSON file:
          cookies = await page2.cookies();
          try
          {
            await fs.writeFile('facebook_cookies.json', JSON.stringify(cookies));
            console.log("Facebook cookies saved to file");
          }
          catch(e)
          {
            console.log("Could not write Facebook cookies file: " + e);
          }        
        
          console.log("Facebook login successful and cookies saving successful!");
        }
        catch (e)
        {
          console.log("Error while trying to login to Facebook:", e);
        }         
      }
  }
  catch (e)
  {
    console.log("Error while handling cookies loading or login:", e);
  } 