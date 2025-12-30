import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  YouTubeTVControllerOptions,
  PlaybackState,
  ControllerState,
  RemoteButton,
  YouTubeTVController as IYouTubeTVController,
} from './types';

const YOUTUBE_TV_URL = 'https://tv.youtube.com';

const KEY_MAPPINGS: Record<RemoteButton, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  enter: 'Enter',
  back: 'Escape',
  play: 'k',
  pause: 'k',
  playpause: 'k',
  forward: 'l',
  rewind: 'j',
  volumeUp: 'ArrowUp',
  volumeDown: 'ArrowDown',
  mute: 'm',
  captions: 'c',
  guide: 'g',
  home: 'h',
  search: '/',
  info: 'i',
  record: 'r',
  channelUp: 'PageUp',
  channelDown: 'PageDown',
};

// Common Chrome profile paths by OS
function getDefaultChromeProfilePath(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'win32':
      return path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome');
    case 'linux':
      return path.join(homeDir, '.config', 'google-chrome');
    default:
      return '';
  }
}

// Find Chrome executable path
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
    try {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

export class YouTubeTVController implements IYouTubeTVController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: Required<YouTubeTVControllerOptions> & {
    useSystemChrome: boolean;
    useChromeProfile: boolean;
    chromeProfilePath: string;
    executablePath: string;
  };

  constructor(options: YouTubeTVControllerOptions = {}) {
    this.options = {
      headless: options.headless ?? false,
      slowMo: options.slowMo ?? 0,
      userDataDir: options.userDataDir ?? '',
      viewport: options.viewport ?? { width: 1920, height: 1080 },
      timeout: options.timeout ?? 30000,
      useSystemChrome: options.useSystemChrome ?? false,
      useChromeProfile: options.useChromeProfile ?? false,
      chromeProfilePath: options.chromeProfilePath ?? getDefaultChromeProfilePath(),
      executablePath: options.executablePath ?? '',
    };
  }

  async launch(): Promise<void> {
    // Determine user data directory first
    let userDataDir = this.options.userDataDir;
    if (!userDataDir && this.options.useChromeProfile) {
      userDataDir = this.options.chromeProfilePath;
    }

    // Determine which executable to use
    // Chrome (not Chromium) is required for video codec support
    let executablePath = this.options.executablePath;
    if (!executablePath) {
      // Always try to find Chrome for codec support
      executablePath = findChromeExecutable() || '';
    }

    if (executablePath) {
      console.log('Using Chrome:', executablePath);
    } else if (userDataDir) {
      // When using persistent context, we need Chrome for codecs
      throw new Error(
        'Chrome not found. Chrome is required for video playback (codec support).\n' +
        'Please install Google Chrome or specify executablePath in options.'
      );
    } else {
      console.log('Chrome not found, using Playwright channel: chrome');
    }

    // Base launch arguments to reduce automation detection and enable codecs
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--autoplay-policy=no-user-gesture-required',
      // Prevent "Restore pages?" popup
      '--hide-crash-restore-bubble',
      '--disable-session-crashed-bubble',
      '--noerrdialogs',
      '--disable-features=InfiniteSessionRestore',
    ];

    const launchOptions: LaunchOptions = {
      headless: this.options.headless,
      slowMo: this.options.slowMo,
      args,
      // CRITICAL: Allow Chrome to download Widevine CDM for DRM video playback
      ignoreDefaultArgs: ['--disable-component-update'],
    };

    // Use Chrome executable for codec support
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    } else {
      // Fallback to channel: 'chrome' (only works without persistent context)
      launchOptions.channel = 'chrome';
    }

    // Context options for realistic browser behavior
    const contextOptions = {
      viewport: this.options.viewport,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorScheme: 'dark' as const,
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      javaScriptEnabled: true,
      bypassCSP: true,
    };

    try {
      if (userDataDir) {
        // Use persistent context (keeps login state)
        console.log('Using profile directory:', userDataDir);
        this.context = await chromium.launchPersistentContext(
          userDataDir,
          {
            ...launchOptions,
            ...contextOptions,
          }
        );
        this.page = this.context.pages()[0] || (await this.context.newPage());
      } else {
        // Use regular browser
        this.browser = await chromium.launch(launchOptions);
        this.context = await this.browser.newContext(contextOptions);
        this.page = await this.context.newPage();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // If Chrome profile is locked, suggest closing Chrome
      if (errorMessage.includes('lock') || errorMessage.includes('already in use')) {
        throw new Error(
          'Chrome profile is locked. Please close all Chrome windows and try again.\n' +
          'Original error: ' + errorMessage
        );
      }

      throw error;
    }

    // Apply stealth scripts to avoid detection
    await this.applyStealthScripts();

    this.page.setDefaultTimeout(this.options.timeout);

    // Navigate to YouTube TV
    console.log('Navigating to YouTube TV...');
    await this.page.goto(YOUTUBE_TV_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('YouTube TV loaded');
  }

  private async applyStealthScripts(): Promise<void> {
    if (!this.page) return;

    await this.page.addInitScript(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Make plugins array look real
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          const pluginArray = Object.create(PluginArray.prototype);
          plugins.forEach((p, i) => {
            const plugin = Object.create(Plugin.prototype);
            Object.defineProperties(plugin, {
              name: { value: p.name },
              filename: { value: p.filename },
              description: { value: p.description },
              length: { value: 0 },
            });
            pluginArray[i] = plugin;
          });
          Object.defineProperty(pluginArray, 'length', { value: plugins.length });
          return pluginArray;
        },
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'prompt', onchange: null } as PermissionStatus);
        }
        return originalQuery.call(window.navigator.permissions, parameters);
      };

      // Override chrome runtime
      if (!(window as any).chrome) {
        (window as any).chrome = {};
      }
      if (!(window as any).chrome.runtime) {
        (window as any).chrome.runtime = {};
      }
    });
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.page) throw new Error('Controller not launched');

    const url = this.page.url();
    if (url.includes('accounts.google.com')) {
      return false;
    }

    try {
      const avatarButton = await this.page.$('button[aria-label*="Account"]');
      return avatarButton !== null;
    } catch {
      return false;
    }
  }

  async waitForAuthentication(timeout: number = 300000): Promise<boolean> {
    if (!this.page) throw new Error('Controller not launched');

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.isAuthenticated()) {
        return true;
      }
      await this.page.waitForTimeout(1000);
    }
    return false;
  }

  async play(): Promise<void> {
    await this.ensureVideoFocused();
    const state = await this.getPlaybackState();
    if (!state.isPlaying) {
      await this.pressKey('k');
    }
  }

  async pause(): Promise<void> {
    await this.ensureVideoFocused();
    const state = await this.getPlaybackState();
    if (state.isPlaying) {
      await this.pressKey('k');
    }
  }

  async togglePlayPause(): Promise<void> {
    await this.ensureVideoFocused();
    await this.pressKey('k');
  }

  async seek(seconds: number): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.evaluate((targetTime) => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = targetTime;
      }
    }, seconds);
  }

  async seekForward(seconds: number = 10): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Use 'l' key for forward skip (10 seconds per press)
    await this.ensureVideoFocused();
    const presses = Math.max(1, Math.round(seconds / 10));
    for (let i = 0; i < presses; i++) {
      await this.page.keyboard.press('l');
      if (i < presses - 1) {
        await this.page.waitForTimeout(100);
      }
    }
  }

  async seekBackward(seconds: number = 10): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Use 'j' key for backward skip (10 seconds per press)
    await this.ensureVideoFocused();
    const presses = Math.max(1, Math.round(seconds / 10));
    for (let i = 0; i < presses; i++) {
      await this.page.keyboard.press('j');
      if (i < presses - 1) {
        await this.page.waitForTimeout(100);
      }
    }
  }

  async setVolume(level: number): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    const clampedLevel = Math.max(0, Math.min(1, level));
    await this.page.evaluate((vol) => {
      const video = document.querySelector('video');
      if (video) {
        video.volume = vol;
      }
    }, clampedLevel);
  }

  async volumeUp(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Focus video player and use keyboard for volume
    await this.ensureVideoFocused();
    await this.page.keyboard.press('ArrowUp');
  }

  async volumeDown(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Focus video player and use keyboard for volume
    await this.ensureVideoFocused();
    await this.page.keyboard.press('ArrowDown');
  }

  async mute(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Use 'm' key to toggle mute - check state first
    const state = await this.getPlaybackState();
    if (!state.isMuted) {
      await this.ensureVideoFocused();
      await this.page.keyboard.press('m');
    }
  }

  async unmute(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Use 'm' key to toggle mute - check state first
    const state = await this.getPlaybackState();
    if (state.isMuted) {
      await this.ensureVideoFocused();
      await this.page.keyboard.press('m');
    }
  }

  async toggleMute(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.ensureVideoFocused();
    await this.page.keyboard.press('m');
  }

  async toggleCaptions(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.ensureVideoFocused();
    await this.page.keyboard.press('c');
  }

  async pressButton(button: RemoteButton): Promise<void> {
    const key = KEY_MAPPINGS[button];
    if (!key) {
      throw new Error(`Unknown button: ${button}`);
    }
    await this.pressKey(key);
  }

  async navigate(direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    const keyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
    };

    // Don't click body - it resets the cursor/selection!
    await this.page.keyboard.press(keyMap[direction]);
    await this.page.waitForTimeout(100);
  }

  async select(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Don't click body - just press Enter
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  async back(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
  }

  // Direct URL navigation - more reliable than keyboard
  async gotoLive(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.page.goto('https://tv.youtube.com/live', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
  }

  // Navigate to a specific channel in the guide and play it
  async tuneToChannel(channelName: string): Promise<boolean> {
    if (!this.page) throw new Error('Controller not launched');

    // Go to live TV guide
    await this.page.goto('https://tv.youtube.com/live', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    // Find the channel name element, then click on the program cell to its right
    try {
      // Find the channel name/logo element
      const channelElement = await this.page.$(`text="${channelName}"`)
        || await this.page.$(`[aria-label*="${channelName}" i]`)
        || await this.page.$(`img[alt*="${channelName}" i]`);

      if (channelElement) {
        const box = await channelElement.boundingBox();
        if (box) {
          // Click to the RIGHT of the channel name (on the program cell)
          // Program cells start after the channel column, typically 200-300px to the right
          await this.page.mouse.click(box.x + box.width + 150, box.y + box.height / 2);
          await this.page.waitForTimeout(500);
          return true;
        }
      }

      // Fallback: search for the channel
      await this.playChannel(channelName);
      return true;
    } catch {
      return false;
    }
  }

  // Get list of visible channels in the guide
  async getChannelList(): Promise<string[]> {
    if (!this.page) throw new Error('Controller not launched');

    return await this.page.evaluate(() => {
      const channels: string[] = [];
      // Try various selectors for channel names
      const selectors = [
        '[class*="channel"] [class*="name"]',
        '[class*="channel-logo"]',
        '[class*="station"]',
        'img[alt]',
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim() || (el as HTMLImageElement).alt?.trim();
          if (text && text.length > 1 && text.length < 50 && !channels.includes(text)) {
            channels.push(text);
          }
        });
        if (channels.length > 5) break;
      }
      return channels;
    });
  }

  // Get full guide data with channels, programs, and times
  async getGuideData(): Promise<Array<{
    channel: string;
    programs: Array<{
      title: string;
      time: string;
      description?: string;
    }>;
  }>> {
    if (!this.page) throw new Error('Controller not launched');

    // Make sure we're on the live guide
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/live')) {
      await this.page.goto('https://tv.youtube.com/live', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }

    return await this.page.evaluate(() => {
      const guideData: Array<{
        channel: string;
        programs: Array<{
          title: string;
          time: string;
          description?: string;
        }>;
      }> = [];

      // Find all channel rows in the guide
      // YouTube TV guide structure: rows contain channel info + program cells
      const rows = document.querySelectorAll('[class*="channel-row"], [class*="guide-row"], tr, [role="row"]');

      rows.forEach((row) => {
        // Try to find channel name in this row
        const channelEl = row.querySelector('[class*="channel-name"], [class*="station"], [class*="network"], img[alt]');
        const channelName = channelEl?.textContent?.trim() || (channelEl as HTMLImageElement)?.alt?.trim();

        if (!channelName || channelName.length < 2) return;

        // Find program cells in this row
        const programCells = row.querySelectorAll('[class*="program"], [class*="cell"], [role="gridcell"], [role="button"]');
        const programs: Array<{ title: string; time: string; description?: string }> = [];

        programCells.forEach((cell) => {
          const cellText = cell.textContent?.trim() || '';
          const ariaLabel = cell.getAttribute('aria-label') || '';

          // Try to parse time and title from the cell
          // Common patterns: "2:00PM Show Title" or aria-label contains full info
          const timeMatch = cellText.match(/(\d{1,2}:\d{2}\s*(AM|PM)?)/i)
            || ariaLabel.match(/(\d{1,2}:\d{2}\s*(AM|PM)?)/i);

          // Extract title - usually the main text content or from aria-label
          let title = '';
          let time = '';
          let description = '';

          if (ariaLabel) {
            // aria-label often has format: "Time • Title • Description"
            const parts = ariaLabel.split('•').map(s => s.trim());
            if (parts.length >= 2) {
              time = parts[0] || '';
              title = parts[1] || '';
              description = parts.slice(2).join(' ').trim();
            } else {
              title = ariaLabel;
            }
          }

          if (!title && cellText) {
            // Fallback: parse from cell text
            const lines = cellText.split('\n').map(s => s.trim()).filter(Boolean);
            if (lines.length >= 2) {
              time = lines[0] || '';
              title = lines[1] || '';
              description = lines.slice(2).join(' ');
            } else if (lines.length === 1) {
              title = lines[0];
            }
          }

          if (timeMatch && !time) {
            time = timeMatch[1];
          }

          if (title && title.length > 1 && title !== channelName) {
            programs.push({
              title,
              time: time || 'Now',
              ...(description && { description }),
            });
          }
        });

        if (programs.length > 0) {
          guideData.push({
            channel: channelName,
            programs,
          });
        }
      });

      // If row-based parsing didn't work, try alternative approach
      if (guideData.length === 0) {
        // Get all channel identifiers
        const channelEls = document.querySelectorAll('[class*="channel-logo"] img, [class*="station-logo"], [class*="network-logo"]');

        channelEls.forEach((channelEl) => {
          const channelName = (channelEl as HTMLImageElement).alt?.trim() || channelEl.textContent?.trim();
          if (!channelName || channelName.length < 2) return;

          // Find the parent row and look for programs
          const row = channelEl.closest('[class*="row"], tr');
          if (!row) return;

          const programEls = row.querySelectorAll('[aria-label*="PM"], [aria-label*="AM"], [class*="program"]');
          const programs: Array<{ title: string; time: string; description?: string }> = [];

          programEls.forEach((prog) => {
            const label = prog.getAttribute('aria-label') || prog.textContent || '';
            if (label) {
              // Parse "Time Title" or "Time • Title"
              const parts = label.split(/[•\n]/).map(s => s.trim()).filter(Boolean);
              if (parts.length >= 1) {
                programs.push({
                  title: parts[1] || parts[0],
                  time: parts[0].match(/\d{1,2}:\d{2}/) ? parts[0] : 'Now',
                });
              }
            }
          });

          if (programs.length > 0) {
            guideData.push({ channel: channelName, programs });
          }
        });
      }

      return guideData;
    });
  }

  // Debug method to inspect the page structure
  async debugPageStructure(): Promise<{
    url: string;
    title: string;
    elements: Array<{
      tag: string;
      classes: string;
      ariaLabel: string | null;
      text: string;
      alt: string | null;
    }>;
  }> {
    if (!this.page) throw new Error('Controller not launched');

    return await this.page.evaluate(() => {
      const elements: Array<{
        tag: string;
        classes: string;
        ariaLabel: string | null;
        text: string;
        alt: string | null;
      }> = [];

      // Look for anything that might be a channel or program
      const selectors = [
        'img[alt]',
        '[role="row"]',
        '[role="gridcell"]',
        '[role="button"]',
        '[aria-label]',
        '[class*="channel"]',
        '[class*="program"]',
        '[class*="guide"]',
        '[class*="live"]',
        '[class*="epg"]',
      ];

      const seen = new Set<Element>();

      for (const selector of selectors) {
        const els = document.querySelectorAll(selector);
        els.forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);

          const text = el.textContent?.trim().slice(0, 100) || '';
          const classes = el.className?.toString?.() || '';

          // Only include elements with meaningful content
          if (text || el.getAttribute('aria-label') || (el as HTMLImageElement).alt) {
            elements.push({
              tag: el.tagName.toLowerCase(),
              classes: classes.slice(0, 200),
              ariaLabel: el.getAttribute('aria-label')?.slice(0, 200) || null,
              text: text.slice(0, 100),
              alt: (el as HTMLImageElement).alt?.slice(0, 100) || null,
            });
          }
        });

        // Limit to avoid huge output
        if (elements.length > 100) break;
      }

      return {
        url: window.location.href,
        title: document.title,
        elements,
      };
    });
  }

  async gotoLibrary(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.page.goto('https://tv.youtube.com/library', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(500);
  }

  async goHome(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.page.goto(YOUTUBE_TV_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(500);
  }

  // Focus the channel guide for navigation
  async focusGuide(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Click directly on a program cell to establish focus
    // This is more reliable than Tab for the guide grid
    try {
      const programCellSelectors = [
        // Program cells in the guide
        '[data-test-id="program-cell"]',
        '[class*="program-cell"]',
        '[class*="epg-cell"]',
        '[role="gridcell"]',
        '[role="button"][aria-label*="PM"]',
        '[role="button"][aria-label*="AM"]',
        // Channel row items
        '[class*="channel-row"] [role="button"]',
        '[class*="guide"] [role="button"]',
        // Fallback: any clickable item in the guide area
        '[class*="guide"] button',
        '[class*="live"] [role="button"]',
      ];

      for (const selector of programCellSelectors) {
        const elements = await this.page.$$(selector);
        if (elements.length > 0) {
          // Click the first visible program cell
          await elements[0].click();
          await this.page.waitForTimeout(200);
          return;
        }
      }

      // If no specific cells found, try clicking on the first channel logo
      const channelLogo = await this.page.$('[class*="channel-logo"], [class*="channel-icon"], img[alt]');
      if (channelLogo) {
        // Click to the right of the logo (on the program area)
        const box = await channelLogo.boundingBox();
        if (box) {
          await this.page.mouse.click(box.x + box.width + 100, box.y + box.height / 2);
          await this.page.waitForTimeout(200);
          return;
        }
      }
    } catch {
      // Fallback to keyboard
    }

    // Last resort: Tab multiple times
    for (let i = 0; i < 5; i++) {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);
    }
  }

  async openGuide(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    try {
      const guideButton = await this.page.$(
        '[aria-label="Live"], [aria-label="Guide"], a[href*="/live"]'
      );
      if (guideButton) {
        await guideButton.click();
        return;
      }
    } catch {
      // Fallback to URL navigation
    }

    await this.page.goto(`${YOUTUBE_TV_URL}/live`, {
      waitUntil: 'domcontentloaded',
    });
  }

  async openSearch(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    try {
      const searchButton = await this.page.$(
        '[aria-label="Search"], button[data-test-id="search"]'
      );
      if (searchButton) {
        await searchButton.click();
        return;
      }
    } catch {
      // Fallback to keyboard
    }

    await this.pressKey('/');
  }

  async search(query: string): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.goto(
      `${YOUTUBE_TV_URL}/search?q=${encodeURIComponent(query)}`,
      { waitUntil: 'domcontentloaded' }
    );
  }

  async playChannel(channelName: string): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    // Search for the channel
    await this.search(channelName);
    await this.page.waitForTimeout(2000);

    // Use Tab to enter the results area, then arrow to first result
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Enter');
  }

  async handleStillWatching(): Promise<boolean> {
    if (!this.page) throw new Error('Controller not launched');

    try {
      // Look for "Still watching?" or "Continue watching" prompt
      const stillWatchingSelectors = [
        'text="Still watching?"',
        'text="Continue watching"',
        'text="Yes"',
        '[aria-label*="still watching" i]',
        '[aria-label*="continue watching" i]',
      ];

      for (const selector of stillWatchingSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          // Found the prompt, press Enter or click to dismiss
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(500);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async clickText(text: string): Promise<boolean> {
    if (!this.page) throw new Error('Controller not launched');

    try {
      await this.page.click(`text="${text}"`, { timeout: 5000 });
      return true;
    } catch {
      try {
        await this.page.click(`text=${text}`, { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  async clickSelector(selector: string): Promise<boolean> {
    if (!this.page) throw new Error('Controller not launched');

    try {
      await this.page.click(selector, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickAt(x: number, y: number): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.page.mouse.click(x, y);
    await this.page.waitForTimeout(200);
  }

  async getPlaybackState(): Promise<PlaybackState> {
    if (!this.page) throw new Error('Controller not launched');

    return await this.page.evaluate(() => {
      const video = document.querySelector('video');
      const titleElement = document.querySelector(
        '.ytp-title-link, [class*="title"]'
      );

      if (!video) {
        return {
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          volume: 1,
          isMuted: false,
          title: undefined,
          channel: undefined,
        };
      }

      return {
        isPlaying: !video.paused,
        currentTime: video.currentTime,
        duration: video.duration || 0,
        volume: video.volume,
        isMuted: video.muted,
        title: titleElement?.textContent || undefined,
        channel: undefined,
      };
    });
  }

  async getState(): Promise<ControllerState> {
    if (!this.page) {
      return {
        isConnected: false,
        currentUrl: '',
        isAuthenticated: false,
      };
    }

    return {
      isConnected: true,
      currentUrl: this.page.url(),
      isAuthenticated: await this.isAuthenticated(),
    };
  }

  async screenshot(path?: string): Promise<Buffer> {
    if (!this.page) throw new Error('Controller not launched');

    const options: { path?: string; type: 'png' } = { type: 'png' };
    if (path) {
      options.path = path;
    }

    return await this.page.screenshot(options);
  }

  getPage(): Page | null {
    return this.page;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  // Private helper methods
  private async pressKey(key: string): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    // Ensure page is focused before sending keyboard events
    await this.ensurePageFocused();
    await this.page.keyboard.press(key);
  }

  private async ensurePageFocused(): Promise<void> {
    if (!this.page) return;

    // Don't blur or click body - it destroys TV interface focus state
    // Just ensure the page frame is active
    try {
      await this.page.bringToFront();
    } catch {
      // Ignore errors
    }
  }

  private async ensureVideoFocused(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    try {
      const video = await this.page.$('video');
      if (video) {
        await video.click({ force: true }).catch(() => {});
      }
    } catch {
      // Video may not be present, continue anyway
    }
  }
}
