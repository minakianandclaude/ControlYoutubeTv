# Companion Web App

A web-based remote control interface for the YouTube TV Controller.

## Overview

Create a responsive web application that allows users to control YouTube TV playback from any device on the local network (phone, tablet, laptop). The web app communicates with the existing HTTP API server.

## Core Features

### Playback Controls
- Play/Pause toggle
- Mute/Unmute toggle
- Volume up/down
- Seek forward/backward (10s increments)
- Toggle captions

### Channel Navigation
- Display channel list with current programs
- One-tap channel tuning
- Search/filter channels
- Show current channel and program info

### Guide View
- Grid or list view of channels and programs
- Show program times and descriptions
- Tap program to tune

### Playback Dialog Handling
- Show dialog options when "Join live / Start from beginning" appears
- Manual selection buttons
- Visual countdown for auto-select timer

## Technical Considerations

### Frontend
- TBD: Framework (React, Vue, vanilla JS, etc.)
- Responsive design for mobile-first usage
- Dark theme to match TV viewing environment
- Large touch-friendly buttons

### Communication
- Connect to existing API server (e.g., `http://192.168.1.100:3000`)
- Configurable server URL
- Polling or WebSocket for status updates

### Deployment Options
- Served by the same Node.js server
- Standalone static files
- PWA for home screen installation

## UI/UX Ideas

### Remote Layout
```
┌─────────────────────────┐
│     Channel / Program   │
│      (current info)     │
├─────────────────────────┤
│                         │
│     [  Guide  ]         │
│                         │
├─────────────────────────┤
│   ◄◄   [ ▶/❚❚ ]   ►►   │
│                         │
│  [Vol-]  [Mute]  [Vol+] │
│                         │
│        [  CC  ]         │
└─────────────────────────┘
```

### Channel List
- Scrollable list with channel logos
- Current program title next to each
- Highlight currently playing channel

## API Endpoints Used

| Action | Endpoint | Method |
|--------|----------|--------|
| Play/Pause | `/play-pause` | POST |
| Mute | `/mute` | POST |
| Unmute | `/unmute` | POST |
| Volume Up | `/volume-up` | POST |
| Volume Down | `/volume-down` | POST |
| Seek Forward | `/forward` | POST |
| Seek Backward | `/backward` | POST |
| Toggle Captions | `/captions` | POST |
| Tune Channel | `/tune` | POST |
| Get Channels | `/channels` | GET |
| Get Guide | `/guide-data` | GET |
| Get Status | `/state` | GET |
| Join Live | `/join-live` | POST |
| Start Beginning | `/start-beginning` | POST |
| Check Dialog | `/playback-dialog` | GET |

## Future Enhancements

- Voice control integration
- Keyboard shortcuts when focused
- Multiple TV/server support
- Favorites/recently watched
- Recording controls (if supported)
- Picture-in-picture preview

## Status

**TBD** - Details to be determined
