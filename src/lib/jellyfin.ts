import { Jellyfin } from "@jellyfin/sdk";

export const jellyfin = new Jellyfin({
  clientInfo: { name: "Jellyflix", version: "1.0.0" },
  deviceInfo: { name: "Windows Desktop", id: "jellyflix-desktop-app" },
});