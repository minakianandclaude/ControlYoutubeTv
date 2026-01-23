# API Curl Examples

Start the server first:
```bash
npm run server
```

Server runs on `http://localhost:3000` by default.

---

## Lifecycle

### Launch Browser
```bash
curl -X POST http://localhost:3000/launch
```

### Close Browser
```bash
curl -X POST http://localhost:3000/close
```

### Get Controller Status
```bash
curl http://localhost:3000/status
```

---

## Playback Controls

### Get Playback State
```bash
curl http://localhost:3000/playback
```

### Play
```bash
curl -X POST http://localhost:3000/play
```

### Pause
```bash
curl -X POST http://localhost:3000/pause
```

### Toggle Play/Pause
```bash
curl -X POST http://localhost:3000/toggle
```

### Mute
```bash
curl -X POST http://localhost:3000/mute
```

### Unmute
```bash
curl -X POST http://localhost:3000/unmute
```

### Toggle Captions
```bash
curl -X POST http://localhost:3000/captions
```

### Set Volume (0.0 - 1.0)
```bash
curl -X POST http://localhost:3000/volume -d '{"level": 0.5}'
```

### Seek to Specific Time (seconds)
```bash
curl -X POST http://localhost:3000/seek -d '{"seconds": 120}'
```

### Skip Forward (default 10s)
```bash
curl -X POST http://localhost:3000/forward
```

### Skip Forward Custom Seconds
```bash
curl -X POST http://localhost:3000/forward -d '{"seconds": 30}'
```

### Skip Backward (default 10s)
```bash
curl -X POST http://localhost:3000/rewind
```

### Skip Backward Custom Seconds
```bash
curl -X POST http://localhost:3000/rewind -d '{"seconds": 30}'
```

---

## Navigation

### Go to Home
```bash
curl -X POST http://localhost:3000/home
```

### Go to Live TV
```bash
curl -X POST http://localhost:3000/live
```

### Go to Library
```bash
curl -X POST http://localhost:3000/library
```

### Open Guide
```bash
curl -X POST http://localhost:3000/guide
```

### Focus Guide (for keyboard navigation)
```bash
curl -X POST http://localhost:3000/focus
```

### Navigate Direction
```bash
curl -X POST http://localhost:3000/navigate -d '{"direction": "up"}'
curl -X POST http://localhost:3000/navigate -d '{"direction": "down"}'
curl -X POST http://localhost:3000/navigate -d '{"direction": "left"}'
curl -X POST http://localhost:3000/navigate -d '{"direction": "right"}'
```

### Select Current Item
```bash
curl -X POST http://localhost:3000/select
```

### Go Back
```bash
curl -X POST http://localhost:3000/back
```

---

## Channel Tuning

### Tune to Channel (recommended)
Auto-selects "Join live" after 10 seconds if dialog appears.
```bash
curl -X POST http://localhost:3000/tune -d '{"name": "CBS"}'
```

### Tune with Custom Auto-Select Delay
```bash
curl -X POST http://localhost:3000/tune -d '{"name": "CBS", "autoSelectDelay": 30000}'
```

### Tune with No Auto-Select
```bash
curl -X POST http://localhost:3000/tune -d '{"name": "CBS", "autoSelectDelay": 0}'
```

### Play Channel via Search (fallback)
```bash
curl -X POST http://localhost:3000/channel -d '{"name": "CNN"}'
```

### Search
```bash
curl -X POST http://localhost:3000/search -d '{"query": "news"}'
```

---

## Playback Selection Dialog

When tuning to a channel, a dialog may appear asking "How would you like to begin watching?"

### Check if Dialog is Visible
```bash
curl http://localhost:3000/playback-dialog
```

### Select "Join live"
```bash
curl -X POST http://localhost:3000/join-live
```

### Select "Start from beginning"
```bash
curl -X POST http://localhost:3000/start-beginning
```

---

## Guide Data

### Get Channel List
```bash
curl http://localhost:3000/channels
```

### Get Full Guide Data (channels + programs + times)
```bash
curl http://localhost:3000/guide-data
```

---

## Remote Button Simulation

### Press Remote Button
Available buttons: `up`, `down`, `left`, `right`, `enter`, `back`, `play`, `pause`, `playpause`, `forward`, `rewind`, `volumeUp`, `volumeDown`, `mute`, `captions`, `guide`, `home`, `search`, `info`, `record`, `channelUp`, `channelDown`

```bash
curl -X POST http://localhost:3000/button -d '{"button": "enter"}'
curl -X POST http://localhost:3000/button -d '{"button": "guide"}'
curl -X POST http://localhost:3000/button -d '{"button": "channelUp"}'
```

---

## Click Actions

### Click by Text
```bash
curl -X POST http://localhost:3000/click -d '{"text": "CNN"}'
```

### Click by CSS Selector
```bash
curl -X POST http://localhost:3000/click -d '{"selector": ".my-button"}'
```

### Click at Coordinates
```bash
curl -X POST http://localhost:3000/clickat -d '{"x": 400, "y": 300}'
```

---

## Utility

### Dismiss "Still Watching?" Prompt
```bash
curl -X POST http://localhost:3000/stillwatching
```

### Take Screenshot (returns base64)
```bash
curl http://localhost:3000/screenshot
```

### Save Screenshot to File
```bash
curl -s http://localhost:3000/screenshot | jq -r '.data.screenshot' | base64 -d > screenshot.png
```

### Debug Page Structure
```bash
curl http://localhost:3000/debug
```

---

## Example Workflow

```bash
# 1. Launch the browser
curl -X POST http://localhost:3000/launch

# 2. Wait for authentication if needed (check status)
curl http://localhost:3000/status

# 3. Get available channels
curl http://localhost:3000/channels

# 4. Tune to a channel
curl -X POST http://localhost:3000/tune -d '{"name": "ESPN"}'

# 5. Control playback
curl -X POST http://localhost:3000/toggle      # play/pause
curl -X POST http://localhost:3000/forward     # skip ahead
curl -X POST http://localhost:3000/mute        # mute

# 6. Change channel
curl -X POST http://localhost:3000/tune -d '{"name": "CBS"}'

# 7. Close when done
curl -X POST http://localhost:3000/close
```
