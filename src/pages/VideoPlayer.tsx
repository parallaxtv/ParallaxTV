import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlayerStore } from "../store/player";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../lib/jellyfinApi";
import {
  MpvObservableProperty,
  command,
  setProperty,
  setVideoMarginRatio,
} from "tauri-plugin-libmpv-api";
import { ensureMpvReady, onMpvReady } from "../App";
import { listenMpvEvents, observeMpvProperties } from "../lib/mpvEvents";

// ─── SERVICES & COMPONENTS ────────────────────────────────────────────────────
import { reportPlaybackProgress, reportPlaybackStopped } from "../services/jellyfin/playback";
import { PlayerSettings, QUALITY_OPTIONS } from "../player/settings/PlayerSettings";
import { PlayerEpisodes } from "../player/overlays/PlayerEpisodes";
import { PlayerControls } from "../player/controls/PlayerControls";
import { NextEpisodeOverlay } from "../player/overlays/NextEpisodeOverlay";
import { StatsOverlay } from "../player/overlays/StatsOverlay";
import { ShortcutsOverlay } from "../player/overlays/ShortcutsOverlay";
import { TitleBar } from "../components/ui/TitleBar";

// ─── HOOKS ────────────────────────────────────────────────────────────────────
import { useSkipSegments } from "../player/hooks/useSkipSegments";
import { usePlaybackStats } from "../player/hooks/usePlaybackStats";

// ─── TYPES ────────────────────────────────────────────────────────────────────
import { MediaStream, SeasonInfo, EpisodeInfo } from "../types/player";

const END_COUNTDOWN_SECONDS = 15;
const OUTRO_COUNTDOWN_SECONDS = 10;

const OBSERVED_PROPERTIES = [
  ["pause",    "flag"],
  ["time-pos", "double", "none"],
  ["duration", "double", "none"],
] as const satisfies MpvObservableProperty[];

