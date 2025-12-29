import { chromium, Browser, BrowserContext, Page } from 'playwright';
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

export class YouTubeTVController implements IYouTubeTVController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: Required<YouTubeTVControllerOptions>;

  constructor(options: YouTubeTVControllerOptions = {}) {
    this.options = {
      headless: options.headless ?? false,
      slowMo: options.slowMo ?? 0,
      userDataDir: options.userDataDir ?? '',
      viewport: options.viewport ?? { width: 1920, height: 1080 },
      timeout: options.timeout ?? 30000,
    };
  }

  async launch(): Promise<void> {
    const launchOptions = {
      headless: this.options.headless,
      slowMo: this.options.slowMo,
    };

    if (this.options.userDataDir) {
      this.context = await chromium.launchPersistentContext(
        this.options.userDataDir,
        {
          ...launchOptions,
          viewport: this.options.viewport,
        }
      );
      this.page = this.context.pages()[0] || (await this.context.newPage());
    } else {
      this.browser = await chromium.launch(launchOptions);
      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      this.page = await this.context.newPage();
    }

    this.page.setDefaultTimeout(this.options.timeout);
    await this.page.goto(YOUTUBE_TV_URL, { waitUntil: 'domcontentloaded' });
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
    await this.pressButton(direction);
  }

  async select(): Promise<void> {
    await this.pressButton('enter');
  }

  async back(): Promise<void> {
    await this.pressButton('back');
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

    await this.openGuide();
    await this.page.waitForTimeout(2000);

    const channelSelector = `text="${channelName}"`;
    try {
      await this.page.click(channelSelector, { timeout: 10000 });
    } catch {
      await this.search(channelName);
      await this.page.waitForTimeout(2000);
      await this.pressButton('down');
      await this.pressButton('enter');
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
    await this.page.keyboard.press(key);
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

export default YouTubeTVController;
