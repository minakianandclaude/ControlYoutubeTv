/**
 * Debug Launch Script
 *
 * This script helps identify where the launch process is hanging.
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

function findChromeExecutable(): string | undefined {
  const platform = os.platform();
  const paths: Record<string, string[]> = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ],
  };

  const candidates = paths[platform] || [];
  for (const chromePath of candidates) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  return undefined;
}

async function main() {
  console.log('=== Debug Launch Script ===');
  console.log('Platform:', os.platform());
  console.log('');

  // Step 1: Find Chrome
  console.log('[1/5] Looking for Chrome executable...');
  const chromePath = findChromeExecutable();
  if (chromePath) {
    console.log('      Found:', chromePath);
  } else {
    console.log('      Not found - will use Playwright bundled browser');
  }
  console.log('');

  // Step 2: Create fresh profile directory
  console.log('[2/5] Creating fresh profile directory...');
  const profileDir = path.join(process.cwd(), '.youtube-tv-debug-profile');
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  console.log('      Profile:', profileDir);
  console.log('');

  // Step 3: Launch browser
  console.log('[3/5] Launching browser (this may take a moment)...');
  const launchStart = Date.now();

  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      executablePath: chromePath,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
      ],
      viewport: { width: 1280, height: 720 },
    });

    console.log('      Launched in', Date.now() - launchStart, 'ms');
    console.log('');

    // Step 4: Get page
    console.log('[4/5] Getting page...');
    const page = context.pages()[0] || await context.newPage();
    console.log('      Page ready');
    console.log('');

    // Step 5: Navigate
    console.log('[5/5] Navigating to YouTube TV...');
    const navStart = Date.now();
    await page.goto('https://tv.youtube.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('      Loaded in', Date.now() - navStart, 'ms');
    console.log('');

    console.log('=== SUCCESS ===');
    console.log('Browser launched and YouTube TV loaded!');
    console.log('');
    console.log('Current URL:', page.url());
    console.log('');
    console.log('Browser will close in 10 seconds...');

    await new Promise(resolve => setTimeout(resolve, 10000));
    await context.close();

  } catch (error) {
    console.log('');
    console.log('=== ERROR ===');
    console.error(error);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure Chrome is completely closed');
    console.log('2. Try deleting:', profileDir);
    console.log('3. Check if you have Chrome installed');
  }
}

main();
