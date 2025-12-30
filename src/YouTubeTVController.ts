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

    await this.page.evaluate((skipSeconds) => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime += skipSeconds;
      }
    }, seconds);
  }

  async seekBackward(seconds: number = 10): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.evaluate((skipSeconds) => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime -= skipSeconds;
      }
    }, seconds);
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

    await this.page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.volume = Math.min(1, video.volume + 0.1);
      }
    });
  }

  async volumeDown(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.volume = Math.max(0, video.volume - 0.1);
      }
    });
  }

  async mute(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.muted = true;
      }
    });
  }

  async unmute(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.muted = false;
      }
    });
  }

  async toggleMute(): Promise<void> {
    await this.ensureVideoFocused();
    await this.pressKey('m');
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

    // Click on the page first to ensure focus
    await this.page.click('body', { force: true }).catch(() => {});
    await this.page.keyboard.press(keyMap[direction]);
    // Small delay to allow UI to animate/update selection
    await this.page.waitForTimeout(150);
  }

  async select(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');

    await this.page.click('body', { force: true }).catch(() => {});
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
  }

  async gotoLibrary(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.page.goto('https://tv.youtube.com/library', { waitUntil: 'domcontentloaded' });
  }

  async goHome(): Promise<void> {
    if (!this.page) throw new Error('Controller not launched');
    await this.page.goto(YOUTUBE_TV_URL, { waitUntil: 'domcontentloaded' });
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

    // Try searching for the channel first (more reliable)
    await this.search(channelName);
    await this.page.waitForTimeout(2000);

    // Try to click on the first result that matches
    try {
      // Look for clickable items in search results
      const selectors = [
        `[aria-label*="${channelName}" i]`,
        `text="${channelName}"`,
        `text=${channelName}`,
        '.ytlr-tile-renderer',
        '[class*="card"]',
        '[class*="tile"]',
      ];

      for (const selector of selectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            return;
          }
        } catch {
          continue;
        }
      }

      // Fallback: navigate with keyboard
      await this.page.waitForTimeout(500);
      await this.navigate('down');
      await this.page.waitForTimeout(300);
      await this.select();
    } catch {
      // Final fallback
      await this.navigate('down');
      await this.select();
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

    try {
      // Click on the body to ensure the page receives keyboard events
      await this.page.evaluate(() => {
        // Remove focus from any input elements
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        // Focus the body
        document.body.focus();
        // Also try clicking on the main content area
        const mainContent = document.querySelector('ytlr-app, #content, main, body');
        if (mainContent instanceof HTMLElement) {
          mainContent.focus();
        }
      });
      // Small delay to ensure focus is set
      await this.page.waitForTimeout(50);
    } catch {
      // Ignore focus errors
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
