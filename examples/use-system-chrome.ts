/**
 * Use System Chrome Example
 *
 * This example uses your actual Chrome browser with a dedicated profile for YouTube TV.
 * The first time you run it, you'll need to sign in to Google.
 * After that, your session will be saved and reused.
 *
 * This approach works because:
 * 1. Uses real Chrome (bypasses bot detection)
 * 2. Uses a fresh profile (no lock conflicts)
 * 3. Persists login between runs
 */

import { YouTubeTVController } from '../src';

async function main() {
  console.log('='.repeat(60));
  console.log('YouTube TV Controller - Using System Chrome');
  console.log('='.repeat(60));
  console.log('');

  // Use system Chrome with a dedicated profile for YouTube TV
  // This avoids conflicts with your main Chrome profile
  const controller = new YouTubeTVController({
    headless: false,
    useSystemChrome: true,
    userDataDir: './.youtube-tv-profile',  // Fresh profile, persists between runs
    viewport: { width: 1920, height: 1080 },
  });

  try {
    console.log('Launching Chrome...');
    await controller.launch();
    console.log('Chrome launched!');

    // Wait for page to stabilize
    await delay(2000);

    // Check authentication
    const isAuth = await controller.isAuthenticated();
    if (isAuth) {
      console.log('Already logged in from previous session!');
    } else {
      console.log('');
      console.log('Please sign in to your Google account in the browser.');
      console.log('Your session will be saved for future runs.');
      console.log('');
      console.log('Waiting for authentication (5 minute timeout)...');

      const authenticated = await controller.waitForAuthentication(300000);
      if (!authenticated) {
        console.log('Authentication timed out.');
        await controller.close();
        return;
      }
      console.log('Successfully authenticated!');
    }

    console.log('');
    console.log('YouTube TV is ready!');
    await delay(2000);

    // Demo controls
    const state = await controller.getState();
    console.log('URL:', state.currentUrl);

    console.log('Opening live TV guide...');
    await controller.openGuide();
    await delay(3000);

    console.log('Selecting a channel...');
    await controller.navigate('down');
    await delay(300);
    await controller.navigate('down');
    await delay(300);
    await controller.select();
    await delay(3000);

    const playback = await controller.getPlaybackState();
    console.log('Playback:', {
      playing: playback.isPlaying,
      volume: Math.round(playback.volume * 100) + '%',
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('Demo complete! Browser will stay open.');
    console.log('Press Ctrl+C to exit.');
    console.log('='.repeat(60));

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
