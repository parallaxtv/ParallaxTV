import { useState, useEffect } from "react";
import { observeProperties, MpvObservableProperty } from "tauri-plugin-libmpv-api";

const STAT_PROPERTIES = [
  ["estimated-vf-fps", "double", "none"],
  ["vo-drop-frame-count", "int", "none"],
  ["video-format", "string", "none"],
  ["audio-codec-name", "string", "none"],
  ["width", "int", "none"],
  ["height", "int", "none"],
  ["hwdec-current", "string", "none"],
] as const satisfies MpvObservableProperty[];

export function usePlaybackStats(mpvReady: boolean) {
  const [stats, setStats] = useState({
    fps: 0,
    droppedFrames: 0,
    videoCodec: "Unknown",
    audioCodec: "Unknown",
    resolution: "Unknown",
    hwdec: "No",
  });

  useEffect(() => {
    if (!mpvReady) return;

    let currentWidth = 0;
    let currentHeight = 0;

    const p = observeProperties(STAT_PROPERTIES, ({ name, data }) => {
      setStats((prev) => {
        const next = { ...prev };
        if (name === "estimated-vf-fps") next.fps = Number(data) || 0;
        if (name === "vo-drop-frame-count") next.droppedFrames = Number(data) || 0;
        if (name === "video-format") next.videoCodec = String(data || "Unknown").toUpperCase();
        if (name === "audio-codec-name") next.audioCodec = String(data || "Unknown").toUpperCase();
        if (name === "hwdec-current") next.hwdec = String(data || "No");
        if (name === "width") {
          currentWidth = Number(data) || 0;
          if (currentWidth && currentHeight) next.resolution = `${currentWidth}x${currentHeight}`;
        }
        if (name === "height") {
          currentHeight = Number(data) || 0;
          if (currentWidth && currentHeight) next.resolution = `${currentWidth}x${currentHeight}`;
        }
        return next;
      });
    });

    return () => {
      p.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [mpvReady]);

  return stats;
}