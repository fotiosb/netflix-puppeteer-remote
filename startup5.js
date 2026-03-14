// ============================================================
// Netflix Remote Control via Puppeteer
// Main entry point — startup5.js
// ============================================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserPrefsPlugin from 'puppeteer-extra-plugin-user-preferences';

puppeteer.use(StealthPlugin());
puppeteer.use(UserPrefsPlugin({ userPrefs: { 'credentials_enable_service': false } }));

puppeteer
  .launch({
    headless: false,
    args: [
      '--disable-notifications',
      '--disable-save-password-bubble',
      '--disable-infobars',
      '--dismiss-dialogs',
      '--password-store=basic',
    ],
    ignoreDefaultArgs: ['--enable-automation', '--disable-blink-features=AutomationControlled'],
    channel: 'chrome',
  })
  .then(async (browser) => {

    // ── Puppeteer-side state ─────────────────────────────────────────────────
    let languageMenuOpen      = false;
    let menuSidesPosition     = null;   // 0 = audio/language panel, 1 = subtitles panel
    let menuLanguagesPosition = null;
    let menuSubtitlesPosition = null;
    let pos                   = null;

    // ── Page setup ───────────────────────────────────────────────────────────
    const [page] = await browser.pages();
    await page.setDefaultNavigationTimeout(60000);
    await page.goto('https://www.netflix.com/login');
    await page.setViewport({ width: 800, height: 600 });

    // TODO: Replace with your credentials (or load from .env)
    await page.type('input[name="userLoginId"]', 'YOUR_EMAIL@example.com');
    await page.type('input[name="password"]', 'YOUR_PASSWORD');
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0 });
    await page.goto('https://www.netflix.com/watch/70217908');

    // ── Debug helper ─────────────────────────────────────────────────────────
    function showMetrics() {
      console.log('------------------------------------------------------------');
      console.log('languageMenuOpen      =', languageMenuOpen);
      console.log('menuSidesPosition     =', menuSidesPosition);
      console.log('menuLanguagesPosition =', menuLanguagesPosition);
      console.log('menuSubtitlesPosition =', menuSubtitlesPosition);
      console.log('pos                   =', pos);
    }

    // ── Open the audio / subtitle panel ─────────────────────────────────────
    async function toggleLanguageMenu() {
      await page.keyboard.press('w');

      const iconPos = await page.evaluate(() => {
        const paths = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
        if (paths.length < 6) return null;
        const { x, y } = paths[5].getBoundingClientRect();
        return { x, y, count: paths.length };
      });

      if (!iconPos) { console.log('toggleLanguageMenu: subtitle icon not found'); return; }
      console.log(`Icon count=${iconPos.count}  x=${iconPos.x}  y=${iconPos.y}`);

      await page.mouse.move(iconPos.x + 5, iconPos.y + 5);
      await sleep(3000);

      const panelPos = await page.evaluate(() => {
        const p = document.querySelector('div[data-uia="selector-audio-subtitle"]');
        if (!p) return null;
        const { x, y } = p.getBoundingClientRect();
        return { x, y };
      });
      if (!panelPos) { console.log('toggleLanguageMenu: panel did not appear'); return; }
      console.log(`Panel at x=${panelPos.x}  y=${panelPos.y}`);

      // ── FIX A ─────────────────────────────────────────────────────────────
      // Install a MutationObserver that re-inserts the panel whenever Netflix
      // tries to remove it due to a mouse-leave event.  The observer is stored
      // on window so it persists across evaluate() calls and can be torn down
      // intentionally in closeMenu().
      await page.evaluate(() => {
        if (window.__netflixMenuObserver) {
          window.__netflixMenuObserver.disconnect();
          window.__netflixMenuObserver = null;
        }
        window.__netflixMenuAllowRemoval = false;

        const panel = document.querySelector('div[data-uia="selector-audio-subtitle"]');
        if (!panel) return;
        const pel1 = panel.parentElement;
        const pel2 = pel1 ? pel1.parentElement : null;
        if (!pel1 || !pel2) return;

        const origParent1  = pel1.parentElement;
        const origSibling1 = pel1.nextSibling;
        const origParent2  = pel2.parentElement;
        const origSibling2 = pel2.nextSibling;

        const observer = new MutationObserver((mutations) => {
          if (window.__netflixMenuAllowRemoval) return;
          mutations.forEach((m) => {
            if (m.type !== 'childList') return;
            m.removedNodes.forEach((node) => {
              if (node === pel1 && origParent1) {
                origParent1.insertBefore(pel1, origSibling1);
                console.log('[Observer] pel1 re-inserted');
              } else if (node === pel2 && origParent2) {
                origParent2.insertBefore(pel2, origSibling2);
                console.log('[Observer] pel2 re-inserted');
              }
            });
          });
        });

        observer.observe(origParent1, { childList: true });
        if (origParent2 && origParent2 !== origParent1) {
          observer.observe(origParent2, { childList: true });
        }
        window.__netflixMenuObserver = observer;
        console.log('[Observer] installed');
      });

      languageMenuOpen      = true;
      menuSidesPosition     = null;
      menuLanguagesPosition = null;
      menuSubtitlesPosition = null;
      pos                   = null;

      // Jump cursor to current selection immediately
      await processNextMenuItem('__init__');
    }

    // ── Navigate the panel ───────────────────────────────────────────────────
    async function processNextMenuItem(keyName) {
      console.log('processNextMenuItem  key=', keyName);
      showMetrics();

      const rdata = await page.evaluate(() => {
        const panel = document.querySelector('div[data-uia="selector-audio-subtitle"]');
        if (!panel) return null;

        const sides = Array.from(panel.querySelectorAll(':scope > div'));
        if (sides.length < 2) return null;

        const langUL = sides[0].querySelector('ul');
        const subUL  = sides[1].querySelector('ul');
        if (!langUL || !subUL) return null;

        const langItems = Array.from(langUL.querySelectorAll('li'));
        const subItems  = Array.from(subUL.querySelectorAll('li'));

        const coordsOf = (li) => {
          const r = li.getBoundingClientRect();
          return { x: r.x, y: r.y, visible: r.height > 0 };
        };

        const activeIdx = (items) => {
          for (let i = 0; i < items.length; i++) {
            const h = items[i].outerHTML.toLowerCase();
            if (h.includes('selected') || h.includes('checkmark')) return i;
          }
          return 0;
        };

        return {
          sidesCoords: [
            { x: sides[0].getBoundingClientRect().x, y: sides[0].getBoundingClientRect().y },
            { x: sides[1].getBoundingClientRect().x, y: sides[1].getBoundingClientRect().y },
          ],
          langCoords: langItems.map(coordsOf),
          subCoords:  subItems.map(coordsOf),
          activeLang: activeIdx(langItems),
          activeSub:  activeIdx(subItems),
        };
      });

      if (!rdata) { console.log('processNextMenuItem: panel not found'); return; }

      // Initialise: position cursor on the currently active item
      if (keyName === '__init__') {
        const target = rdata.subCoords[rdata.activeSub] || rdata.subCoords[0];
        await page.mouse.move(target.x + 5, target.y + 5);
        menuSidesPosition     = 1;
        menuSubtitlesPosition = rdata.activeSub;
        pos                   = rdata.activeSub;
        console.log(`__init__: subtitle row ${rdata.activeSub}`);
        showMetrics();
        return;
      }

      // Left / Right — switch columns
      if (keyName === '"ArrowLeft"' || keyName === '"ArrowRight"') {
        if (menuSidesPosition === null || menuSidesPosition === 1) {
          menuSidesPosition = 0;
          if (menuLanguagesPosition === null) menuLanguagesPosition = rdata.activeLang;
          pos = menuLanguagesPosition;
          await scrollToItem(rdata.langCoords, pos, rdata.sidesCoords[0]);
        } else {
          menuSidesPosition = 1;
          if (menuSubtitlesPosition === null) menuSubtitlesPosition = rdata.activeSub;
          pos = menuSubtitlesPosition;
          await scrollToItem(rdata.subCoords, pos, rdata.sidesCoords[1]);
        }
        showMetrics();
        return;
      }

      // Up arrow
      if (keyName === '"ArrowUp"') {
        if (menuSidesPosition === null) menuSidesPosition = 1;
        if (menuSidesPosition === 0) {
          if (menuLanguagesPosition === null) menuLanguagesPosition = rdata.activeLang;
          menuLanguagesPosition = (menuLanguagesPosition - 1 + rdata.langCoords.length) % rdata.langCoords.length;
          pos = menuLanguagesPosition;
          await scrollToItem(rdata.langCoords, pos, rdata.sidesCoords[0]);
        } else {
          if (menuSubtitlesPosition === null) menuSubtitlesPosition = rdata.activeSub;
          menuSubtitlesPosition = (menuSubtitlesPosition - 1 + rdata.subCoords.length) % rdata.subCoords.length;
          pos = menuSubtitlesPosition;
          await scrollToItem(rdata.subCoords, pos, rdata.sidesCoords[1]);
        }
        showMetrics();
        return;
      }

      // Down arrow
      if (keyName === '"ArrowDown"') {
        if (menuSidesPosition === null) menuSidesPosition = 1;
        if (menuSidesPosition === 0) {
          if (menuLanguagesPosition === null) menuLanguagesPosition = rdata.activeLang;
          menuLanguagesPosition = (menuLanguagesPosition + 1) % rdata.langCoords.length;
          pos = menuLanguagesPosition;
          await scrollToItem(rdata.langCoords, pos, rdata.sidesCoords[0]);
        } else {
          if (menuSubtitlesPosition === null) menuSubtitlesPosition = rdata.activeSub;
          menuSubtitlesPosition = (menuSubtitlesPosition + 1) % rdata.subCoords.length;
          pos = menuSubtitlesPosition;
          await scrollToItem(rdata.subCoords, pos, rdata.sidesCoords[1]);
        }
        showMetrics();
        return;
      }

      // Enter — click highlighted item
      if (keyName === '"Enter"') {
        console.log('Selecting item');
        await page.mouse.down();
        await page.mouse.up();
        await sleep(1000);
        await closeMenu();
        return;
      }
    }

    // ── FIX B: scroll via scrollIntoView, not mouse.wheel ────────────────────
    // page.mouse.wheel() was moving the virtual cursor away from the highlighted
    // item and then resetting the position counter to 0.  scrollIntoView() is
    // DOM-only — it never touches the mouse position — so the highlight stays
    // correct and the position counter advances predictably.
    async function scrollToItem(coordsSnapshot, targetIdx, columnAnchor) {
      const freshPos = await page.evaluate((colX, colY, tIdx) => {
        const panel = document.querySelector('div[data-uia="selector-audio-subtitle"]');
        if (!panel) return null;

        const sides = Array.from(panel.querySelectorAll(':scope > div'));
        const col = sides.reduce((best, el) => {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.x - colX) + Math.abs(r.y - colY);
          return (!best || d < best.dist) ? { el, dist: d } : best;
        }, null)?.el;

        if (!col) return null;
        const items = Array.from(col.querySelectorAll('li'));
        if (tIdx < 0 || tIdx >= items.length) return null;

        items[tIdx].scrollIntoView({ block: 'nearest', behavior: 'instant' });
        const r = items[tIdx].getBoundingClientRect();
        return { x: r.x, y: r.y, visible: r.height > 0 };
      }, columnAnchor.x, columnAnchor.y, targetIdx);

      if (!freshPos || !freshPos.visible) {
        const fallback = coordsSnapshot[targetIdx];
        if (fallback) await page.mouse.move(fallback.x + 5, fallback.y + 5);
        return;
      }
      await page.mouse.move(freshPos.x + 5, freshPos.y + 5);
    }

    // ── Close the panel intentionally ────────────────────────────────────────
    async function closeMenu() {
      await page.evaluate(() => {
        window.__netflixMenuAllowRemoval = true;
        if (window.__netflixMenuObserver) {
          window.__netflixMenuObserver.disconnect();
          window.__netflixMenuObserver = null;
        }
        const panel = document.querySelector('div[data-uia="selector-audio-subtitle"]');
        if (!panel) return;
        const pel1 = panel.parentElement;
        const pel2 = pel1 ? pel1.parentElement : null;
        if (pel2) pel2.remove(); else if (pel1) pel1.remove(); else panel.remove();
      });
      await page.mouse.move(0, 0);
      languageMenuOpen      = false;
      menuSidesPosition     = null;
      menuLanguagesPosition = null;
      menuSubtitlesPosition = null;
      pos                   = null;
    }

    // ── Playback helpers ─────────────────────────────────────────────────────
    async function psToggle() { await page.keyboard.press('Space'); }
    async function fsToggle() { await page.keyboard.press('f'); }

    async function adjustVolume(direction) {
      await page.keyboard.press('w');
      const iconPos = await page.evaluate(() => {
        const paths = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
        if (paths.length < 5) return null;
        const { x, y } = paths[4].getBoundingClientRect();
        return { x, y };
      });
      if (!iconPos) return;
      await page.mouse.move(iconPos.x + 5, iconPos.y + 5);
      await sleep(1000);
      await page.keyboard.press(direction === 'up' ? 'ArrowUp' : 'ArrowDown');
      await page.mouse.move(0, 0);
    }

    async function gotoMainPage() {
      await page.keyboard.press('w');
      const iconPos = await page.evaluate(() => {
        const paths = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
        if (paths.length === 0) return null;
        const { x, y } = paths[0].getBoundingClientRect();
        return { x, y };
      });
      if (!iconPos) return;
      await page.mouse.move(iconPos.x + 5, iconPos.y + 5);
      await page.mouse.down();
      await page.mouse.up();
    }

    async function setPlaybackSpeed(index) {
      await page.keyboard.press('w');
      await sleep(2000);
      const iconPos = await page.evaluate(() => {
        const paths = document.querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]');
        if (paths.length < 7) return null;
        const { x, y } = paths[6].getBoundingClientRect();
        return { x, y };
      });
      if (!iconPos) return;
      await page.mouse.move(iconPos.x + 5, iconPos.y + 5);
      await sleep(2000);
      await page.evaluate((idx) => {
        const items = document.querySelectorAll('div[data-uia^="playback-speed-item"][role="button"]');
        if (items[idx]) items[idx].click();
      }, index);
      await page.mouse.move(0, 0);
    }

    // ── Bridge: page events → Puppeteer handlers ─────────────────────────────
    await page.exposeFunction('callPuppeteer', async (keyName, menuIsOpen) => {
      const key = JSON.stringify(keyName).trim();
      console.log(`callPuppeteer  key=${key}  menuIsOpen=${menuIsOpen}`);

      languageMenuOpen = !!menuIsOpen;

      if (menuIsOpen && key === '"n"') { await toggleLanguageMenu(); return; }
      if (languageMenuOpen && (key.includes('Arrow') || key === '"Enter"')) {
        await processNextMenuItem(key); return;
      }

      switch (key) {
        case '"a"':         await page.keyboard.press('ArrowLeft');  break;
        case '"s"':         await page.keyboard.press('ArrowRight'); break;
        case '"n"':         await toggleLanguageMenu();              break;
        case '"+"':         await adjustVolume('up');                break;
        case '"-"':         await adjustVolume('down');              break;
        case '"Backspace"': await gotoMainPage();                    break;
        case '"z"':         await psToggle();                        break;
        case '"x"':         await closeMenu();                       break;
        case '"o"':         await fsToggle();                        break;
        case '"1"':         await setPlaybackSpeed(0);               break; // 0.5×
        case '"2"':         await setPlaybackSpeed(1);               break; // 0.75×
        case '"3"':         await setPlaybackSpeed(2);               break; // 1×
        case '"4"':         await setPlaybackSpeed(3);               break; // 1.25×
        case '"5"':         await setPlaybackSpeed(4);               break; // 1.5×
      }
    });

    // ── Page-side key interceptor (runs inside Chrome) ────────────────────────
    await page.evaluate(() => {
      console.log('[Page] Installing keyup capture listener');
      if (window.__netflixKeyHandler) {
        document.removeEventListener('keyup', window.__netflixKeyHandler, true);
      }
      window.__netflixKeyHandler = (event) => {
        const key      = event.key;
        const menuOpen = document.querySelector('div[data-uia="selector-audio-subtitle"]') !== null;

        if (menuOpen || key === 'n') {
          event.stopImmediatePropagation();
          event.stopPropagation();
          event.preventDefault();
          callPuppeteer(key, true);
          return;
        }
        callPuppeteer(key, false);
      };
      // Capture phase so we beat Netflix's own listeners
      document.addEventListener('keyup', window.__netflixKeyHandler, true);
    });

  }); // end .then()


function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
