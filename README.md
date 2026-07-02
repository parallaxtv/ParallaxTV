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

Enjoy smooth playback with native MPV integration, hardware acceleration, direct play support, subtitle controls, playback speed, and fullscreen-first behavior. This is the core of the experience: Jellyfin content rendered in a desktop environment that feels responsive, reliable, and built around the media itself.

### Beautiful, Focused UI

ParallaxTV is built to feel calm and premium. The layout is designed to keep attention on the content rather than the chrome around it, with a polished visual language that makes browsing and playback feel intentional.

### Discovery That Feels Personal

Continue watching, up next, recommendations, favorites, and discovery rows work together to make browsing feel intuitive. The app is designed to help users discover what they want to watch next without feeling buried under endless menus.

### Built for Anime and Media Fans

From anime discovery to rich details pages and recommendation flows, ParallaxTV is tuned for viewers who want more than a basic library UI. The experience is especially strong for users who care about presentation, metadata quality, and a more immersive viewing flow.

### Settings and Customization

ParallaxTV includes a dedicated settings experience for playback, appearance, discovery, and Jellyfin connection details. The goal is to make configuration feel straightforward while still giving power users plenty of control.

### Smart Playback Experience

The app supports resume behavior, episode progression, playback reporting, and a smoother continuity between browsing and watching. These details help the experience feel more like a cohesive media platform and less like a generic client.

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

### Development Notes

ParallaxTV is actively developed and is still evolving quickly. The current focus is on refining the overall experience, improving stability, and making the app feel more deliberate and cohesive across the full media flow.

---

## Project Philosophy

ParallaxTV exists to make Jellyfin feel like a true desktop application again: fast, elegant, and intentional.

It is built for users who want a more immersive experience without sacrificing the flexibility of self-hosted media. The project is guided by a simple idea: media should feel beautiful, responsive, and effortless to enjoy from the first launch.

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

Please include as much context as possible so the project can be improved effectively. Feedback from Jellyfin users, anime fans, and self-hosting enthusiasts is especially valuable as the project continues to grow.

---

## Community and Feedback

ParallaxTV is built with the community in mind. If you are a Jellyfin user, anime fan, media server operator, or desktop app enthusiast, your feedback helps shape the direction of the project.

Please use GitHub Issues and Discussions to report bugs, share ideas, and help define what the experience should become next.

---

## Support Development

If you enjoy ParallaxTV and want to support future development, consider supporting the project:

https://ko-fi.com/iitzmyung

Support helps fund development, testing, hardware, software licensing, hosting, and continued refinement of the experience.

---

## License

ParallaxTV is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

See the LICENSE file for full details.

---

## Trademark Notice

The ParallaxTV name, logo, branding, artwork, and related assets are the property of the ParallaxTV project. Forks and derivative works should use a different name and branding if they are distributed publicly.

---

## Acknowledgements

Special thanks to the Jellyfin team, the MPV project, the Tauri team, the React ecosystem, and the wider open-source community for making projects like this possible.

---

## Disclaimer

ParallaxTV is an independent community project and is not affiliated with, endorsed by, or officially connected to the Jellyfin Project. Jellyfin is a trademark of the Jellyfin Project.

---

<p align="center">
Made with ❤️ for the Jellyfin community.
</p>
