# Control YouTube TV

A TypeScript/Node.js library to programmatically control YouTube TV using Playwright browser automation.

## Features

- **Playback Controls**: Play, pause, seek, skip forward/backward
- **Volume Controls**: Set volume, mute/unmute, volume up/down
- **Navigation**: Remote-style navigation (up/down/left/right/enter/back)
- **Content Discovery**: Search, open guide, play specific channels
- **Session Persistence**: Save login state between sessions
- **API Ready**: Easy integration with other applications via HTTP API

## Installation

```bash
npm install
npx playwright install chromium
```

## Quick Start

```typescript
import { YouTubeTVController } from 'control-youtube-tv';

const controller = new YouTubeTVController({
  headless: false,
  viewport: { width: 1920, height: 1080 },
});

await controller.launch();

// Wait for user to authenticate
await controller.waitForAuthentication();

// Control playback
await controller.play();
await controller.pause();
await controller.setVolume(0.5);

// Navigate
await controller.openGuide();
await controller.navigate('down');
await controller.select();

// Clean up
await controller.close();
```

## Usage Options

### Constructor Options

```typescript
interface YouTubeTVControllerOptions {
  headless?: boolean;        // Run browser in headless mode (default: false)
  slowMo?: number;           // Slow down actions by ms (default: 0)
  userDataDir?: string;      // Persist session data to this directory
  viewport?: {               // Browser viewport size
    width: number;           // Default: 1920
    height: number;          // Default: 1080
  };
  timeout?: number;          // Default timeout in ms (default: 30000)
}
```

### Persistent Sessions

To avoid logging in every time, use a `userDataDir`:

```typescript
const controller = new YouTubeTVController({
  userDataDir: './youtube-tv-session',
});
```

Your login session will be saved and restored automatically.

## API Reference

### Lifecycle

| Method | Description |
|--------|-------------|
| `launch()` | Start the browser and navigate to YouTube TV |
| `close()` | Close the browser |
| `isAuthenticated()` | Check if user is logged in |
| `waitForAuthentication(timeout?)` | Wait for user to log in |

### Playback Controls

| Method | Description |
|--------|-------------|
| `play()` | Start playback |
| `pause()` | Pause playback |
| `togglePlayPause()` | Toggle play/pause state |
| `seek(seconds)` | Seek to absolute time |
| `seekForward(seconds?)` | Skip forward (default: 10s) |
| `seekBackward(seconds?)` | Skip backward (default: 10s) |

### Volume Controls

| Method | Description |
|--------|-------------|
| `setVolume(level)` | Set volume (0-1) |
| `volumeUp()` | Increase volume by 10% |
| `volumeDown()` | Decrease volume by 10% |
| `mute()` | Mute audio |
| `unmute()` | Unmute audio |
| `toggleMute()` | Toggle mute state |

### Navigation

| Method | Description |
|--------|-------------|
| `navigate(direction)` | Move focus (up/down/left/right) |
| `select()` | Select focused item (Enter) |
| `back()` | Go back (Escape) |
| `goHome()` | Navigate to home screen |
| `openGuide()` | Open live TV guide |
| `openSearch()` | Open search |
| `pressButton(button)` | Press a remote button |

### Content

| Method | Description |
|--------|-------------|
| `search(query)` | Search for content |
| `playChannel(name)` | Tune to a channel by name |

### State

| Method | Description |
|--------|-------------|
| `getPlaybackState()` | Get current playback info |
| `getState()` | Get controller state |
| `screenshot(path?)` | Take a screenshot |

### Browser Access

| Method | Description |
|--------|-------------|
| `getPage()` | Get Playwright Page object |
| `getBrowser()` | Get Playwright Browser object |
| `getContext()` | Get Playwright BrowserContext object |

## Remote Buttons

Available buttons for `pressButton()`:

- Navigation: `up`, `down`, `left`, `right`, `enter`, `back`
- Playback: `play`, `pause`, `playpause`, `forward`, `rewind`
- Volume: `volumeUp`, `volumeDown`, `mute`
- Other: `guide`, `home`, `search`, `info`, `record`, `channelUp`, `channelDown`

## Examples

### Basic Usage

```bash
npm run example
```

### Persistent Session

```bash
npm run example:record
```

### HTTP API Server

```bash
npm run server
```

Then control via HTTP:

```bash
# Launch browser
curl -X POST http://localhost:3000/launch

# Check status
curl http://localhost:3000/status

# Play/pause
curl -X POST http://localhost:3000/toggle

# Set volume to 50%
curl -X POST http://localhost:3000/volume -d '{"level": 0.5}'

# Search for content
curl -X POST http://localhost:3000/search -d '{"query": "news"}'

# Navigate
curl -X POST http://localhost:3000/navigate -d '{"direction": "down"}'
curl -X POST http://localhost:3000/select
```

## Integration with Other Applications

The controller exposes direct access to Playwright objects for advanced use cases:

```typescript
const controller = new YouTubeTVController();
await controller.launch();

// Get the Playwright page for custom automation
const page = controller.getPage();
if (page) {
  await page.waitForSelector('.my-element');
  await page.click('.my-button');
}
```

## Development

```bash
# Build
npm run build

# Clean
npm run clean
```

## Requirements

- Node.js 16+
- Playwright with Chromium

## License

ISC
