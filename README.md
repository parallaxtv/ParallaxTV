# ParallaxTV

<p align="center">
  <img src="src/assets/banner.png" alt="ParallaxTV Banner" />
</p>

<p align="center">
  <img src="docs/images/hero.gif" alt="ParallaxTV Action Demo" />
</p>

<h3 align="center">
  A Premium Jellyfin Desktop Client
</h3>

<p align="center">
  Built with Tauri, React, TypeScript and MPV
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v0.1.1-blue" alt="Version" />
  <img src="https://img.shields.io/badge/status-alpha-orange" alt="Status" />
  <img src="https://img.shields.io/badge/platform-windows-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/jellyfin-supported-00A4DC" alt="Jellyfin" />
  <img src="https://img.shields.io/badge/tauri-v2-purple" alt="Tauri" />
  <img src="https://img.shields.io/badge/react-19-61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/license-AGPL--3.0-green" alt="License" />
</p>

---

> [!WARNING]
> **ParallaxTV is currently in Alpha.**
> Features may change, bugs may exist, and breaking changes can occur between releases. Feedback, bug reports, and feature suggestions are highly encouraged!

## 🚀 What's New in v0.1.1

This release marks a major milestone for ParallaxTV, giving the client its own distinct visual identity and bringing massive improvements to the desktop experience.
* **Brand New UI:** A completely overhauled, modern interface designed specifically for a premium desktop experience.
* **Enhanced Discovery:** Smarter trending logic and refined recommendation rows to help you find what to watch faster.
* **Performance Polish:** Smoother transitions, faster metadata loading, and various under-the-hood MPV playback optimizations.

## 💡 Why ParallaxTV?

ParallaxTV bridges the gap between server flexibility and premium playback performance. While traditional browser-based clients struggle with high-bitrate media and heavy anime files, ParallaxTV utilizes native integration to deliver a flawless, stutter-free streaming experience.

| Feature | Standard Browser Clients | ParallaxTV |
| :--- | :--- | :--- |
| **Playback Engine** | Standard HTML5 | **Native MPV Player** |
| **High Bitrate / HEVC** | Often triggers server transcoding | **Direct Play supported natively** |
| **User Interface** | Web-based, functional | **Native desktop, highly polished** |
| **Anime Features** | Basic metadata | **Deep AniList & Jikan integration** |
| **Performance** | Browser-dependent limitations | **Deep hardware acceleration** |

## 🖼️ Screenshot Gallery

<p align="center">
  <img src="src/assets/screenshot-home.png" width="45%" alt="Home Dashboard" />
  <img src="src/assets/screenshot-player.png" width="45%" alt="MPV Player Interface" />
</p>
<p align="center">
  <img src="src/assets/screenshot-anime.png" width="45%" alt="Anime Discovery" />
  <img src="src/assets/screenshot-settings.png" width="45%" alt="Customization Settings" />
</p>

## ✨ Feature Highlights

### 🎥 Native MPV Playback
Say goodbye to unnecessary server transcoding. ParallaxTV offers hardware-accelerated playback with robust support for HEVC/H.265 and extreme bitrate files. Effortlessly switch audio tracks and subtitles, and utilize custom playback speed controls without dropping frames.

### 🎨 Beautiful Smart UI
Enjoy a highly responsive, modern interface that feels at home on your desktop. Keep track of your media with *Continue Watching*, *Up Next*, and dynamic *Watch History*. Seamlessly resume playback exactly where you left off, complete with automatic progress reporting to your Jellyfin server.

### 🌸 Built for Anime Fans
Elevate your anime library with native **AniList** and **Jikan** integration. Discover new shows, browse cast and voice actor information, watch trailers directly in the client, and get personalized recommendations based on your unique watch history.

### 🔍 Advanced Discovery & Skipping
Find exactly what you want to watch with dynamic recommendation rows, genre-based discovery, and trending content algorithms. When you're watching, take advantage of our smart detection tools:
* **Skip Intro / Outro**
* **Recap Detection**
* **Next Episode Countdown & Auto-Skip**
* **Trickplay Previews**

## 📦 Download & Installation

Prebuilt Windows installers are available through our [GitHub Releases](https://github.com/parallaxtv/ParallaxTV/releases) page.

* **Recommended:** `NSIS Installer (.exe)`
* **Alternative:** `MSI Installer (.msi)`

### 🛠️ Building from Source

If you prefer to build ParallaxTV yourself, ensure you have **Node.js 20+**, **Rust**, and **Tauri v2** installed on your Windows 10/11 machine.

```bash
# Clone the repository
git clone [https://github.com/parallaxtv/ParallaxTV.git](https://github.com/parallaxtv/ParallaxTV.git)
cd ParallaxTV

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build

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
