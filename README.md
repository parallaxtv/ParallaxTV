# ParallaxTV

<p align="center">
  <img src="src/assets/banner.png" alt="ParallaxTV banner" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v0.1.1-blue" />
  <img src="https://img.shields.io/badge/platform-windows-blue" />
  <img src="https://img.shields.io/badge/tauri-v2-purple" />
  <img src="https://img.shields.io/badge/react-19-61DAFB" />
  <img src="https://img.shields.io/badge/typescript-5-3178C6" />
  <img src="https://img.shields.io/badge/license-AGPL--3.0-green" />
</p>

<h3 align="center">A polished Jellyfin desktop experience built for modern media lovers.</h3>

<p align="center">
  ParallaxTV brings Jellyfin to the desktop with native MPV playback, a refined interface, and a focus on discovery, anime, and comfort-first viewing.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/parallaxtv/ParallaxTV/main/docs/images/hero.gif" alt="ParallaxTV hero preview" width="100%" />
</p>

---

## What's New in v0.1.1

Version 0.1.1 marks the moment ParallaxTV starts feeling like its own product rather than a collection of features. It brings a more cohesive UI, smoother navigation, and a stronger foundation for the desktop-first experience.

### Highlights

- A refreshed experience built around the new media-first layout
- Better continuity across details, discovery, and playback flows
- Improved polish for anime-focused browsing and recommendations
- A stronger release identity for the project moving forward

---

## Why ParallaxTV?

Most Jellyfin clients feel like browser experiences wrapped in a shell. ParallaxTV is different.

It is designed for people who want Jellyfin to feel fast, immersive, and purpose-built for desktop use.

| Experience | Traditional web clients | ParallaxTV |
| --- | --- | --- |
| Playback | Browser-dependent | Native MPV playback |
| Interface | Generic | Tailored, modern, media-first |
| Anime support | Basic | Deep metadata and discovery |
| Desktop feel | Secondary | Primary design goal |
| Focus | Compatibility | Polish and experience |

---

## Feature Highlights

### Native MPV Playback

Enjoy smooth playback with native MPV integration, hardware acceleration, direct play support, subtitle controls, playback speed, and fullscreen-first behavior.

### Beautiful, Focused UI

ParallaxTV is built to feel calm and premium. The layout is designed to keep attention on the content rather than the chrome around it.

### Discovery That Feels Personal

Continue watching, up next, recommendations, favorites, and discovery rows work together to make browsing feel intuitive.

### Built for Anime and Media Fans

From anime discovery to rich details pages and recommendation flows, ParallaxTV is tuned for viewers who want more than a basic library UI.

---

## Preview Gallery

<p align="center">
  <img src="https://raw.githubusercontent.com/parallaxtv/ParallaxTV/main/docs/images/hero.gif" alt="ParallaxTV interface preview" width="100%" />
</p>

<p align="center">
  <img src="src/assets/banner.png" alt="ParallaxTV branding" width="70%" />
</p>

---

## Download

Prebuilt Windows builds are available through GitHub Releases.

- Latest release: https://github.com/parallaxtv/ParallaxTV/releases
- Recommended: NSIS installer (.exe)
- Alternative: MSI installer (.msi)

---

## Building from Source

### Requirements

- Windows 10 or Windows 11
- Node.js 20+
- Rust
- Tauri v2
- A Jellyfin server

### Setup

```bash
git clone https://github.com/parallaxtv/ParallaxTV.git
cd ParallaxTV
npm install
npm run tauri dev
```

For a production build:

```bash
npm run tauri build
```

---

## Project Philosophy

ParallaxTV exists to make Jellyfin feel like a true desktop application again: fast, elegant, and intentional.

It is built for users who want a more immersive experience without sacrificing the flexibility of self-hosted media.

---

## Roadmap

### v0.1.x

- [x] Native MPV playback
- [x] Continue watching and up next
- [x] Favorites and discovery flows
- [x] Settings and playback improvements
- [x] Intro/outro skipping and overlays

### v0.2.x

- [ ] User profiles
- [ ] Better search experience
- [ ] Expanded viewing statistics
- [ ] Improved recommendation engine

### Future

- [ ] Download manager
- [ ] Offline playback
- [ ] More discovery providers
- [ ] Sync and cross-device features

---

## Contributing

Contributions are welcome. If you have an idea, bug report, or improvement, open an issue or start a discussion.

Please include as much context as possible so the project can be improved effectively.

---

## Support Development

If you enjoy ParallaxTV and want to support future development, consider supporting the project:

https://ko-fi.com/iitzmyung

---

## License

ParallaxTV is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

See the LICENSE file for full details.

---

## Trademark Notice

The ParallaxTV name, logo, branding, artwork, and related assets are the property of the ParallaxTV project. Forks and derivative works should use a different name and branding if they are distributed publicly.

---

<p align="center">
Made with ❤️ for the Jellyfin community.
</p>
