# ParallaxTV

<p align="center">
  <img src="./src/assets/parallaxtv_logo.svg" width="120" alt="ParallaxTV Logo" />
</p>

<h3 align="center">
A Premium Jellyfin Desktop Client
</h3>

<p align="center">
Built with Tauri, React, TypeScript and MPV
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-alpha-orange" />
  <img src="https://img.shields.io/badge/platform-windows-blue" />
  <img src="https://img.shields.io/badge/jellyfin-supported-00A4DC" />
  <img src="https://img.shields.io/badge/tauri-v2-purple" />
  <img src="https://img.shields.io/badge/react-19-61DAFB" />
</p>

---

## Overview

ParallaxTV is a modern desktop client for Jellyfin designed to provide a premium streaming experience with a focus on performance, beautiful UI, and powerful playback features.

Unlike traditional web-based Jellyfin clients, ParallaxTV uses a native MPV playback engine through Tauri, allowing smooth playback of high bitrate media, anime, movies, and TV shows.

This project was created by a Jellyfin user who wanted a faster, more polished experience while keeping complete compatibility with self-hosted media libraries.

---

## Features

### Native MPV Playback

- Native MPV player integration
- Hardware accelerated playback
- HEVC / H.265 support
- High bitrate support
- Direct Play support
- Server transcoding support
- Audio track switching
- Subtitle switching
- Playback speed controls
- Fullscreen support

---

### Smart TV Experience

- Continue Watching
- Up Next episodes
- Watch History
- Favorites
- Resume playback
- Episode progress tracking
- Automatic playback reporting to Jellyfin

---

### Anime Features

- AniList integration
- Anime discovery
- Voice actor information
- Anime recommendations
- Trailer support
- Anime cast pages

---

### Discovery System

- Trending content
- Recommended content
- Because You Watched
- Genre-based discovery
- Similar content suggestions

---

### Advanced Playback Features

- Intro detection
- Outro detection
- Recap detection
- Skip Intro
- Skip Outro
- Auto Skip
- Next Episode countdown
- Trickplay previews
- Playback statistics overlay
- Keyboard shortcuts overlay

---

### Settings

- Appearance settings
- Playback settings
- Discovery settings
- Jellyfin settings
- Keyboard shortcut reference

---

## Screenshots

Coming Soon

---

## Built With

### Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- Zustand

### Desktop Framework

- Tauri v2

### Playback Engine

- MPV

### Media Server

- Jellyfin

### Anime Metadata

- AniList
- Jikan

### Backend Services

- Cloudflare Workers
- Cloudflare KV

---

## Current Status

### Version

```txt
v0.1.0-alpha
```

### Development Status

ParallaxTV is currently in active development.

The project is usable but should be considered Alpha software.

Expect:

- Bugs
- Missing features
- UI changes
- Breaking changes between versions

---

## Installation

### Prerequisites

- Jellyfin Server
- Windows 10 or Windows 11
- Node.js 20+
- Rust
- Tauri v2

### Development

Clone the repository:

```bash
git clone https://github.com/parallaxtv/ParallaxTV.git
cd ParallaxTV
```

Install dependencies:

```bash
npm install
```

Run development mode:

```bash
npm run tauri dev
```

Build production version:

```bash
npm run tauri build
```

---

## Roadmap

### v0.1.x

- [x] Native MPV playback
- [x] Continue Watching
- [x] Favorites
- [x] Discovery System
- [x] Anime Integration
- [x] Settings Page
- [x] Intro Skip
- [x] Outro Skip

### v0.2.x

- [ ] Enhanced Search
- [ ] User Profile Page
- [ ] Viewing Statistics
- [ ] Collection Support
- [ ] Better Recommendation Engine

### v0.3.x

- [ ] Download Manager
- [ ] Offline Playback
- [ ] Mobile Companion App
- [ ] Additional Discovery Providers

---

## Contributing

Contributions are welcome.

If you find a bug or have a feature request:

1. Open an Issue
2. Describe the problem
3. Include screenshots if possible
4. Include reproduction steps

---

## Feedback

We are actively looking for feedback from:

- Jellyfin users
- Anime fans
- Self-hosting enthusiasts
- Media server operators

Please use GitHub Issues and Discussions to share feedback.

---

## Disclaimer

ParallaxTV is an independent project and is not affiliated with the Jellyfin Project.

Jellyfin is a trademark of the Jellyfin Project.

---

## License

License will be finalized before the first public release.

---

## Acknowledgements

Special thanks to:

- Jellyfin Team
- MPV Project
- AniList
- Tauri Team
- React Team
- Open Source Community

---

## Star History

If you enjoy ParallaxTV, consider starring the repository.

It helps the project grow and motivates future development.

---

<p align="center">
Made with ❤️ for the Jellyfin Community
</p>
