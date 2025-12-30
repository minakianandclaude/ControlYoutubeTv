/**
 * API Integration Example for YouTube TV Controller
 *
 * This example shows how to use the controller as part of a larger application.
 * It demonstrates:
 * - Creating a simple HTTP API wrapper
 * - Exposing controller methods via REST endpoints
 * - Handling multiple concurrent requests
 */

import * as http from 'http';
import * as path from 'path';
import { YouTubeTVController, PlaybackState, ControllerState } from '../src';

const PORT = 3000;
const USER_DATA_DIR = path.join(__dirname, '..', '.youtube-tv-session');

let controller: YouTubeTVController | null = null;

interface APIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

async function handleRequest(
  method: string,
  pathname: string,
  body: string
): Promise<APIResponse> {
  // Ensure controller is initialized
  if (!controller && pathname !== '/launch' && pathname !== '/status') {
    return { success: false, error: 'Controller not launched. Call /launch first.' };
  }

  try {
    switch (pathname) {
      case '/launch':
        if (!controller) {
          controller = new YouTubeTVController({
            headless: false,
            userDataDir: USER_DATA_DIR,
          });
          await controller.launch();
        }
        return { success: true, data: { message: 'Controller launched' } };

      case '/close':
        if (controller) {
          await controller.close();
          controller = null;
        }
        return { success: true, data: { message: 'Controller closed' } };

      case '/status':
        if (!controller) {
          return { success: true, data: { isConnected: false } };
        }
        const state: ControllerState = await controller.getState();
        return { success: true, data: state };

      case '/playback':
        const playback: PlaybackState = await controller!.getPlaybackState();
        return { success: true, data: playback };

      case '/play':
        await controller!.play();
        return { success: true, data: { action: 'play' } };

      case '/pause':
        await controller!.pause();
        return { success: true, data: { action: 'pause' } };

      case '/toggle':
        await controller!.togglePlayPause();
        return { success: true, data: { action: 'toggle' } };

      case '/mute':
        await controller!.mute();
        return { success: true, data: { action: 'mute' } };

      case '/unmute':
        await controller!.unmute();
        return { success: true, data: { action: 'unmute' } };

      case '/captions':
        await controller!.toggleCaptions();
        return { success: true, data: { action: 'toggleCaptions' } };

      case '/volume': {
        const params = JSON.parse(body || '{}');
        if (typeof params.level === 'number') {
          await controller!.setVolume(params.level);
          return { success: true, data: { volume: params.level } };
        }
        return { success: false, error: 'Missing level parameter (0-1)' };
      }

      case '/seek': {
        const params = JSON.parse(body || '{}');
        if (typeof params.seconds === 'number') {
          await controller!.seek(params.seconds);
          return { success: true, data: { seekTo: params.seconds } };
        }
        return { success: false, error: 'Missing seconds parameter' };
      }

      case '/forward': {
        const params = JSON.parse(body || '{}');
        const seconds = params.seconds || 10;
        await controller!.seekForward(seconds);
        return { success: true, data: { forward: seconds } };
      }

      case '/rewind': {
        const params = JSON.parse(body || '{}');
        const seconds = params.seconds || 10;
        await controller!.seekBackward(seconds);
        return { success: true, data: { rewind: seconds } };
      }

      case '/guide':
        await controller!.openGuide();
        return { success: true, data: { action: 'openGuide' } };

      case '/live':
        await controller!.gotoLive();
        return { success: true, data: { action: 'gotoLive' } };

      case '/library':
        await controller!.gotoLibrary();
        return { success: true, data: { action: 'gotoLibrary' } };

      case '/focus':
        await controller!.focusGuide();
        return { success: true, data: { action: 'focusGuide' } };

      case '/home':
        await controller!.goHome();
        return { success: true, data: { action: 'goHome' } };

      case '/search': {
        const params = JSON.parse(body || '{}');
        if (params.query) {
          await controller!.search(params.query);
          return { success: true, data: { searched: params.query } };
        }
        return { success: false, error: 'Missing query parameter' };
      }

      case '/channel': {
        const params = JSON.parse(body || '{}');
        if (params.name) {
          await controller!.playChannel(params.name);
          return { success: true, data: { channel: params.name } };
        }
        return { success: false, error: 'Missing name parameter' };
      }

      case '/tune': {
        const params = JSON.parse(body || '{}');
        if (params.name) {
          const tuned = await controller!.tuneToChannel(params.name);
          return { success: tuned, data: { channel: params.name, tuned } };
        }
        return { success: false, error: 'Missing name parameter' };
      }

      case '/join-live': {
        const selected = await controller!.selectJoinLive();
        return { success: selected, data: { action: 'joinLive', selected } };
      }

      case '/start-beginning': {
        const selected = await controller!.selectStartFromBeginning();
        return { success: selected, data: { action: 'startFromBeginning', selected } };
      }

      case '/playback-dialog': {
        const isVisible = await controller!.isPlaybackDialogVisible();
        return { success: true, data: { dialogVisible: isVisible } };
      }

      case '/channels': {
        const channels = await controller!.getChannelList();
        return { success: true, data: { channels } };
      }

      case '/guide-data': {
        const guideData = await controller!.getGuideData();
        return { success: true, data: { guide: guideData } };
      }

      case '/debug': {
        const debugInfo = await controller!.debugPageStructure();
        return { success: true, data: debugInfo };
      }

      case '/button': {
        const params = JSON.parse(body || '{}');
        if (params.button) {
          await controller!.pressButton(params.button);
          return { success: true, data: { button: params.button } };
        }
        return { success: false, error: 'Missing button parameter' };
      }

      case '/navigate': {
        const params = JSON.parse(body || '{}');
        if (params.direction) {
          await controller!.navigate(params.direction);
          return { success: true, data: { direction: params.direction } };
        }
        return { success: false, error: 'Missing direction parameter' };
      }

      case '/select':
        await controller!.select();
        return { success: true, data: { action: 'select' } };

      case '/back':
        await controller!.back();
        return { success: true, data: { action: 'back' } };

      case '/stillwatching':
        const dismissed = await controller!.handleStillWatching();
        return { success: true, data: { dismissed } };

      case '/click': {
        const params = JSON.parse(body || '{}');
        if (params.text) {
          const clicked = await controller!.clickText(params.text);
          return { success: clicked, data: { clicked: params.text } };
        }
        if (params.selector) {
          const clicked = await controller!.clickSelector(params.selector);
          return { success: clicked, data: { clicked: params.selector } };
        }
        return { success: false, error: 'Missing text or selector parameter' };
      }

      case '/clickat': {
        const params = JSON.parse(body || '{}');
        if (typeof params.x === 'number' && typeof params.y === 'number') {
          await controller!.clickAt(params.x, params.y);
          return { success: true, data: { x: params.x, y: params.y } };
        }
        return { success: false, error: 'Missing x and y parameters' };
      }

      case '/screenshot': {
        const buffer = await controller!.screenshot();
        return {
          success: true,
          data: { screenshot: buffer.toString('base64') },
        };
      }

      default:
        return { success: false, error: `Unknown endpoint: ${pathname}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS headers for browser clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Collect request body
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    const response = await handleRequest(req.method || 'GET', pathname, body);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(response.success ? 200 : 400);
    res.end(JSON.stringify(response, null, 2));
  });
});

server.listen(PORT, () => {
  console.log(`YouTube TV Controller API running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  POST /launch          - Launch the browser');
  console.log('  POST /close           - Close the browser');
  console.log('  GET  /status          - Get controller status');
  console.log('  GET  /playback        - Get playback state');
  console.log('  POST /play            - Start playback');
  console.log('  POST /pause           - Pause playback');
  console.log('  POST /toggle          - Toggle play/pause');
  console.log('  POST /mute            - Mute audio');
  console.log('  POST /unmute          - Unmute audio');
  console.log('  POST /captions        - Toggle captions');
  console.log('  POST /volume          - Set volume {"level": 0.5}');
  console.log('  POST /seek            - Seek to time {"seconds": 120}');
  console.log('  POST /forward         - Skip forward {"seconds": 10}');
  console.log('  POST /rewind          - Skip backward {"seconds": 10}');
  console.log('  POST /guide           - Open live TV guide');
  console.log('  POST /live            - Go to live TV (direct URL)');
  console.log('  POST /library         - Go to library (direct URL)');
  console.log('  POST /home            - Go to home screen');
  console.log('  POST /search          - Search {"query": "news"}');
  console.log('  POST /channel         - Play channel via search {"name": "CNN"}');
  console.log('  POST /tune            - Tune to channel in guide {"name": "CBS"}');
  console.log('  POST /join-live       - Select "Join live" in playback dialog');
  console.log('  POST /start-beginning - Select "Start from beginning" in playback dialog');
  console.log('  GET  /playback-dialog - Check if playback selection dialog is visible');
  console.log('  GET  /channels        - Get list of visible channels');
  console.log('  GET  /guide-data      - Get full guide (channels + programs + times)');
  console.log('  POST /button          - Press button {"button": "enter"}');
  console.log('  POST /navigate        - Navigate {"direction": "up"}');
  console.log('  POST /select          - Select current item');
  console.log('  POST /back            - Go back');
  console.log('  POST /stillwatching   - Dismiss "Still watching?" prompt');
  console.log('  POST /click           - Click text {"text": "CNN"} or selector {"selector": ".button"}');
  console.log('  POST /clickat         - Click at coordinates {"x": 400, "y": 300}');
  console.log('  GET  /screenshot      - Take screenshot (base64)');
  console.log('\nExample usage:');
  console.log('  curl -X POST http://localhost:3000/launch');
  console.log('  curl http://localhost:3000/status');
  console.log('  curl -X POST http://localhost:3000/play');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (controller) {
    await controller.close();
  }
  server.close();
  process.exit(0);
});
