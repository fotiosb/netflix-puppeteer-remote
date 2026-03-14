/*
import puppeteer from 'puppeteer-core';
//import puppeteer from 'puppeteer-extra';

// puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
//const StealthPlugin = require('puppeteer-extra-plugin-stealth');
//puppeteer.use(StealthPlugin());

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

await page.goto('https://www.netflix.com/watch/81665878');

////////////////////////////////////////////////////////////////////////////

//await chromeBrowser.close();
*/


import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserPrefsPlugin from 'puppeteer-extra-plugin-user-preferences';

puppeteer.use(
  UserPrefsPlugin({
    userPrefs: {
      'credentials_enable_service': false
    }
  })
);
puppeteer
	.use(StealthPlugin())
	.use(UserPrefsPlugin({userPrefs: {'credentials_enable_service': false}}))	
	.launch({ headless: false,
			args: ['--disable-notifications', '--disable-save-password-bubble', '--disable-infobars', '--dismiss-dialogs', '--password-store=basic'],
			//args: ['--disable-notifications', '--disable-infobars', '--dismiss-dialogs'],
			ignoreDefaultArgs: ["--enable-automation", "--disable-blink-features=AutomationControlled"],
			//ignoreDefaultArgs: ["--disable-blink-features=AutomationControlled"],
			channel: 'chrome'})
	.then(async browser => {
		//const page = await browser.newPage();

		var languageMenuOpen = false;
		var menuSidesPosition     = null;
		var menuLanguagesPosition = null;
		var menuSubtitlesPosition = null;
		var selectedLanguagePos = null;
		var selectedSubtitlesPos = null;
		var pos = null;
		
		const [page] = await browser.pages();
		await page.goto('https://www.netflix.com/login');
		// Set screen size.
		await page.setViewport({width: 800, height: 600});
		//await page.waitForTimeout(5000);
		//await page.screenshot({ path: 'stealth.png', fullPage: true })
		await page.type('input[name="userLoginId"]', 'alexfotios@gmail.com');
		await page.type('input[name="password"]', 'kwbshDPCKE^)#%6149');
		await page.keyboard.press('Enter');	
		await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0 });
		//await page.goto('https://www.netflix.com/watch/81665878');
		//await page.goto('https://www.netflix.com/watch/81770874');
		await page.goto('https://www.netflix.com/watch/70217908');
		//await page.waitForNavigation();
		
		async function toggleLanguageMenu()
		{
			await page.keyboard.press('w'); //Raise the main menu
			//await page.click('path[fill-rule="evenodd"][clip-rule="evenodd"]');
						
			//Open the language and subtitles menu
			const rdata = await page.evaluate(async () => {
				//const mbuttons = document.querySelectorAll('div[role="button"][tabindex="0"]:not([aria-label])');
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				//const mbutton = mbuttons[dbuttons.length - 1];
				
				const mbutton0 = mbuttons[0];
				//mbutton0.style.border = "solid 2px red";
				//mbutton0.style.display = "none";
				
				const mbutton1 = mbuttons[1];
				//mbutton1.style.border = "solid 2px red";
				//mbutton1.style.display = "none";			
				
				const mbutton2 = mbuttons[2];
				//mbutton2.style.border = "solid 2px red";
				//mbutton2.style.display = "none";			
				
				const mbutton3 = mbuttons[3];
				//mbutton3.style.border = "solid 2px red";
				//mbutton3.style.display = "none";
				
				const mbutton4 = mbuttons[4];
				//mbutton4.style.border = "solid 2px red";
				//mbutton4.style.display = "none";
				
				const mbutton5 = mbuttons[5];
				//mbutton5.style.border = "solid 2px red";
				//mbutton5.style.display = "none";
				
				const mbutton6 = mbuttons[6];
				//mbutton6.style.border = "solid 2px red";
				//mbutton6.style.display = "none";
				
				const mbutton7 = mbuttons[7];
				//mbutton7.style.border = "solid 2px red";			
				//mbutton7.style.display = "none";
				
				const len = mbuttons.length;
				//mbutton.click();
				//mbutton.press('Enter');
				
				//const coord = await mbutton.clickablePoint();
				//const eHTML = mbutton.outerHTML;
				
				//const domrect = mbutton.getBoundingClientRect();
				//const x = mbutton.style
				const {x, y} = mbutton5.getBoundingClientRect();
				return {x, y, len};
			});

			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5); //Hover over language menu to open it
			//await page.mouse.down();
			//await page.mouse.up();
			
			await sleep(3000);
			
			const rdata2 = await page.evaluate(async () => {
				/*
				async function sleep(ms) {
					return new Promise(resolve => setTimeout(resolve, ms));
				}
				await sleep(1000);
				*/
				const lmenus = document.querySelectorAll('div[data-uia="selector-audio-subtitle"]');
				if (lmenus.length > 0)
				{
					const lmenu = lmenus[0];
					const {x, y} = lmenu.getBoundingClientRect();
					return {x, y};
				}
				else{
					return null;
				}
			});
			
			if (!rdata2) return;
			
			console.log("lmenu x = " + rdata2.x);
			console.log("lmenu y = " + rdata2.y);
			//await page.mouse.move(rdata2.x + 20, rdata2.y + 20); //Move the mouse pointer within the opened Language menu (does not affect physical pointer)
			
			const rdata3 = await page.evaluate(async () => {
				if (typeof lmenuopen === 'undefined')
				{
					let lmenuopen = true;
				}
				else
				{
					lmenuopen = true;
				}
				
				const lmenu = document.querySelectorAll('div[data-uia="selector-audio-subtitle"]')[0];
				
				const pel1 = lmenu.parentElement;
				const pel2 = pel1.parentElement;
				
				//const mpoint = document.querySelectorAll('div[id="appMountPoint"]')[0];

                ///////////////////////////////////////////////////////////////////////////////
				/*
				const bubblingEvents = [
					'click', 'auxclick', 'dblclick', 'mousedown', 'mouseup',
					'mousemove', 'mouseover', 'mouseout', 'contextmenu', 'wheel'
				];
  
				const nonBubblingEvents = ['mouseenter', 'mouseleave'];
				*/
				///////////////////////////////////////////////////////////////////////////////
				// Global flag to control removal (initially false, meaning protect)
				let allowRemoval = false;

				// Remember the original position (next sibling for re-insertion)
				let protectedElement1 = pel1;
				let protectedElement2 = pel2;
				
				let originalParent1 = pel1.parentElement;
				let originalNextSibling1 = pel1.nextSibling;
				
				let originalParent2 = pel2.parentElement;
				let originalNextSibling2 = pel2.nextSibling;				

				// Set up the observer
				let observer = new MutationObserver((mutations) => {
				  mutations.forEach((mutation) => {
					if (mutation.type === 'childList') {
					  mutation.removedNodes.forEach((node) => {
						if (node === protectedElement1 && !allowRemoval) {
						  // Re-insert at original position
						  originalParent1.insertBefore(protectedElement1, originalNextSibling1);
						}
						else if (node === protectedElement2 && !allowRemoval) {
						  // Re-insert at original position
						  originalParent2.insertBefore(protectedElement2, originalNextSibling2);
						}
					  });
					}
				  });
				});

				// Observe the parent for child changes
				observer.observe(originalParent1, { childList: true });
				observer.observe(originalParent2, { childList: true });				
				///////////////////////////////////////////////////////////////////////////////

				languageMenuOpen = true;
				menuSidesPosition     = null;			
				menuLanguagesPosition = null;
				menuSubtitlesPosition = null;
				pos = null;				
			});
			
			processNextMenuItem("whatever");
		}
				
		function showMetrics()
		{
			console.log("------------------------------------------------------------");
			console.log("languageMenuOpen = " + languageMenuOpen);
			console.log("menuSidesPosition = " + menuSidesPosition);
			console.log("menuLanguagesPosition = " +  menuLanguagesPosition);
			console.log("menuSubtitlesPosition = " + menuSubtitlesPosition);
			console.log("pos = " + pos);			
		}

		async function processNextMenuItem(keyName)
		{
			console.log("In processNextMenuItem() with keyName = " + keyName);
			showMetrics();
			
			const rdata = await page.evaluate(async () => {
				const lmenus = document.querySelectorAll('div[data-uia="selector-audio-subtitle"]');
				
				if (lmenus.length > 0)
				{
					const lmenu = lmenus[0];
					//console.log("lmenu.outerHTML = " + lmenu.outerHTML);
					
					const msides = lmenu.querySelectorAll('ul');
					console.log("msides.length = " + msides.length);
					const sidesArray = Array.from(msides).map(ul => [ul.getBoundingClientRect().x, ul.getBoundingClientRect().y]);
					
					const languages = msides[0].querySelectorAll('li');
					console.log("languages.length = " + languages.length);
					
					var i = 0;
					
					for (const lang of languages) {
					  const outerHTML = lang.outerHTML.toLowerCase();
					  if (outerHTML.includes('selected') || outerHTML.includes('checkmark')) {
						console.log('Selected language index:' + i);
						selectedLanguagePos = i;
					  }
					  i++;
					}
					i = 0;

					const languagesArray = Array.from(languages).map(li => [li.getBoundingClientRect().x, li.getBoundingClientRect().y]);								
					const subtitles = msides[1].querySelectorAll('li');
					console.log("subtitles.length = " + subtitles.length);
					
					for (const sub of subtitles) {
					  const outerHTML = sub.outerHTML.toLowerCase();
					  if (outerHTML.includes('selected') || outerHTML.includes('checkmark')) {
						console.log('Selected subtitles index:' + i);
						selectedSubtitlesPos = i;
					  }
					  i++;
					}
					i = 0;					
										
					const subtitlesArray = Array.from(subtitles).map(li => [li.getBoundingClientRect().x, li.getBoundingClientRect().y]);
					
					
					return {sidesArray, languagesArray, subtitlesArray, selectedLanguagePos, selectedSubtitlesPos};
				}
				else
				{
					return null;
				}
			});
			
			if (!rdata) return;

            console.log("Found the elements in the Languages menu!");			
			
			if (keyName === '"ArrowLeft"' || keyName === '"ArrowRight"')
			{
				console.log("processNextMenuItem received this key: " + keyName);
				console.log("Will process menu sides");
				console.log("Sides: " + JSON.stringify(rdata));
				showMetrics();
				
				if (menuSidesPosition === null || typeof(menuSidesPosition) === 'undefined')
				{
					await page.mouse.move(rdata.sidesArray[0][0] + 5, rdata.sidesArray[0][1] + 5);
					menuSidesPosition = 0;
					if (menuLanguagesPosition === null) menuLanguagesPosition = 0;
				}					
				else if (menuSidesPosition === 0)
				{
					await page.mouse.move(rdata.sidesArray[1][0] + 5, rdata.sidesArray[1][1] + 5);
					menuSidesPosition = 1;
					if (menuSubtitlesPosition === null) menuSubtitlesPosition = 0;
					pos = 0;
					menuSubtitlesPosition = 0;
				}
				else
				{
					await page.mouse.move(rdata.sidesArray[0][0] + 5, rdata.sidesArray[0][1] + 5);
					menuSidesPosition = 0;
					if (menuLanguagesPosition === null) menuLanguagesPosition = 0;
					pos = 0;
					menuLanguagesPosition = 0
				}
				
				console.log("After processing Left or Right arrow key...");
				showMetrics();			
			}
			else if (keyName === '"ArrowUp"')
			{
				console.log("processNextMenuItem received this key: " + keyName);
				console.log("Will go up one position");
				showMetrics();
				
				if (menuSidesPosition === null || typeof(menuSidesPosition) === 'undefined')
				{
					pos = 0;
					if (pos === -1) pos = rdata.languagesArray.length - 1;
					//await page.mouse.move(languageBoxes[pos].x + 5, languageBoxes[pos].y + 5);
					await page.mouse.move(rdata.languagesArray[pos][0] + 5, rdata.languagesArray[pos][1] + 5);
					menuLanguagesPosition = pos;					
				}					
				else if (menuSidesPosition === 0)
				{
					pos = menuLanguagesPosition - 1;
					if (pos === -1) pos = rdata.languagesArray.length - 1;
					//await page.mouse.move(languageBoxes[pos].x + 5, languageBoxes[pos].y + 5);
					await page.mouse.move(rdata.languagesArray[pos][0] + 5, rdata.languagesArray[pos][1] + 5);
					menuLanguagesPosition = pos;
				}
				else
				{
					pos = menuSubtitlesPosition - 1;
					if (pos === -1) pos = rdata.subtitlesArray.length - 1;
					//await page.mouse.move(subtitleBoxes[pos].x + 5, subtitleBoxes[pos].y + 5);
					await page.mouse.move(rdata.subtitlesArray[pos][0] + 5, rdata.subtitlesArray[pos][1] + 5);
					menuSubtitlesPosition = pos;				
				}
				
				console.log("After processing Up arrow key...");
				showMetrics();						
			}
			else if (keyName === '"ArrowDown"')
			{
				console.log("processNextMenuItem received this key: " + keyName);
				console.log("Will go down one position");
				showMetrics();
				
				if (menuSidesPosition === null || typeof(menuSidesPosition) === 'undefined')
				{
					pos = 0;
					//if (pos === -1) pos = rdata.languagesArray.length - 1;
					//await page.mouse.move(languageBoxes[pos].x + 5, languageBoxes[pos].y + 5);
					await page.mouse.move(rdata.languagesArray[pos][0] + 5, rdata.languagesArray[pos][1] + 5);
					menuLanguagesPosition = pos;					
				}					
				else if (menuSidesPosition === 0)
				{
					pos = menuLanguagesPosition + 1;
					if (pos === rdata.languagesArray.length) pos =  0;
					//await page.mouse.move(languageBoxes[pos].x + 5, languageBoxes[pos].y + 5);
					await page.mouse.move(rdata.languagesArray[pos][0] + 5, rdata.languagesArray[pos][1] + 5);
					menuLanguagesPosition = pos;
				}
				else
				{
					pos = menuSubtitlesPosition + 1;
					if (pos === rdata.subtitlesArray.length) pos = 0;
					//await page.mouse.move(subtitleBoxes[pos].x + 5, subtitleBoxes[pos].y + 5);
					await page.mouse.move(rdata.subtitlesArray[pos][0] + 5, rdata.subtitlesArray[pos][1] + 5);
					menuSubtitlesPosition = pos;				
				}
				
				console.log("After processing Down arrow key...");
				showMetrics();						
			}
			else if (keyName === '"Enter"')
			{
				console.log("processNextMenuItem received this key: " + keyName);
				console.log("Will select currently highlighted menu item");				
				await page.mouse.down();
				await page.mouse.up();
				await sleep(1000);
				closeMenu();				
			}
			else
			{
				console.log("Running processNextMenuItem(keyName ) with keyName being \"whatever\"");
				console.log("selectedSubtitlesPos = " + rdata.selectedSubtitlesPos);
				console.log("rdata.subtitlesArray[selectedSubtitlesPos][0] = " + rdata.subtitlesArray[rdata.selectedSubtitlesPos][0]);
				console.log("rdata.subtitlesArray[selectedSubtitlesPos][1] = " + rdata.subtitlesArray[rdata.selectedSubtitlesPos][1]);
				console.log("rdata.languagesArray[selectedLanguagePos][0] = " + rdata.languagesArray[rdata.selectedLanguagePos][0]);
				console.log("rdata.languagesArray[selectedLanguagePos][1] = " + rdata.languagesArray[rdata.selectedLanguagePos][1]);
				
				if (rdata.selectedSubtitlesPos >= 0)
				{
					await page.mouse.move(rdata.subtitlesArray[rdata.selectedSubtitlesPos][0] + 5, rdata.subtitlesArray[rdata.selectedSubtitlesPos][1] + 5);
					menuSubtitlesPosition = rdata.selectedSubtitlesPos;
					pos = rdata.selectedSubtitlesPos;
				}
				
				if (rdata.selectedLanguagePos >= 0)
				{
					await page.mouse.move(rdata.subtitlesArray[rdata.selectedLanguagePos][0] + 5, rdata.subtitlesArray[rdata.selectedLanguagePos][1] + 5);
					menuLanguagesPosition = rdata.selectedLanguagePos;
					pos = rdata.selectedLanguagePos;					
				}

				showMetrics();					
			}
			
		}
		
		async function increaseVolume()
		{
			await page.keyboard.press('w'); //Raise the main menu
			//await page.click('path[fill-rule="evenodd"][clip-rule="evenodd"]');
			
			//Open the language and subtitles menu
			const rdata = await page.evaluate(async () => {
				//const mbuttons = document.querySelectorAll('div[role="button"][tabindex="0"]:not([aria-label])');
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				//const mbutton = mbuttons[dbuttons.length - 1];
				
				const mbutton4 = mbuttons[4];
				//mbutton4.style.border = "solid 2px red";
				//mbutton4.style.display = "none";
				
				const len = mbuttons.length;

				const {x, y} = mbutton4.getBoundingClientRect();
				return {x, y, len};
			});

			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await sleep(1000);
			//await page.mouse.down();
			//await page.mouse.up();
			await page.keyboard.press('ArrowUp');
			await page.mouse.move(0, 0);			
		}		

		async function decreaseVolume()
		{
			await page.keyboard.press('w'); //Raise the main menu
			//await page.click('path[fill-rule="evenodd"][clip-rule="evenodd"]');
			
			//Open the language and subtitles menu
			const rdata = await page.evaluate(async () => {
				//const mbuttons = document.querySelectorAll('div[role="button"][tabindex="0"]:not([aria-label])');
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				//const mbutton = mbuttons[dbuttons.length - 1];
				
				const mbutton4 = mbuttons[4];
				//mbutton4.style.border = "solid 2px red";
				//mbutton4.style.display = "none";
				
				const len = mbuttons.length;

				const {x, y} = mbutton4.getBoundingClientRect();
				return {x, y, len};
			});

			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await sleep(1000);
			//await page.mouse.down();
			//await page.mouse.up();
			await page.keyboard.press('ArrowDown');
			await page.mouse.move(0, 0);
		}

		async function gotoMainPage()
		{
			await page.keyboard.press('w'); //Raise the main menu
			//await page.click('path[fill-rule="evenodd"][clip-rule="evenodd"]');
			
			//Open the language and subtitles menu
			const rdata = await page.evaluate(async () => {
				//const mbuttons = document.querySelectorAll('div[role="button"][tabindex="0"]:not([aria-label])');
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				//const mbutton = mbuttons[dbuttons.length - 1];
				
				const mbutton0 = mbuttons[0];
				
				const len = mbuttons.length;

				const {x, y} = mbutton0.getBoundingClientRect();
				return {x, y, len};
			});

			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await page.mouse.down();
			await page.mouse.up();
			//await page.keyboard.press('ArrowUp');
			//await page.mouse.move(0, 0);			
		}

		async function psToggle()
		{
			await page.keyboard.press('Space');
		}
		
		async function closeMenu()
		{
			await page.mouse.move(0, 0);
			
			const rdata = await page.evaluate(async () => {
				if (typeof lmenuopen === 'undefined')
				{
					let lmenuopen = false;
				}
				else
				{
					lmenuopen = false;
				}
				
				const lmenu = document.querySelectorAll('div[data-uia="selector-audio-subtitle"]')[0];
				
				const pel1 = lmenu.parentElement;
				const pel2 = pel1.parentElement;
				
				observer.disconnect();
				
				allowRemoval = true;
				if (pel2) pel2.remove();
				if (pel1) pel1.remove();
				if (lmenu) lmenu.remove();
				allowRemoval = false;
				
			});			
			
			languageMenuOpen = false;
			menuSidesPosition     = null;			
			menuLanguagesPosition = null;
			menuSubtitlesPosition = null;
            pos = null;		
		}

		async function fsToggle()
		{
			await page.keyboard.press('f');
		}		
		
		async function playBackSpeed050()
		{
			await page.keyboard.press('w'); //Raise the main menu
			await sleep(2000);
			//Open the playback speed menu
			const rdata = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				const mbutton6 = mbuttons[6];
				//mbutton6.style.display = "none";
				const len = mbuttons.length;
				const {x, y} = mbutton6.getBoundingClientRect();
				return {x, y, len};
			});
            			
			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await sleep(2000);
			
			const rdata2 = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('div[data-uia^="playback-speed-item"][role="button"]');
				//const len = mbuttons.length;
				
				//const t = new Array();
				
				mbuttons[0].click();			
				
				//const {x, y} = mbutton6.getBoundingClientRect();
				//return {x, y, len};
				//return {t};
			});			
			
			
			//var len = rdata2.t.length;
			//for (var i = 0; i < len; i++)
			//{
				//console.log("rdata2.t[" + i + "] =" + rdata2.t[i]);
			//	if (rdata2.t[i].indexOf("0.5x") > -1)
			//	{
			//	}
			//}
			
			//await page.keyboard.press('Tab');
			//await page.keyboard.press('Enter');
			
			await page.mouse.move(0, 0);
		}
		
		async function playBackSpeed075()
		{
			await page.keyboard.press('w'); //Raise the main menu
			await sleep(2000);			
			//Open the playback speed menu
			const rdata = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				const mbutton6 = mbuttons[6];
				const len = mbuttons.length;
				const {x, y} = mbutton6.getBoundingClientRect();
				return {x, y, len};
			});
            			
			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await sleep(2000);
			
			const rdata2 = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('div[data-uia^="playback-speed-item"][role="button"]');
				//const len = mbuttons.length;

				mbuttons[1].click();				
			});			
			
			await page.mouse.move(0, 0);			
		}

		async function playBackSpeed100()
		{
			await page.keyboard.press('w'); //Raise the main menu
			await sleep(2000);
			
			//Open the playback speed menu
			const rdata = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				const mbutton6 = mbuttons[6];
				const len = mbuttons.length;
				const {x, y} = mbutton6.getBoundingClientRect();
				return {x, y, len};
			});
            			
			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await sleep(2000);
			
			const rdata2 = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('div[data-uia^="playback-speed-item"][role="button"]');
				//const len = mbuttons.length;
				
				mbuttons[2].click();
			});			
			
			await page.mouse.move(0, 0);			
		}

		async function playBackSpeed125()
		{
			await page.keyboard.press('w'); //Raise the main menu
			await sleep(2000);
			
			//Open the playback speed menu
			const rdata = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				const mbutton6 = mbuttons[6];
				const len = mbuttons.length;
				const {x, y} = mbutton6.getBoundingClientRect();
				return {x, y, len};
			});
            			
			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await sleep(2000);
			
			const rdata2 = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('div[data-uia^="playback-speed-item"][role="button"]');
				//const len = mbuttons.length;
				
				mbuttons[3].click();				
			});			
			
			await page.mouse.move(0, 0);			
		}
		
		async function playBackSpeed150()
		{
			await page.keyboard.press('w'); //Raise the main menu
			await sleep(2000);
			
			//Open the playback speed menu
			const rdata = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
				const mbutton6 = mbuttons[6];
				const len = mbuttons.length;
				const {x, y} = mbutton6.getBoundingClientRect();
				return {x, y, len};
			});
            			
			//console.log("mbutton outerHTML = " + rdata.eHTML);
			console.log("number of mbuttons = " + rdata.len);
			console.log("mbutton x = " + rdata.x);
			console.log("mbutton y = " + rdata.y);
			await page.mouse.move(rdata.x + 5, rdata.y + 5);
			await sleep(2000);
			
			const rdata2 = await page.evaluate(async () => {
				const mbuttons = document.querySelectorAll('div[data-uia^="playback-speed-item"][role="button"]');
				//const len = mbuttons.length;
				
				mbuttons[4].click();					
			});			
			
			await page.mouse.move(0, 0);			
		}		
		
		await page.exposeFunction("callPuppeteer", function(data, state) {
			var mytype = typeof data;
			console.log(mytype);
			var data2 = JSON.stringify(data).toString().trim();
			console.log("data2 is: ", data2);
			
			var mytype2 = typeof state;
			console.log(mytype2);
			var state2 = JSON.stringify(state).toString().trim();
			console.log("state2, meaning \"language menu open state\" is: ", state2);

			if (state2.indexOf('true') > -1)
			{
				console.log("Language menu is open");
				languageMenuOpen = true;
			}
			else
			{
				console.log("Language menu is closed");
				languageMenuOpen = false;
				//await page.mouse.move(0, 0);				
				//page.mouse.move(0, 0);
			}
			
			if (languageMenuOpen && data2 === '"n"')
			{
				console.log("Will open language menu after \"n\" is pressed");
				toggleLanguageMenu();
			}
			else if (languageMenuOpen && data2 === '"w"')
			{
				//await page.keyboard.press('w');
			}				
			else if (languageMenuOpen && (data2.indexOf("Arrow") > 0 || data2 === '"Enter"'))
			{
				console.log("Menu is open and key pressed matches so processNextMenuItem() will be called");
				processNextMenuItem(data2);
			}			
			
			if (data2 === '"a"')
			{
				console.log("Pup will press the Left Arrow key in page");
				page.keyboard.press('ArrowLeft');
			}
			else if (data2 === '"s"')
			{
				console.log("Pup will press the Right Arrow key in page");
				page.keyboard.press('ArrowRight');
			}
			/*
			else if (data2 === '"n"')
			{
				toggleLanguageMenu();			
			}
			*/
			else if (data2 === '"+"')
			{
				increaseVolume();
			}
			else if (data2 === '"-"')
			{
				decreaseVolume();
			}
			else if (data2 === '"Backspace"')
			{
				gotoMainPage();
			}
			else if (data2 === '"z"')
			{
				psToggle();
			}
			else if (data2 === '"x"')
			{
				closeMenu();
			}
			else if (data2 === '"o"')
			{
				fsToggle();
			}
			else if (data2 === '"1"')
			{
				playBackSpeed050();
			}
			else if (data2 === '"2"')
			{
				playBackSpeed075();
			}
			else if (data2 === '"3"')
			{
				playBackSpeed100();
			}
			else if (data2 === '"4"')
			{
				playBackSpeed125();
			}
			else if (data2 === '"5"')
			{
				playBackSpeed150();
			}	

			
			//else
			//{
				//languageMenuOpen = false;
				//await page.mouse.move(0, 0);
			//}
			
			//- Menu button HTML
			//<path fill-rule="evenodd" clip-rule="evenodd" d="M1 3C1 2.44772 1.44772 2 2 2H22C22.5523 2 23 2.44772 23 3V17C23 17.5523 22.5523 18 22 18H19V21C19 21.3688 18.797 21.7077 18.4719 21.8817C18.1467 22.0557 17.7522 22.0366 17.4453 21.8321L11.6972 18H2C1.44772 18 1 17.5523 1 17V3ZM3 4V16H12H12.3028L12.5547 16.1679L17 19.1315V17V16H18H21V4H3ZM10 9L5 9V7L10 7V9ZM19 11H14V13H19V11ZM12 13L5 13V11L12 11V13ZM19 7H12V9H19V7Z" fill="currentColor"></path>		
			
		});

		await page.evaluate(async () => {
			console.log("Will add keyup event listener");
			let lmenuopen = false;
			
			document.addEventListener("keyup",(event) => {
				console.log("pageEventListener says that lmenuopen = " + lmenuopen);
				const keyName = event.key;
				console.log("keyup is: " + keyName);
				
				const lmenu = document.querySelectorAll('div[data-uia="selector-audio-subtitle"]');
				console.log("lmenu.length = " + lmenu.length);
				if (lmenu.length > 0 || keyName === 'n')
				{
					event.stopImmediatePropagation();
					event.stopPropagation();
					event.preventDefault();					
					lmenuopen = true;
					callPuppeteer(keyName, true);
				}
				else if (lmenu.length > 0 && (keyName.indexOf("Arrow") > -1 || keyName === 'Enter'))
				{
					event.stopImmediatePropagation();
					event.stopPropagation();
					event.preventDefault();
					lmenuopen = true;
					callPuppeteer(keyName, true);
				}
				else if (keyName === 'w')
				{
					//await page.mouse.move(0, 0);
					//lmenuopen = false;
					//callPuppeteer(keyName, true);
				}
				else
				{
					lmenuopen = false;
					callPuppeteer(keyName, false);				
				}
				
			});
			
		});
		
		//await browser.close();
		
	});


async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
