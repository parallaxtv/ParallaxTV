# ParallaxTV

<p align="center">
  <img src="src/assets/banner.png" alt="ParallaxTV Banner" />
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
  <img src="https://img.shields.io/badge/license-AGPL--3.0-green" />
</p>

---

> [!WARNING]
> ParallaxTV is currently in Alpha.
>
> Features may change, bugs may exist, and breaking changes can occur between releases.
>
> Feedback, bug reports, and feature suggestions are highly encouraged.

---

## Overview

ParallaxTV is a premium open-source Jellyfin desktop client focused on performance, beautiful design, and a modern streaming experience.

Built with Tauri, React, TypeScript, and MPV, ParallaxTV combines the flexibility of Jellyfin with the responsiveness and polish expected from modern streaming applications.

Unlike traditional browser-based clients, ParallaxTV uses native MPV playback to provide smooth playback of high bitrate media, anime, movies, and TV shows.

---

## Features

### Native MPV Playback

* Native MPV player integration
* Hardware accelerated playback
* HEVC / H.265 support
* High bitrate support
* Direct Play support
* Server transcoding support
* Audio track switching
* Subtitle switching
* Playback speed controls
* Fullscreen support

### Smart TV Experience

* Continue Watching
* Up Next episodes
* Watch History
* Favorites
* Resume playback
* Episode progress tracking
* Automatic playback reporting to Jellyfin
* Smart playback resume

### Anime Features

* AniList integration
* Anime discovery
* Voice actor information
* Anime recommendations
* Trailer support
* Anime cast pages
* Enhanced anime metadata

### Discovery System

* Trending content
* Recommended content
* Because You Watched
* Genre-based discovery
* Similar content suggestions
* Dynamic recommendation rows

### Advanced Playback Features

* Intro detection
* Outro detection
* Recap detection
* Skip Intro
* Skip Outro
* Auto Skip
* Next Episode countdown
* Trickplay previews
* Playback statistics overlay
* Keyboard shortcuts overlay

### Settings

* Appearance settings
* Playback settings
* Discovery settings
* Jellyfin settings
* About page

---

## Download

Prebuilt Windows installers are available through GitHub Releases.

Latest release:

https://github.com/parallaxtv/ParallaxTV/releases

Recommended:

* NSIS Installer (.exe)

Alternative:

* MSI Installer (.msi)

---

## Built With

### Frontend

* React
* TypeScript
* Vite
* Zustand

### Desktop Framework

* Tauri v2

### Playback Engine

* MPV

### Media Server

* Jellyfin

### Anime Metadata

* AniList
* Jikan

### Backend Services

* Cloudflare Workers
* Cloudflare KV

---

## Current Status

### Version

v0.1.0-alpha

### Development Status

ParallaxTV is actively developed and already provides a functional media experience.

The project is currently Alpha software and may contain bugs or unfinished features.

Expect:

* Bugs
* Missing features
* UI refinements
* Breaking changes between releases

---

## Installation

### Prerequisites

* Jellyfin Server
* Windows 10 or Windows 11
* Node.js 20+
* Rust
* Tauri v2

### Clone Repository

```bash
git clone https://github.com/parallaxtv/ParallaxTV.git
cd ParallaxTV
```

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

---

## Roadmap

### v0.1.x

* [x] Native MPV Playback
* [x] Continue Watching
* [x] Up Next
* [x] Favorites
* [x] Discovery System
* [x] Anime Integration
* [x] Details Page Refactor
* [x] Settings Page
* [x] Intro Skip
* [x] Outro Skip
* [x] Next Episode Overlay
* [x] Playback Statistics

### v0.2.x

* [ ] User Profiles
* [ ] Kids Profiles
* [ ] Anime Profiles
* [ ] Viewing Statistics
* [ ] Enhanced Search
* [ ] Better Recommendation Engine

### Future

* [ ] Download Manager
* [ ] Offline Playback
* [ ] Additional Discovery Providers
* [ ] Sync Features

---

## Contributing

Contributions are welcome.

If you find a bug or have an idea for improving ParallaxTV:

1. Open an Issue
2. Describe the problem clearly
3. Include reproduction steps
4. Suggest improvements when possible

Please check existing issues before creating duplicates.

---

## Feedback

We are actively looking for feedback from:

* Jellyfin users
* Anime fans
* Self-hosting enthusiasts
* Media server operators
* Desktop application users

Please use GitHub Issues and Discussions to share feedback, report bugs, and suggest features.

---

## Community

### GitHub

https://github.com/parallaxtv/ParallaxTV

### Discussions

https://github.com/parallaxtv/ParallaxTV/discussions

---

## Support Development

If you enjoy ParallaxTV and would like to support future development:

https://ko-fi.com/iitzmyung

Support helps fund development, testing hardware, software licenses, hosting costs, and future improvements.

---

## Created By

ParallaxTV is created and maintained by iiTzMYUNG.

---

## Disclaimer

ParallaxTV is an independent community project and is not affiliated with, endorsed by, or officially connected to the Jellyfin Project.

Jellyfin is a trademark of the Jellyfin Project.

---

## License

ParallaxTV is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

You are free to:

* Use
* Study
* Modify
* Distribute

the source code under the terms of the AGPL-3.0 license.

See the LICENSE file for full details.

---

## Trademark Notice

The ParallaxTV name, logo, branding, artwork, visual identity, and related assets are property of the ParallaxTV project.

The source code is licensed under AGPL-3.0.

Forks and derivative works may not use the ParallaxTV name, logo, branding, or visual assets in a way that implies affiliation with or endorsement by the ParallaxTV project without explicit permission.

Please choose a different name and branding for public forks and redistributions.

---

## Acknowledgements

Special thanks to:

* Jellyfin Team
* MPV Project
* AniList
* Jikan
* Tauri Team
* React Team
* Open Source Community

---

<p align="center">
Made with ❤️ for the Jellyfin Community
</p>