export function VideoPlayer({ authData }: { authData: any }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const item      = location.state?.item;

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  const prev = document.documentElement.style.backgroundColor;
  document.documentElement.style.backgroundColor = "transparent";
  return () => {
    document.documentElement.style.backgroundColor = prev;
  };
}, []);

  const {
    isPlaying,
    isFullscreen,
    volume,
    setPlaying,
    setPaused,
    setFullscreen,
    setVolume,
    setCurrentTime: setCurrentTimeSecs,
    setDuration: setDurationStore,
    setCurrentMedia,
  } = usePlayerStore();

  // ── LOCAL UI STATE ────────────────────────────────────────────────────────
  const [progress, setProgress] = useState(0);
  const [showControls,  setShowControls]  = useState(true);
  const [currentTime,   setCurrentTime]   = useState("0:00");
  const [duration,      setDuration]      = useState("0:00");
  const [durationSecs,  setDurationSecs]  = useState(0);
  const [isBuffering,   setIsBuffering]   = useState(true);
  const [playbackError, setPlaybackError] = useState("");
  const [mpvReady,      setMpvReady]      = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // ── STREAMS & SETTINGS ────────────────────────────────────────────────────
  const [mediaSourceId,  setMediaSourceId]  = useState("");
  const [audioTracks,    setAudioTracks]    = useState<MediaStream[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<MediaStream[]>([]);
  const [selectedAudio,    setSelectedAudio]    = useState<number | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number | null>(null);
  const [showSettings,   setShowSettings]   = useState(false);
  
  // ── SYNC REFS FOR MPV LOAD ──
  const selectedSubtitleRef = useRef<number | null>(null);
  const subtitleTracksRef = useRef<MediaStream[]>([]);
  useEffect(() => { selectedSubtitleRef.current = selectedSubtitle; }, [selectedSubtitle]);
  useEffect(() => { subtitleTracksRef.current = subtitleTracks; }, [subtitleTracks]);

  // Initialize speed from localStorage
  const initialSpeed = useMemo(() => {
    try { return parseFloat(localStorage.getItem("jellyfin_playback_speed") || "1.0"); } 
    catch { return 1.0; }
  }, []);
  const [playbackSpeed,  setPlaybackSpeed]  = useState(initialSpeed);
  
  const [videoQuality, setVideoQuality] = useState("auto");
  const [sourceWidth, setSourceWidth] = useState(1920); // Default to 1080p

  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));

  // ── UI / META ─────────────────────────────────────────────────────────────
  const [chapters,        setChapters]        = useState<any[]>([]);
  const [autoSkipEnabled, setAutoSkipEnabled] = useState(true);
  const [logoFailed,      setLogoFailed]      = useState(false);
  const [showShortcuts,   setShowShortcuts]   = useState(false);

  // Custom hook for Intro/Outro segments
  const { introSegments, activeSkipSegment, setActiveSkipSegment } = useSkipSegments(item, authData, chapters);

  // ── STATS FOR NERDS ───────────────────────────────────────────────────────
  const [showStats, setShowStats] = useState(false);
  const playbackStats = usePlaybackStats(mpvReady);

  // ── EPISODES MENU ─────────────────────────────────────────────────────────
  const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);
  const [seasons,          setSeasons]          = useState<SeasonInfo[]>([]);
  const [episodes,         setEpisodes]         = useState<EpisodeInfo[]>([]);
  const [seriesEpisodes,   setSeriesEpisodes]   = useState<EpisodeInfo[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [nextCountdown,    setNextCountdown]    = useState<number | null>(null);
  const [autoPlayCancelled, setAutoPlayCancelled] = useState(false);

  const [hoverTime,     setHoverTime]     = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTimeSecs = useRef(0);
  const stoppedSent     = useRef(false);
  const unlistenRef     = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!item) {
      navigate("/dashboard");
      return;
    }
    setCurrentMedia({ id: item.Id, title: item.Name, type: item.Type });
  }, [item, navigate, setCurrentMedia]);

  // ── NEXT / PREV EPISODE ───────────────────────────────────────────────────
  const nextEpisode = useMemo(() => {
    if (item?.Type !== "Episode" || seriesEpisodes.length === 0) return null;
    const idx = seriesEpisodes.findIndex((ep) => ep.Id === item.Id);
    return idx >= 0 ? seriesEpisodes[idx + 1] ?? null : null;
  }, [item, seriesEpisodes]);

  const prevEpisode = useMemo(() => {
    if (item?.Type !== "Episode" || seriesEpisodes.length === 0) return null;
    const idx = seriesEpisodes.findIndex((ep) => ep.Id === item.Id);
    return idx > 0 ? seriesEpisodes[idx - 1] ?? null : null;
  }, [item, seriesEpisodes]);

  // ── BUILD STREAM URL (Handles Transcoding) ────────────────────────────────
  const buildVideoUrl = useCallback(() => {
    if (!item || !authData) return "";
    
    const q = QUALITY_OPTIONS.find(opt => opt.id === videoQuality);
    
    if (videoQuality === "auto" || !q?.bitrate) {
      const query = new URLSearchParams({ api_key: authData.token, PlaySessionId: sessionId, static: "true" });
      if (mediaSourceId) query.set("MediaSourceId", mediaSourceId);
      return `${authData.serverUrl}/Videos/${item.Id}/stream?${query.toString()}`;
    } else {
      const query = new URLSearchParams({
        api_key: authData.token,
        PlaySessionId: sessionId,
        MediaSourceId: mediaSourceId || "",
        VideoCodec: "h264",
        AudioCodec: "aac,mp3",
        MaxStreamingBitrate: q.bitrate.toString(),
        TranscodingMaxAudioChannels: "2",
        RequireAvc: "false",
        SegmentContainer: "ts",
        MinSegments: "1",
        BreakOnNonKeyFrames: "True"
      });
      return `${authData.serverUrl}/Videos/${item.Id}/master.m3u8?${query.toString()}`;
    }
  }, [authData, item, mediaSourceId, sessionId, videoQuality]);

  useEffect(() => {
    let disposed = false;
    const offReady = onMpvReady(() => {
      if (!disposed) setMpvReady(true);
    });

    ensureMpvReady().catch((error) => {
      if (!disposed) {
        console.error("[MPV] Init failed", error);
        setPlaybackError("Failed to initialize video playback.");
        setIsBuffering(false);
      }
    });

    return () => {
      disposed = true;
      offReady();
    };
  }, []);

  // ── SUBSCRIBE to MPV property changes ────────────────────────────────────
  useEffect(() => {
    if (!mpvReady) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;

    unlisten = observeMpvProperties(OBSERVED_PROPERTIES, ({ name, data }) => {
      if (disposed) return;

      switch (name) {
        case "pause": {
          const paused = data as boolean;
          setPaused(paused); setPlaying(!paused);
          break;
        }
        case "time-pos": {
          const pos = data as number | null;
          if (pos == null) return;
          currentTimeSecs.current = pos;
          setCurrentTimeSecs(pos);
          setCurrentTime(formatTime(pos));
          setDurationSecs((dur) => {
            if (dur > 0) setProgress((pos / dur) * 100);
            return dur;
          });
          break;
        }
        case "duration": {
          const dur = data as number | null;
          if (dur == null) return;
          setDurationSecs(dur);
          setDuration(formatTime(dur));
          setDurationStore(dur);
          break;
        }
      }
    });
    unlistenRef.current = unlisten;

    return () => {
      disposed = true;
      unlisten?.();
      if (unlistenRef.current === unlisten) unlistenRef.current = null;
    };
  }, [mpvReady]);

  useEffect(() => {
    if (!mpvReady) return;
    setVideoMarginRatio({ left: 0, right: 0, top: 0, bottom: 0 }).catch(console.error);
  }, [mpvReady]);

  // ── LOAD VIDEO once MPV is ready and mediaSourceId is known ──────────────
  const hasLoaded = useRef(false);
  const prevQualityRef = useRef(videoQuality);

  useEffect(() => {
    if (!mpvReady || !item || !authData || !mediaSourceId) return;
    
    const isQualitySwitch = prevQualityRef.current !== videoQuality;
    prevQualityRef.current = videoQuality;

    if (hasLoaded.current && !isQualitySwitch) return;
    hasLoaded.current = true;

    const url = buildVideoUrl();
    const startPos = isQualitySwitch 
      ? currentTimeSecs.current 
      : (item?.UserData?.PlaybackPositionTicks ? item.UserData.PlaybackPositionTicks / 10000000 : 0);

    if (!isQualitySwitch) {
      setProgress(0); setCurrentTime("0:00"); setDuration("0:00"); setDurationSecs(0);
      setShowEpisodesMenu(false); setShowSettings(false); setLogoFailed(false);
      setAutoPlayCancelled(false); setPlaying(true);
      stoppedSent.current = false;
      setPlaybackSpeed(initialSpeed);
      setProperty("speed", initialSpeed).catch(() => {});
      
      try {
        const history = JSON.parse(localStorage.getItem("localPlayHistory") || "{}");
        history[item.Id] = Date.now();
        if (item.SeriesId) history[item.SeriesId] = Date.now();
        localStorage.setItem("localPlayHistory", JSON.stringify(history));
      } catch {}
    }
    
    setIsBuffering(true);
    setPlaybackError(""); 
    setNextCountdown(null);

    let disposed = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let unlistenFileLoaded: (() => void) | null = null;

    const load = async () => {
      const MAX_RETRIES = 10;
      const RETRY_DELAY = 300;

      unlistenFileLoaded = listenMpvEvents((event) => {
        if (disposed) return;
        if (event.event === "file-loaded") {
          unlistenFileLoaded?.();
          unlistenFileLoaded = null;
          setIsBuffering(false);
          setPlaying(true);

          // ── FIX: Force MPV to respect our Subtitle State instantly ──
          if (selectedSubtitleRef.current === null) {
            command("set", ["sid", "no"]).catch(() => {});
          } else {
            const mpvSid = subtitleTracksRef.current.findIndex(t => t.Index === selectedSubtitleRef.current) + 1;
            if (mpvSid > 0) command("set", ["sid", mpvSid]).catch(() => {});
          }

          resumeTimer = setTimeout(async () => {
            if (!disposed) await setProperty("pause", false).catch(() => {});
          }, 100);
        }
      });

      if (disposed) {
        unlistenFileLoaded?.();
        return;
      }

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (disposed) return;
        try {
          const opts = startPos > 0 ? `start=${startPos}` : "";
          await command("loadfile", opts ? [url, "replace", "0", opts] : [url, "replace"]);
          return;
        } catch (e: any) {
          const msg = String(e);
          if (!disposed && (msg.includes("not found") || msg.includes("mpv instance")) && attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, RETRY_DELAY));
            continue;
          }
          if (disposed) return;
          console.error("MPV load failed", e);
          unlistenFileLoaded?.();
          setPlaybackError("Failed to start playback.");
          setIsBuffering(false);
          return;
        }
      }
    };
    load();
    return () => {
      disposed = true;
      unlistenFileLoaded?.();
      if (resumeTimer) clearTimeout(resumeTimer);
    };
  }, [mpvReady, item?.Id, mediaSourceId, videoQuality]);

  useEffect(() => { hasLoaded.current = false; }, [item?.Id]);

  // ── INTRO/OUTRO SKIP LOGIC ───────────────────────────────────────────────
  const introSegmentsRef    = useRef(introSegments);
  const autoSkipEnabledRef  = useRef(autoSkipEnabled);
  const nextEpisodeRef      = useRef(nextEpisode);
  const autoPlayCancelledRef = useRef(autoPlayCancelled);
  
  useEffect(() => { introSegmentsRef.current    = introSegments;    }, [introSegments]);
  useEffect(() => { autoSkipEnabledRef.current  = autoSkipEnabled;  }, [autoSkipEnabled]);
  useEffect(() => { nextEpisodeRef.current      = nextEpisode;      }, [nextEpisode]);
  useEffect(() => { autoPlayCancelledRef.current = autoPlayCancelled;}, [autoPlayCancelled]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const pos = currentTimeSecs.current;
      const dur = durationSecs;

      const inSegment = introSegmentsRef.current.find((s) => pos >= s.startSecs && pos < s.endSecs);
      setActiveSkipSegment(inSegment?.type ?? null);

      if (autoSkipEnabledRef.current && inSegment) {
        const isEnding = inSegment.type === "Credits" || inSegment.type === "Preview";
        if (isEnding && nextEpisodeRef.current) {
          setActiveSkipSegment(null);
          playNextEpisodeRef.current?.();
        } else {
          await setProperty("time-pos", inSegment.endSecs).catch(() => {});
          setActiveSkipSegment(null);
        }
      }

      if (nextEpisodeRef.current && !autoPlayCancelledRef.current && nextCountdown === null && dur > 0 && pos > 0) {
        const remaining = Math.max(0, dur - pos);
        const currentTicks = pos * 10000000;
        const isEndChapter = Boolean(chapters.find((ch) => {
          const name = String(ch.Name ?? "").toLowerCase();
          return (name.includes("outro") || name.includes("credit")) && currentTicks >= (ch.StartPositionTicks ?? 0);
        }));
        if (isEndChapter) setNextCountdown(OUTRO_COUNTDOWN_SECONDS);
        else if (remaining <= END_COUNTDOWN_SECONDS) setNextCountdown(Math.max(1, Math.ceil(remaining)));
      }

      if (dur > 0 && pos >= dur - 0.5) {
        setPlaying(false); setShowControls(true);
        if (nextEpisodeRef.current && !autoPlayCancelledRef.current) {
          if (nextCountdown !== null) playNextEpisodeRef.current?.();
          else setNextCountdown(OUTRO_COUNTDOWN_SECONDS);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [durationSecs, nextCountdown, chapters]);

  // ── SESSION REPORTING ─────────────────────────────────────────────────────
  const reportProgress = useCallback(async (isStopping = false) => {
    if (!item || !authData || stoppedSent.current) return;
    const ticks = Math.floor(currentTimeSecs.current * 10000000);
    
    try {
      if (isStopping) {
        stoppedSent.current = true;
        await reportPlaybackStopped(authData, item.Id, ticks);
      } else {
        await reportPlaybackProgress(authData, item.Id, ticks, !isPlaying, isMuted);
      }
    } catch (err) {
      if (isStopping) console.error("Failed to send stop event", err);
    }
  }, [item, authData, isPlaying, isMuted]);

  useEffect(() => {
    if (!item || !authData) return;
    reportProgress(false);
    const interval = setInterval(() => { if (isPlaying) reportProgress(false); }, 10000);
    return () => clearInterval(interval);
  }, [item?.Id, authData, isPlaying]);

  // ── MINIMIZE / EXIT ───────────────────────────────────────────────────────
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (err) {
      console.error("Minimize failed:", err);
    }
  };

  const handleExit = useCallback(async () => {
    const appWindow = getCurrentWindow();
    if (await appWindow.isFullscreen()) {
      await appWindow.setFullscreen(false);
      setFullscreen(false);
    }

    await setProperty("pause", true).catch(() => {});
    setPlaying(false);
    await reportProgress(true);
    await command("stop", []).catch(() => {});
    navigate(-1);
  }, [reportProgress, navigate, setFullscreen]);

  const handleExitRef      = useRef(handleExit);
  const playNextEpisodeRef = useRef<(() => void) | null>(null);
  useEffect(() => { handleExitRef.current = handleExit; }, [handleExit]);

  // ── FETCH MEDIA STREAMS ───────────────────────────────────────────────────
  useEffect(() => {
    if (!item || !authData) return;
    async function fetchStreams() {
      try {
        const res  = await fetch(`${authData.serverUrl}/Users/${authData.userId}/Items/${item.Id}?fields=MediaSources,Chapters&api_key=${authData.token}`);
        const data = await res.json();
        if (data.Chapters) setChapters(data.Chapters);
        if (data.MediaSources?.length > 0) {
          const source = data.MediaSources[0];
          setMediaSourceId(source.Id);

          // ── Grab the source video width for Quality Options ──
          const video = source.MediaStreams?.find((s: any) => s.Type === "Video");
          if (video?.Width) setSourceWidth(video.Width);
          
          const audio = source.MediaStreams?.filter((s: any) => s.Type === "Audio") || [];
          setAudioTracks(audio);
          
          const subs = source.MediaStreams?.filter((s: any) => s.Type === "Subtitle") || [];
          setSubtitleTracks(subs);
          
          const defaultAudio = audio.find((s: any) => s.Index === source.DefaultAudioStreamIndex) || audio[0];
          setSelectedAudio(defaultAudio?.Index ?? null);

          // Read Jellyfin's Default Subtitle Preference
          const defaultSub = subs.find((s: any) => s.Index === source.DefaultSubtitleStreamIndex);
          setSelectedSubtitle(defaultSub?.Index ?? null);
        }
      } catch (err) { console.error("Failed to fetch streams", err); }
    }
    fetchStreams();
  }, [item, authData]);

  // ── FETCH SERIES DATA ─────────────────────────────────────────────────────
  useEffect(() => {
    if (item?.Type === "Episode" && item.SeriesId && authData) {
      async function fetchSeriesData() {
        try {
          const itemsApi  = getItemsApi(createJellyfinApi(authData.serverUrl, authData.token));
          const seasonRes = await itemsApi.getItems({ userId: authData.userId, parentId: item.SeriesId, includeItemTypes: ["Season"], sortBy: ["SortName"] });
          if (seasonRes.data.Items) { setSeasons(seasonRes.data.Items as SeasonInfo[]); setSelectedSeasonId(item.SeasonId || seasonRes.data.Items[0].Id); }
        } catch {}
      }
      fetchSeriesData();
    }
  }, [item, authData]);

  useEffect(() => {
    if (selectedSeasonId && authData) {
      async function fetchEpisodes() {
        try {
          const itemsApi = getItemsApi(createJellyfinApi(authData.serverUrl, authData.token));
          const res      = await itemsApi.getItems({ userId: authData.userId, parentId: selectedSeasonId, includeItemTypes: ["Episode"], sortBy: ["IndexNumber"], imageTypes: ["Primary"], fields: ["Overview"] as any });
          if (res.data.Items) setEpisodes(res.data.Items as EpisodeInfo[]);
        } catch {}
      }
      fetchEpisodes();
    }
  }, [selectedSeasonId, authData]);

  useEffect(() => {
    if (item?.Type !== "Episode" || !item.SeriesId || !authData) { setSeriesEpisodes([]); return; }
    async function fetchSeriesEpisodes() {
      try {
        const itemsApi = getItemsApi(createJellyfinApi(authData.serverUrl, authData.token));
        const res      = await itemsApi.getItems({ userId: authData.userId, parentId: item.SeriesId, recursive: true, includeItemTypes: ["Episode"], sortBy: ["SortName"], imageTypes: ["Primary"], fields: ["Overview"] as any });
        const sorted   = (res.data.Items ?? []).slice().sort((a: any, b: any) => {
          const sa = a.ParentIndexNumber ?? 0, sb = b.ParentIndexNumber ?? 0;
          if (sa !== sb) return sa - sb;
          return (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0);
        });
        setSeriesEpisodes(sorted as EpisodeInfo[]);
      } catch { setSeriesEpisodes([]); }
    }
    fetchSeriesEpisodes();
  }, [item, authData]);

  // ── NAVIGATION ────────────────────────────────────────────────────────────
  const playNextEpisode = useCallback(() => {
    if (!nextEpisode) return;
    setNextCountdown(null); setAutoPlayCancelled(false);
    navigate(`/play/${nextEpisode.Id}`, { state: { item: nextEpisode }, replace: true });
  }, [nextEpisode, navigate]);

  const playPrevEpisode = () => {
    if (!prevEpisode) return;
    navigate(`/play/${prevEpisode.Id}`, { state: { item: prevEpisode }, replace: true });
  };

  useEffect(() => { playNextEpisodeRef.current = playNextEpisode; }, [playNextEpisode]);

  // ── PLAYBACK CONTROLS ─────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      await setProperty("pause", true);
      setPlaying(false); setShowControls(true);
    } else {
      await setProperty("pause", false);
      setPlaying(true);
    }
  }, [isPlaying]);

  const triggerSeek = useCallback(async (targetTime: number) => {
    const total = durationSecs || (item?.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0);
    const safe  = Math.max(0, Math.min(targetTime, total));
    await setProperty("time-pos", safe).catch(() => {});
    if (total > 0) setProgress((safe / total) * 100);
  }, [durationSecs, item]);
  
  const handleScreenshot = useCallback(async () => {
    try {
      await command("screenshot", ["subtitles"]);
    } catch (e) {
      console.error("Screenshot failed", e);
    }
  }, []);

  // ── SETTINGS: AUDIO / SUBTITLES / VOLUME / SPEED ──────────────────────────
  const handleAudioChange = useCallback(async (index: number) => {
    if (index === selectedAudio) return;
    const mpvAid = audioTracks.findIndex((t) => t.Index === index) + 1;
    if (mpvAid <= 0) return;
    try { await command("set", ["aid", mpvAid]); setSelectedAudio(index); }
    catch { try { await setProperty("aid", mpvAid); setSelectedAudio(index); } catch (e) { console.error("Audio switch failed", e); } }
  }, [selectedAudio, audioTracks]);

  const handleSubtitleChange = useCallback(async (index: number | null) => {
    setSelectedSubtitle(index);
    if (index === null) { await command("set", ["sid", "no"]).catch(() => {}); }
    else {
      const mpvSid = subtitleTracks.findIndex((t) => t.Index === index) + 1;
      if (mpvSid > 0) { try { await command("set", ["sid", mpvSid]); } catch { await setProperty("sid", mpvSid).catch(() => {}); } }
    }
  }, [subtitleTracks]);

  const handleSpeedChange = useCallback(async (speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem("jellyfin_playback_speed", speed.toString());
    await setProperty("speed", speed).catch(console.error);
  }, []);

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val); setIsMuted(val === 0);
    await setProperty("volume", val * 100);
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await setProperty("mute", newMuted);
  };

  // ── NEXT COUNTDOWN ────────────────────────────────────────────────────────
  useEffect(() => {
    if (nextCountdown === null || autoPlayCancelled) return;
    if (nextCountdown <= 0) { playNextEpisode(); return; }
    const timer = setTimeout(() => setNextCountdown((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(timer);
  }, [nextCountdown, autoPlayCancelled]);

  // ── PROGRESS BAR ──────────────────────────────────────────────────────────
  const seekFromClientX = (clientX: number, element: HTMLDivElement) => {
    const total = durationSecs || (item?.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0);
    if (total <= 0) return;
    const rect  = element.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    triggerSeek(total * ratio);
  };

  const handleProgressSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const total = durationSecs || (item?.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0);
    if (total > 0) triggerSeek((total / 100) * parseFloat(e.target.value));
  };

  const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); seekFromClientX(e.clientX, e.currentTarget); };
  const handleProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (e.buttons !== 1) return; seekFromClientX(e.clientX, e.currentTarget); };
  const handleProgressPointerUp = (e: React.PointerEvent<HTMLDivElement>) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); seekFromClientX(e.clientX, e.currentTarget); };
  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos  = (e.clientX - rect.left) / rect.width;
    setHoverPosition(pos * 100);
    const total = durationSecs || (item?.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0);
    if (total > 0) setHoverTime(total * pos);
  };

  // ── FULLSCREEN ────────────────────────────────────────────────────────────
  const toggleFullscreen = async () => {
    try {
      const appWindow = getCurrentWindow();
      const isWindowFullscreen = await appWindow.isFullscreen();
      
      await appWindow.setFullscreen(!isWindowFullscreen);
      setFullscreen(!isWindowFullscreen);
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  const exitFullscreen = async () => {
    try {
      const appWindow = getCurrentWindow();
      if (!(await appWindow.isFullscreen())) {
        return false;
      }
      await appWindow.setFullscreen(false);
      setFullscreen(false);
      return true;
    } catch (err) {
      console.error("Exit fullscreen failed:", err);
      return false;
    }
  };

  useEffect(() => {
    const syncFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        setFullscreen(await appWindow.isFullscreen());
      } catch (err) {
        console.error("Failed to sync fullscreen state:", err);
      }
    };

    syncFullscreen();

    window.addEventListener("resize", syncFullscreen);
    return () => window.removeEventListener("resize", syncFullscreen);
  }, [setFullscreen]);

  // ── HIDE CONTROLS ─────────────────────────────────────────────────────────
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying && !showSettings && !showEpisodesMenu && !showShortcuts) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    handleMouseMove();
    return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current); };
  }, [isPlaying, showSettings, showEpisodesMenu, showShortcuts]);

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": e.preventDefault(); triggerSeek(currentTimeSecs.current + 10); break;
        case "ArrowLeft":  e.preventDefault(); triggerSeek(currentTimeSecs.current - 10); break;
        case "ArrowUp":    e.preventDefault(); { const v = Math.min(1, volume + 0.1); setVolume(v); setIsMuted(false); setProperty("volume", v * 100); } break;
        case "ArrowDown":  e.preventDefault(); { const v = Math.max(0, volume - 0.1); setVolume(v); setIsMuted(v === 0); setProperty("volume", v * 100); } break;
        case "m": case "M": toggleMute(); break;
        case "f": case "F": toggleFullscreen(); break;
        case "-": case "_": e.preventDefault(); handleMinimize(); break;
        case "n": case "N": if (nextEpisode) playNextEpisode(); break;
        case "p": case "P": if (prevEpisode) playPrevEpisode(); break;
        case "s": case "S": e.preventDefault(); handleScreenshot(); break;
        case "?":
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          break;
        case "d": case "D":
          if (e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            setShowStats((prev) => !prev);
          }
          break;
        case "Escape":
          if (showSettings)      { setShowSettings(false); }
          else if (showEpisodesMenu) { setShowEpisodesMenu(false); }
          else if (showStats) { setShowStats(false); }
          else if (showShortcuts) { setShowShortcuts(false); }
          else if (nextCountdown !== null) { setAutoPlayCancelled(true); setNextCountdown(null); }
          else if (await exitFullscreen()) { return; }
          else handleExitRef.current();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPlaying, showSettings, showEpisodesMenu, showStats, showShortcuts, nextEpisode, nextCountdown, triggerSeek, togglePlay, volume, handleScreenshot]);

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const formatTime = (s: number) => {
    if (!Number.isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };
  
  // Track formatting for Stats Overlay
  const activeAudio = audioTracks.find(t => t.Index === selectedAudio);
  const activeSub = subtitleTracks.find(t => t.Index === selectedSubtitle);
  const activeQualityLabel = QUALITY_OPTIONS.find(q => q.id === videoQuality)?.label || "Auto (Direct Play)";

  if (!item) return null;

  // ── TRICKPLAY ─────────────────────────────────────────────────────────────
  let trickplayStyle = {};
  if (hoverTime !== null && mediaSourceId) {
    const TI = 10, TW = 10, TH = 10, TPI = TW * TH;
    const ti  = Math.floor(hoverTime / TI);
    const img = Math.floor(ti / TPI);
    const tw  = ti % TPI;
    const col = tw % TW, row = Math.floor(tw / TW);
    const url = `${authData.serverUrl}/Videos/${item.Id}/Trickplay/320/${img}.jpg?api_key=${authData.token}&MediaSourceId=${mediaSourceId}`;
    trickplayStyle = { backgroundImage: `url('${url}')`, backgroundSize: `${160 * TW}px ${90 * TH}px`, backgroundPosition: `-${col * 160}px -${row * 90}px`, backgroundRepeat: "no-repeat" };
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center font-sans animate-[fadeIn_0.3s_ease-out]"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* ── CONDITIONAL TITLE BAR ── */}
      {!isFullscreen && (
        <TitleBar 
          isTransparent={true} 
          className={showControls ? "opacity-100" : "opacity-0 pointer-events-none"} 
        />
      )}

      <div
        className="absolute inset-0 z-0"
        onClick={() => {
          if (showSettings) setShowSettings(false);
          else if (showEpisodesMenu) setShowEpisodesMenu(false);
          else togglePlay();
        }}
      />

      {isBuffering && !playbackError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-12 h-12 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        </div>
      )}

      {playbackError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50 px-6">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[#141414]/95 p-6 text-center shadow-2xl">
            <h2 className="text-white text-xl font-bold mb-2">Playback unavailable</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">{playbackError}</p>
            <button onClick={handleExit} className="bg-white text-black font-bold px-6 py-2.5 rounded-full hover:bg-gray-200 transition-colors">Go Back</button>
          </div>
        </div>
      )}

      <NextEpisodeOverlay
        nextEpisode={nextEpisode as any}
        nextCountdown={nextCountdown}
        autoPlayCancelled={autoPlayCancelled}
        authData={authData}
        onPlayNext={playNextEpisode}
        onCancel={() => { 
          setAutoPlayCancelled(true); 
          setNextCountdown(null); 
        }}
      />

      {/* ── EXTERNAL COMPONENTS ───────────────────────────────────────────── */}
      <ShortcutsOverlay 
        show={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />

      <StatsOverlay 
        show={showStats} 
        stats={playbackStats} 
        playbackSpeed={playbackSpeed}
        audioTrackName={activeAudio?.DisplayTitle || activeAudio?.Language || `Track ${activeAudio?.Index || 1}`}
        subtitleTrackName={selectedSubtitle === null ? "Off" : (activeSub?.DisplayTitle || activeSub?.Language || `Track ${activeSub?.Index || 1}`)}
        currentTime={currentTime}
        duration={duration}
        videoQualityLabel={activeQualityLabel}
      />

      <PlayerEpisodes 
        show={showEpisodesMenu && item.Type === "Episode"} 
        onClose={() => setShowEpisodesMenu(false)} 
        seasons={seasons} 
        episodes={episodes} 
        selectedSeasonId={selectedSeasonId} 
        onSeasonSelect={setSelectedSeasonId} 
        currentItemId={item.Id} 
        authData={authData} 
        onEpisodeClick={(ep) => navigate(`/play/${ep.Id}`, { state: { item: ep }, replace: true })} 
        currentProgress={progress}
      />

      <PlayerSettings 
        show={showSettings} 
        autoSkipEnabled={autoSkipEnabled} 
        onToggleAutoSkip={setAutoSkipEnabled} 
        videoQuality={videoQuality}
        onVideoQualityChange={setVideoQuality}
        sourceWidth={sourceWidth}
        audioTracks={audioTracks} 
        selectedAudio={selectedAudio} 
        onAudioChange={handleAudioChange} 
        subtitleTracks={subtitleTracks} 
        selectedSubtitle={selectedSubtitle} 
        onSubtitleChange={handleSubtitleChange} 
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
      />

      {/* ── CONTROLS OVERLAY ───────────────────────────────────────────────── */}
      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-500 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-start px-8 pt-8 pb-4 pointer-events-auto">
          <button onClick={handleExit} className="text-white hover:text-red-500 transition-colors mr-6 mt-1">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col justify-center">
            {!logoFailed
              ? (<img src={`${authData.serverUrl}/Items/${item.Type === "Episode" ? item.SeriesId : item.Id}/Images/Logo?fillHeight=80&quality=96&api_key=${authData.token}`} alt={item.Name} className="max-h-14 object-contain origin-left drop-shadow-md" onError={() => setLogoFailed(true)} />)
              : (<h2 className="text-white font-bold text-2xl drop-shadow-md">{item.Type === "Episode" ? item.SeriesName || item.Name : item.Name}</h2>)}
            {item.Type === "Episode" && (<span className="text-gray-300 text-sm font-medium mt-1.5 drop-shadow-md">Episode {item.IndexNumber}: {item.Name}</span>)}
          </div>
        </div>

        <div className="px-8 pb-8 pt-4 pointer-events-auto">
          {activeSkipSegment && !autoSkipEnabled && (
            <div className="flex justify-end mb-4">
              <button
                onClick={async () => {
                  const seg = introSegments.find((s) => s.type === activeSkipSegment);
                  if (!seg) return;
                  const isEnding = seg.type === "Credits" || seg.type === "Preview";
                  if (isEnding && nextEpisode) { setActiveSkipSegment(null); playNextEpisode(); }
                  else { await setProperty("time-pos", seg.endSecs); setActiveSkipSegment(null); }
                }}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white font-bold text-sm px-6 py-2.5 rounded-full transition-all hover:scale-105 active:scale-100 shadow-lg"
                style={{ animation: "fadeIn 0.2s ease-out both" }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
                {activeSkipSegment === "Introduction" ? "Skip Opening"
                  : activeSkipSegment === "Credits" && nextEpisode ? "Skip to Next Episode"
                  : activeSkipSegment === "Credits" ? "Skip Credits"
                  : activeSkipSegment === "Recap" ? "Skip Recap"
                  : activeSkipSegment === "Preview" ? "Skip Preview"
                  : `Skip ${activeSkipSegment}`}
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 mb-4 relative">
            <span className="text-white text-sm font-medium w-12 text-right">{currentTime}</span>
            <div
              className="relative flex-1 h-3 group cursor-pointer flex items-center"
              onPointerDown={handleProgressPointerDown}
              onPointerMove={handleProgressPointerMove}
              onPointerUp={handleProgressPointerUp}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={() => setHoverTime(null)}
            >
              {hoverTime !== null && mediaSourceId && (
                <div className="absolute bottom-8 w-[160px] flex flex-col items-center pointer-events-none z-[60]" style={{ left: `calc(${hoverPosition}% - 80px)` }}>
                  <div className="w-[160px] h-[90px] bg-[#141414] border border-white/20 rounded-md overflow-hidden shadow-2xl mb-1.5"><div className="w-full h-full" style={trickplayStyle} /></div>
                  <span className="text-white text-xs font-bold drop-shadow-md bg-black/90 px-2 py-0.5 rounded">{formatTime(hoverTime)}</span>
                </div>
              )}
              <input type="range" min="0" max="100" step="0.1" value={progress} onChange={handleProgressSeek} className="absolute w-full h-full opacity-0 cursor-pointer z-20 pointer-events-none" />
              <div className="absolute w-full h-1.5 bg-white/20 rounded-full z-0" />

              {introSegments.map((seg, i) => {
                const total = durationSecs || (item?.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0);
                if (!total) return null;
                const left  = (seg.startSecs / total) * 100;
                const width = ((seg.endSecs - seg.startSecs) / total) * 100;
                const color = seg.type === "Introduction" ? "bg-yellow-400/70" : seg.type === "Credits" ? "bg-blue-400/70" : seg.type === "Recap" ? "bg-purple-400/70" : "bg-green-400/70";
                return <div key={i} className={`absolute h-1.5 ${color} z-[1] rounded-sm pointer-events-none`} style={{ left: `${left}%`, width: `${width}%` }} title={seg.type} />;
              })}

              {chapters.length > 0 && (() => {
                const total = durationSecs || (item?.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0);
                if (!total) return null;
                return chapters.slice(1).map((ch: any, i: number) => {
                  const pct = ((ch.StartPositionTicks / 10_000_000) / total) * 100;
                  return <div key={i} className="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-white/50 z-[2] pointer-events-none rounded-full" style={{ left: `${pct}%` }} />;
                });
              })()}

              {hoverTime !== null && (() => {
                const seg   = introSegments.find((s) => hoverTime >= s.startSecs && hoverTime < s.endSecs);
                if (!seg) return null;
                const label = seg.type === "Introduction" ? "Opening" : seg.type === "Credits" ? "Credits / Ending" : seg.type === "Recap" ? "Recap" : seg.type === "Preview" ? "Preview" : seg.type;
                const color = seg.type === "Introduction" ? "bg-yellow-400 text-black" : seg.type === "Credits" ? "bg-blue-400 text-black" : seg.type === "Recap" ? "bg-purple-400 text-white" : "bg-green-400 text-black";
                return <div className={`absolute text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none z-[56] whitespace-nowrap -translate-x-1/2 ${color}`} style={{ left: `${hoverPosition}%`, bottom: "-22px" }}>{label}</div>;
              })()}

              <div className="absolute h-1.5 bg-red-600 rounded-full transition-all duration-100 z-[3]" style={{ width: `${progress}%` }} />
              <div className="absolute h-3.5 w-3.5 bg-red-600 rounded-full z-[4] shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200" style={{ left: `calc(${progress}% - 7px)` }} />
            </div>
            <span className="text-white text-sm font-medium w-12">{duration}</span>
          </div>

          <PlayerControls
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onSeekRelative={(secs) => triggerSeek(currentTimeSecs.current + secs)}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            item={item}
            prevEpisode={prevEpisode as any}
            nextEpisode={nextEpisode as any}
            onPlayPrevEpisode={playPrevEpisode}
            onPlayNextEpisode={playNextEpisode}
            showEpisodesMenu={showEpisodesMenu}
            onToggleEpisodesMenu={() => { setShowEpisodesMenu(!showEpisodesMenu); setShowSettings(false); }}
            showSettings={showSettings}
            onToggleSettings={() => { setShowSettings(!showSettings); setShowEpisodesMenu(false); }}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onScreenshot={handleScreenshot}
          />
        </div>
      </div>
    </div>
  );
}
