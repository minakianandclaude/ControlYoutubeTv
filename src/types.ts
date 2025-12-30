import { Browser, BrowserContext, Page } from 'playwright';

export interface YouTubeTVControllerOptions {
  headless?: boolean;
  slowMo?: number;
  userDataDir?: string;
  viewport?: { width: number; height: number };
  timeout?: number;
  /** Use the system's installed Chrome instead of Playwright's bundled Chromium */
  useSystemChrome?: boolean;
  /** Use the existing Chrome user profile (inherits Google login) */
  useChromeProfile?: boolean;
  /** Custom path to Chrome profile directory */
  chromeProfilePath?: string;
  /** Custom path to Chrome executable */
  executablePath?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  title?: string;
  channel?: string;
}

export interface Channel {
  name: string;
  number?: string;
  logoUrl?: string;
}

export interface Program {
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  channel?: string;
}

export interface SearchResult {
  title: string;
  type: 'movie' | 'show' | 'episode' | 'channel' | 'sports' | 'unknown';
  thumbnail?: string;
}

export interface ControllerState {
  isConnected: boolean;
  currentUrl: string;
  isAuthenticated: boolean;
}

export type RemoteButton =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'enter'
  | 'back'
  | 'play'
  | 'pause'
  | 'playpause'
  | 'forward'
  | 'rewind'
  | 'volumeUp'
  | 'volumeDown'
  | 'mute'
  | 'guide'
  | 'home'
  | 'search'
  | 'info'
  | 'record'
  | 'channelUp'
  | 'channelDown';

export interface YouTubeTVController {
  launch(): Promise<void>;
  close(): Promise<void>;

  // Authentication
  isAuthenticated(): Promise<boolean>;
  waitForAuthentication(timeout?: number): Promise<boolean>;

  // Playback controls
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlayPause(): Promise<void>;
  seek(seconds: number): Promise<void>;
  seekForward(seconds?: number): Promise<void>;
  seekBackward(seconds?: number): Promise<void>;

  // Volume controls
  setVolume(level: number): Promise<void>;
  volumeUp(): Promise<void>;
  volumeDown(): Promise<void>;
  mute(): Promise<void>;
  unmute(): Promise<void>;
  toggleMute(): Promise<void>;

  // Navigation
  pressButton(button: RemoteButton): Promise<void>;
  navigate(direction: 'up' | 'down' | 'left' | 'right'): Promise<void>;
  select(): Promise<void>;
  back(): Promise<void>;
  goHome(): Promise<void>;
  openGuide(): Promise<void>;
  openSearch(): Promise<void>;

  // Content
  search(query: string): Promise<void>;
  playChannel(channelName: string): Promise<void>;

  // State
  getPlaybackState(): Promise<PlaybackState>;
  getState(): Promise<ControllerState>;
  screenshot(path?: string): Promise<Buffer>;

  // Browser access for advanced use
  getPage(): Page | null;
  getBrowser(): Browser | null;
  getContext(): BrowserContext | null;
}
