/**
 * Record Session Example for YouTube TV Controller
 *
 * This example demonstrates how to use a persistent browser context
 * so that your login session is saved between runs.
 *
 * Benefits:
 * - You only need to log in once
 * - Session persists across restarts
 * - Cookies and local storage are preserved
 */

import * as path from 'path';
import { YouTubeTVController } from '../src';

// Store user data in a local directory
const USER_DATA_DIR = path.join(__dirname, '..', '.youtube-tv-session');

async function main() {
  console.log('Using persistent session directory:', USER_DATA_DIR);

  // Create controller with persistent storage
  const controller = new YouTubeTVController({
    headless: false,
    userDataDir: USER_DATA_DIR,
    viewport: { width: 1920, height: 1080 },
  });

  try {
    console.log('Launching YouTube TV with persistent session...');
    await controller.launch();

    // Check authentication status
    const isAuth = await controller.isAuthenticated();
    if (!isAuth) {
      console.log('\n===========================================');
      console.log('First time setup: Please sign in to Google');
      console.log('Your session will be saved for future use.');
      console.log('===========================================\n');

      const authenticated = await controller.waitForAuthentication(300000);
      if (!authenticated) {
        console.log('Authentication timed out.');
        await controller.close();
        return;
      }

      console.log('Session saved! Next time you run this, you will be auto-logged in.');
    } else {
      console.log('Session restored! You are already logged in.');
    }

    // Get current state
    const state = await controller.getState();
    console.log('Controller state:', state);

    // Example automation
    console.log('\nStarting automation demo...');

    // Go to home
    await controller.goHome();
    await delay(2000);

    // Open guide
    console.log('Opening live TV guide...');
    await controller.openGuide();
    await delay(3000);

    // Select a channel (navigate down a few times and select)
    for (let i = 0; i < 3; i++) {
      await controller.navigate('down');
      await delay(300);
    }
    await controller.select();
    await delay(5000);

    // Get playback info
    const playbackState = await controller.getPlaybackState();
    console.log('\nCurrent playback:', {
      playing: playbackState.isPlaying,
      volume: Math.round(playbackState.volume * 100) + '%',
      muted: playbackState.isMuted,
    });

    // Demonstrate remote control buttons
    console.log('\nDemonstrating remote controls...');

    // Volume control
    await controller.volumeDown();
    await delay(500);
    await controller.volumeDown();
    await delay(500);
    await controller.volumeUp();
    await delay(1000);

    // Mute/unmute
    await controller.toggleMute();
    await delay(1000);
    await controller.toggleMute();

    // Take a screenshot
    const screenshotPath = path.join(__dirname, 'session-screenshot.png');
    await controller.screenshot(screenshotPath);
    console.log('Screenshot saved to:', screenshotPath);

    console.log('\n===========================================');
    console.log('Demo complete! Browser will stay open.');
    console.log('Press Ctrl+C to exit.');
    console.log('===========================================');

    // Keep browser open
    await delay(60000 * 10);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await controller.close();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
