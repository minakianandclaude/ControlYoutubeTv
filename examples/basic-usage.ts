/**
 * Basic usage example for YouTube TV Controller
 *
 * This example demonstrates how to:
 * - Launch the controller
 * - Wait for authentication
 * - Control playback
 * - Navigate the interface
 */

import { YouTubeTVController } from '../src';

async function main() {
  // Create controller instance
  // headless: false allows you to see the browser
  const controller = new YouTubeTVController({
    headless: false,
    viewport: { width: 1920, height: 1080 },
    timeout: 30000,
  });

  try {
    console.log('Launching YouTube TV...');
    await controller.launch();

    // Check if already authenticated
    const isAuth = await controller.isAuthenticated();
    if (!isAuth) {
      console.log('Please sign in to your Google account in the browser window.');
      console.log('Waiting for authentication (5 minute timeout)...');

      const authenticated = await controller.waitForAuthentication(300000);
      if (!authenticated) {
        console.log('Authentication timed out.');
        await controller.close();
        return;
      }
    }

    console.log('Authenticated! Ready to control YouTube TV.');

    // Wait a moment for the page to stabilize
    await delay(3000);

    // Example: Open the live TV guide
    console.log('Opening live TV guide...');
    await controller.openGuide();
    await delay(2000);

    // Example: Navigate the guide
    console.log('Navigating the guide...');
    await controller.navigate('down');
    await delay(500);
    await controller.navigate('down');
    await delay(500);
    await controller.select();
    await delay(3000);

    // Example: Get playback state
    const state = await controller.getPlaybackState();
    console.log('Playback state:', state);

    // Example: Control playback
    console.log('Toggling play/pause...');
    await controller.togglePlayPause();
    await delay(2000);
    await controller.togglePlayPause();

    // Example: Adjust volume
    console.log('Adjusting volume...');
    await controller.setVolume(0.5);

    // Example: Take a screenshot
    console.log('Taking screenshot...');
    await controller.screenshot('youtube-tv-screenshot.png');
    console.log('Screenshot saved to youtube-tv-screenshot.png');

    // Keep the browser open for manual interaction
    console.log('\nBrowser will remain open. Press Ctrl+C to exit.');
    await delay(60000 * 5); // Keep open for 5 minutes
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
