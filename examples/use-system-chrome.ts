/**
 * Use System Chrome Example
 *
 * This example uses your actual Chrome browser and profile, which:
 * 1. Bypasses Google's bot detection (since it's a real Chrome)
 * 2. Can use your existing Google login (if you're already signed in)
 *
 * IMPORTANT: Close all Chrome windows before running this script!
 * Chrome doesn't allow multiple instances using the same profile.
 */

import { YouTubeTVController } from '../src';

async function main() {
  console.log('='.repeat(60));
  console.log('YouTube TV Controller - Using System Chrome');
  console.log('='.repeat(60));
  console.log('');
  console.log('IMPORTANT: Close all Chrome windows before continuing!');
  console.log('');

  // Option 1: Use system Chrome with your existing profile
  // This will use your existing Google login!
  const controller = new YouTubeTVController({
    headless: false,
    useSystemChrome: true,   // Use the installed Chrome browser
    useChromeProfile: true,  // Use your existing Chrome profile (with Google login)
    viewport: { width: 1920, height: 1080 },
  });

  // Option 2: Use system Chrome with a fresh profile (if you want separation)
  // const controller = new YouTubeTVController({
  //   headless: false,
  //   useSystemChrome: true,
  //   userDataDir: './youtube-tv-chrome-profile',  // Fresh profile directory
  //   viewport: { width: 1920, height: 1080 },
  // });

  try {
    console.log('Launching Chrome...');
    await controller.launch();

    // Wait a moment for the page to load
    await delay(3000);

    // Check if already authenticated
    const isAuth = await controller.isAuthenticated();
    if (isAuth) {
      console.log('Already logged in! Using your existing Google session.');
    } else {
      console.log('');
      console.log('Please sign in to your Google account.');
      console.log('Since this is your real Chrome, Google should allow the login.');
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

    // Now you can control YouTube TV
    console.log('');
    console.log('YouTube TV is ready! Demonstrating controls...');
    await delay(2000);

    // Get current state
    const state = await controller.getState();
    console.log('Current URL:', state.currentUrl);

    // Open live TV guide
    console.log('Opening live TV guide...');
    await controller.openGuide();
    await delay(3000);

    // Navigate and select a channel
    console.log('Navigating to a channel...');
    await controller.navigate('down');
    await delay(500);
    await controller.navigate('down');
    await delay(500);
    await controller.select();
    await delay(5000);

    // Show playback state
    const playback = await controller.getPlaybackState();
    console.log('Playback state:', {
      playing: playback.isPlaying,
      volume: Math.round(playback.volume * 100) + '%',
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('Demo complete! Browser will stay open.');
    console.log('Press Ctrl+C to exit.');
    console.log('='.repeat(60));

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
