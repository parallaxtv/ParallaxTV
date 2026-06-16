import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlayerStore } from "../store/player";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { createJellyfinApi } from "../lib/jellyfinApi";
import {
  MpvObservableProperty,
  observeProperties,
  listenEvents,
  command,
  setProperty,
  setVideoMarginRatio,
} from "tauri-plugin-libmpv-api";
import { onMpvReady } from "../App";

const END_COUNTDOWN_SECONDS = 15;
const OUTRO_COUNTDOWN_SECONDS = 10;

// ── MPV OBSERVED PROPERTIES ───────────────────────────────────────────────────
// These fire callbacks in real-time — no polling needed for pause/time/duration
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

  // ── VOLUME ────────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);

  // ── STREAMS & SETTINGS ────────────────────────────────────────────────────
  const [mediaSourceId,  setMediaSourceId]  = useState("");
  const [audioTracks,    setAudioTracks]    = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [selectedAudio,    setSelectedAudio]    = useState<number | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number | null>(null);
  const [showSettings,   setShowSettings]   = useState(false);

  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));

  // ── UI / META ─────────────────────────────────────────────────────────────
  const [chapters,        setChapters]        = useState<any[]>([]);
  const [introSegments,   setIntroSegments]   = useState<{ type: string; startSecs: number; endSecs: number }[]>([]);
  const [activeSkipSegment, setActiveSkipSegment] = useState<string | null>(null);
  const [autoSkipEnabled, setAutoSkipEnabled] = useState(true);
  const [logoFailed,      setLogoFailed]      = useState(false);

  // ── EPISODES MENU ─────────────────────────────────────────────────────────
  const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);
  const [seasons,          setSeasons]          = useState<any[]>([]);
  const [episodes,         setEpisodes]         = useState<any[]>([]);
  const [seriesEpisodes,   setSeriesEpisodes]   = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [nextCountdown,    setNextCountdown]    = useState<number | null>(null);
  const [autoPlayCancelled, setAutoPlayCancelled] = useState(false);

  const seasonsRef  = useRef<HTMLDivElement>(null);
  const episodesRef = useRef<HTMLDivElement>(null);
  const [canScrollSeasonLeft,  setCanScrollSeasonLeft]  = useState(false);
  const [canScrollSeasonRight, setCanScrollSeasonRight] = useState(true);

  const dragState = useRef({
    isSeasonDragging: false, seasonStartX: 0, seasonScrollLeft: 0,
    isEpisodeDragging: false, episodeStartY: 0, episodeScrollTop: 0, dragDistance: 0,
  });

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

    setCurrentMedia({
      id: item.Id,
      title: item.Name,
      type: item.Type,
    });

  }, [item, navigate, setCurrentMedia]);

  // ── NEXT / PREV EPISODE ───────────────────────────────────────────────────
  const nextEpisode = useMemo(() => {
    if (item?.Type !== "Episode" || seriesEpisodes.length === 0) return null;
    const idx = seriesEpisodes.findIndex((ep: any) => ep.Id === item.Id);
    return idx >= 0 ? seriesEpisodes[idx + 1] ?? null : null;
  }, [item, seriesEpisodes]);

  const prevEpisode = useMemo(() => {
    if (item?.Type !== "Episode" || seriesEpisodes.length === 0) return null;
    const idx = seriesEpisodes.findIndex((ep: any) => ep.Id === item.Id);
    return idx > 0 ? seriesEpisodes[idx - 1] ?? null : null;
  }, [item, seriesEpisodes]);

  // ── BUILD STREAM URL ──────────────────────────────────────────────────────
  const buildVideoUrl = useCallback(() => {
    if (!item || !authData) return "";
    const query = new URLSearchParams({
      api_key: authData.token,
      PlaySessionId: sessionId,
      static: "true",
    });
    if (mediaSourceId) query.set("MediaSourceId", mediaSourceId);
    return `${authData.serverUrl}/Videos/${item.Id}/stream?${query.toString()}`;
  }, [authData, item, mediaSourceId, sessionId]);

  // ── Wait for MPV to be ready (initialized at module level in App.tsx) ─────
  useEffect(() => {
    onMpvReady(() => setMpvReady(true));
  }, []);

  // ── SUBSCRIBE to MPV property changes ────────────────────────────────────
  useEffect(() => {
    observeProperties(OBSERVED_PROPERTIES, ({ name, data }) => {
      switch (name) {
        case "pause": {
          const paused = data as boolean;
          setPaused(paused);
          setPlaying(!paused);
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
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    }).catch(console.error);

    return () => {
      unlistenRef.current?.();
    };
  }, []);

  // ── ENSURE VIDEO FILLS WINDOW ─────────────────────────────────────────────
  // setVideoMarginRatio controls how much of the window MPV occupies
  // 0 on all sides = full window
  useEffect(() => {
    // Only call this after MPV has been initialized to avoid "mpv instance not found" errors
    if (!mpvReady) return;
    setVideoMarginRatio({ left: 0, right: 0, top: 0, bottom: 0 }).catch(console.error);
  }, [mpvReady]);

  // ── SYNC FULLSCREEN STATE FROM MPV ────────────────────────────────────────
  // MPV manages its own fullscreen — listen for changes to keep React in sync
  useEffect(() => {
    if (!mpvReady) return;
    const p = listenEvents((event: any) => {
      if (event.event === "property-change" && event.name === "fullscreen") {
        setFullscreen(!!event.data);
      }
    });
    return () => { p.then((fn: any) => fn()).catch(() => {}); };
  }, [mpvReady]);

  // ── LOAD VIDEO once MPV is ready and mediaSourceId is known ──────────────
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!mpvReady || !item || !authData || !mediaSourceId) return;
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const url      = buildVideoUrl();
    const startPos = item?.UserData?.PlaybackPositionTicks
      ? item.UserData.PlaybackPositionTicks / 10000000
      : 0;

    setProgress(0); setCurrentTime("0:00"); setDuration("0:00"); setDurationSecs(0);
    setShowEpisodesMenu(false); setShowSettings(false); setLogoFailed(false);
    setIsBuffering(true); setPlaybackError(""); setNextCountdown(null);
    setAutoPlayCancelled(false); setPlaying(true);
    stoppedSent.current = false;

    try {
      const history = JSON.parse(localStorage.getItem("localPlayHistory") || "{}");
      history[item.Id] = Date.now();
      if (item.SeriesId) history[item.SeriesId] = Date.now();
      localStorage.setItem("localPlayHistory", JSON.stringify(history));
    } catch {}

    const load = async () => {
      const MAX_RETRIES = 10;
      const RETRY_DELAY = 300;

      // Wait for file-loaded event — then explicitly start playing
      let unlistenFileLoaded: (() => void) | null = null;
      unlistenFileLoaded = await listenEvents((event) => {
        if (event.event === "file-loaded") {
          unlistenFileLoaded?.();
          setIsBuffering(false);
          setPlaying(true);
          // Small delay then force unpause — MPV sometimes needs a tick to be ready
          setTimeout(async () => {
            await setProperty("pause", false).catch(() => {});
          }, 100);
        }
      }).catch(() => null);

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Pass start position as loadfile option — "start" property can't be set after init
          const opts = startPos > 0 ? `start=${startPos}` : "";
          await command("loadfile", opts ? [url, "replace", "0", opts] : [url, "replace"]);
          return; // success — file-loaded event will clear buffering
        } catch (e: any) {
          const msg = String(e);
          const isNotReady = msg.includes("not found") || msg.includes("mpv instance");
          if (isNotReady && attempt < MAX_RETRIES - 1) {
            console.warn(`MPV not ready yet, retrying (${attempt + 1}/${MAX_RETRIES})...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY));
            continue;
          }
          console.error("MPV load failed", e);
          unlistenFileLoaded?.();
          setPlaybackError("Failed to start playback.");
          setIsBuffering(false);
          return;
        }
      }
    };
    load();
  }, [mpvReady, item?.Id, mediaSourceId]);

  useEffect(() => { hasLoaded.current = false; }, [item?.Id]);

  // ── INTRO/OUTRO SKIP — watch currentTimeSecs against segments ────────────
  const introSegmentsRef    = useRef(introSegments);
  const autoSkipEnabledRef  = useRef(autoSkipEnabled);
  const nextEpisodeRef      = useRef(nextEpisode);
  const autoPlayCancelledRef = useRef(autoPlayCancelled);
  useEffect(() => { introSegmentsRef.current    = introSegments;    }, [introSegments]);
  useEffect(() => { autoSkipEnabledRef.current  = autoSkipEnabled;  }, [autoSkipEnabled]);
  useEffect(() => { nextEpisodeRef.current       = nextEpisode;      }, [nextEpisode]);
  useEffect(() => { autoPlayCancelledRef.current = autoPlayCancelled;}, [autoPlayCancelled]);

  // Poll only for skip logic and up-next countdown (lightweight, 1s interval)
  useEffect(() => {
    const interval = setInterval(async () => {
      const pos = currentTimeSecs.current;
      const dur = durationSecs;

      // Skip segment detection
      const inSegment = introSegmentsRef.current.find(
        (s) => pos >= s.startSecs && pos < s.endSecs
      );
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

      // Up-next countdown
      if (nextEpisodeRef.current && !autoPlayCancelledRef.current && nextCountdown === null && dur > 0 && pos > 0) {
        const remaining = Math.max(0, dur - pos);
        const currentTicks = pos * 10000000;
        const isEndChapter = Boolean(chapters.find((ch) => {
          const name = String(ch.Name ?? "").toLowerCase();
          return (name.includes("outro") || name.includes("credit")) &&
            currentTicks >= (ch.StartPositionTicks ?? 0);
        }));
        if (isEndChapter) setNextCountdown(OUTRO_COUNTDOWN_SECONDS);
        else if (remaining <= END_COUNTDOWN_SECONDS) setNextCountdown(Math.max(1, Math.ceil(remaining)));
      }

      // Ended
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
    if (isStopping) stoppedSent.current = true;
    const ticks   = Math.floor(currentTimeSecs.current * 10000000);
    const payload = { ItemId: item.Id, PositionTicks: ticks, IsPaused: isStopping || !isPlaying, IsMuted: isMuted, PlayMethod: "DirectStream" };
    const endpoint = isStopping ? "Stopped" : "Progress";
    try {
      await Promise.all([
        fetch(`${authData.serverUrl}/Sessions/Playing/${endpoint}?api_key=${authData.token}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        }),
        fetch(`${authData.serverUrl}/Users/${authData.userId}/PlayingItems/${item.Id}/Progress?PositionTicks=${ticks}&api_key=${authData.token}`, {
          method: "POST",
        }),
      ]);
    } catch (err) { if (isStopping) console.error("Failed to send stop event", err); }
  }, [item, authData, isPlaying, isMuted]);

  useEffect(() => {
    if (!item || !authData) return;
    reportProgress(false);
    const interval = setInterval(() => { if (isPlaying) reportProgress(false); }, 10000);
    return () => clearInterval(interval);
  }, [item?.Id, authData, isPlaying]);

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const handleExit = useCallback(async () => {
    await setProperty("pause", true).catch(() => {});
    setPlaying(false);
    await reportProgress(true);
    await command("stop", []).catch(() => {});
    navigate(-1);
  }, [reportProgress, navigate]);

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
          const audio = source.MediaStreams?.filter((s: any) => s.Type === "Audio") || [];
          setAudioTracks(audio);
          setSubtitleTracks(source.MediaStreams?.filter((s: any) => s.Type === "Subtitle") || []);
          const defaultAudio = audio.find((s: any) => s.Index === source.DefaultAudioStreamIndex) || audio[0];
          setSelectedAudio(defaultAudio?.Index ?? null);
        }
      } catch (err) { console.error("Failed to fetch streams", err); }
    }
    fetchStreams();
  }, [item, authData]);

  // ── FETCH INTRO/OUTRO SEGMENTS ────────────────────────────────────────────
  useEffect(() => {
    if (!item || !authData) return;
    setIntroSegments([]);
    async function fetchSegments() {
      const id = item.Id; const base = authData.serverUrl; const token = authData.token;
      try {
        const res = await fetch(`${base}/MediaSegments/${id}?api_key=${token}`);
        if (res.ok) {
          const data = await res.json();
          const segs = (data.Items ?? [])
            .filter((s: any) => s.StartTicks != null && s.EndTicks != null)
            .map((s: any) => ({ type: s.Type ?? "Unknown", startSecs: s.StartTicks / 10_000_000, endSecs: s.EndTicks / 10_000_000 }));
          if (segs.length > 0) { setIntroSegments(segs); return; }
        }
      } catch {}
      try {
        const res = await fetch(`${base}/Episode/${id}/IntroTimestamps/v1?api_key=${token}`);
        if (res.ok) {
          const data = await res.json();
          const segs: { type: string; startSecs: number; endSecs: number }[] = [];
          if (data.Introduction?.End > data.Introduction?.Start) segs.push({ type: "Introduction", startSecs: data.Introduction.Start, endSecs: data.Introduction.End });
          if (data.Credits?.End > data.Credits?.Start) segs.push({ type: "Credits", startSecs: data.Credits.Start, endSecs: data.Credits.End });
          if (segs.length > 0) { setIntroSegments(segs); return; }
        }
      } catch {}
      if (chapters.length > 0) {
        const PATTERNS = [
          { type: "Introduction", re: /(^|\s)(Intro|Introduction|OP|Opening)(?!\sEnd)(\s|$)/i },
          { type: "Credits",      re: /(^|\s)(Credits?|ED|Ending|Outro)(?!\sEnd)(\s|$)/i },
          { type: "Preview",      re: /(^|\s)(Preview|PV|Sneak\s?Peek|Coming\s?(Up|Soon)|Next\s+(time|on|episode)|Extra|Teaser|Trailer)(?!\sEnd)(\s|:|$)/i },
          { type: "Recap",        re: /(^|\s)(Re?cap|Sum{1,2}ary|Prev(ious(ly)?)?|(Last|Earlier)(\s\w+)?|Catch[ -]up)(?!\sEnd)(\s|:|$)/i },
        ];
        const duration  = item?.RunTimeTicks ? item.RunTimeTicks / 10_000_000 : 0;
        const segs: { type: string; startSecs: number; endSecs: number }[] = [];
        chapters.forEach((ch: any, idx: number) => {
          const name  = String(ch.Name ?? "");
          const match = PATTERNS.find((p) => p.re.test(name));
          if (!match) return;
          const startSecs = (ch.StartPositionTicks ?? 0) / 10_000_000;
          const nextCh    = chapters[idx + 1];
          const endSecs   = nextCh ? (nextCh.StartPositionTicks ?? 0) / 10_000_000 : duration;
          if (endSecs > startSecs) segs.push({ type: match.type, startSecs, endSecs });
        });
        if (segs.length > 0) setIntroSegments(segs);
      }
    }
    fetchSegments();
  }, [item, authData, chapters]);

  // ── FETCH SERIES DATA ─────────────────────────────────────────────────────
  useEffect(() => {
    if (item?.Type === "Episode" && item.SeriesId && authData) {
      async function fetchSeriesData() {
        try {
          const itemsApi  = getItemsApi(createJellyfinApi(authData.serverUrl, authData.token));
          const seasonRes = await itemsApi.getItems({ userId: authData.userId, parentId: item.SeriesId, includeItemTypes: ["Season"], sortBy: ["SortName"] });
          if (seasonRes.data.Items) { setSeasons(seasonRes.data.Items); setSelectedSeasonId(item.SeasonId || seasonRes.data.Items[0].Id); }
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
          if (res.data.Items) setEpisodes(res.data.Items);
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
        setSeriesEpisodes(sorted);
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

  // ── AUDIO — INSTANT via MPV, no rebuffer ────────────────────────────────
  const handleAudioChange = useCallback(async (index: number) => {
    if (index === selectedAudio) return;
    // MPV track ids are 1-based sequential among audio tracks
    const mpvAid = audioTracks.findIndex((t: any) => t.Index === index) + 1;
    if (mpvAid <= 0) return;
    try {
      // Use command("set") as shown in plugin docs
      await command("set", ["aid", mpvAid]);
      setSelectedAudio(index);
    } catch {
      try {
        await setProperty("aid", mpvAid);
        setSelectedAudio(index);
      } catch (e) {
        console.error("Audio switch failed", e);
      }
    }
  }, [selectedAudio, audioTracks]);

  // ── SUBTITLES ─────────────────────────────────────────────────────────────
  const handleSubtitleChange = useCallback(async (index: number | null) => {
    setSelectedSubtitle(index);
    if (index === null) {
      // Disable subtitles
      await command("set", ["sid", "no"]).catch(() => {});
    } else {
      const mpvSid = subtitleTracks.findIndex((t: any) => t.Index === index) + 1;
      if (mpvSid > 0) {
        try {
          await command("set", ["sid", mpvSid]);
        } catch {
          await setProperty("sid", mpvSid).catch(() => {});
        }
      }
    }
  }, [subtitleTracks]);

  // ── VOLUME ────────────────────────────────────────────────────────────────
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

  const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); seekFromClientX(e.clientX, e.currentTarget);
  };
  const handleProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return; seekFromClientX(e.clientX, e.currentTarget);
  };
  const handleProgressPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    seekFromClientX(e.clientX, e.currentTarget);
  };
  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos  = (e.clientX - rect.left) / rect.width;
    setHoverPosition(pos * 100);
    const total = durationSecs || (item?.RunTimeTicks ? item.RunTimeTicks / 10000000 : 0);
    if (total > 0) setHoverTime(total * pos);
  };

  // ── FULLSCREEN ────────────────────────────────────────────────────────────
  const toggleFullscreen = async () => {
    // MPV handles fullscreen natively — cycle toggles it
    const appWindow = getCurrentWindow();
    const nextFullscreen = !(await appWindow.isFullscreen());
    await appWindow.setFullscreen(nextFullscreen);
    setFullscreen(nextFullscreen);
  };

  const exitFullscreen = async () => {
    const appWindow = getCurrentWindow();
    if (!(await appWindow.isFullscreen())) return false;
    await appWindow.setFullscreen(false);
    setFullscreen(false);
    return true;
  };

  // ── HIDE CONTROLS ─────────────────────────────────────────────────────────
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying && !showSettings && !showEpisodesMenu) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    handleMouseMove();
    return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current); };
  }, [isPlaying, showSettings, showEpisodesMenu]);

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
        case "n": case "N": if (nextEpisode) playNextEpisode(); break;
        case "p": case "P": if (prevEpisode) playPrevEpisode(); break;
        case "Escape":
          if (showSettings)      { setShowSettings(false); }
          else if (showEpisodesMenu) { setShowEpisodesMenu(false); }
          else if (nextCountdown !== null) { setAutoPlayCancelled(true); setNextCountdown(null); }
          else if (await exitFullscreen()) { return; }
          else handleExitRef.current();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPlaying, showSettings, showEpisodesMenu, nextEpisode, nextCountdown, triggerSeek, togglePlay, volume]);

  // ── SEASON SCROLL & DRAG ──────────────────────────────────────────────────
  const handleSeasonScrollState = () => {
    if (seasonsRef.current) {
      setCanScrollSeasonLeft(seasonsRef.current.scrollLeft > 5);
      setCanScrollSeasonRight(seasonsRef.current.scrollLeft < seasonsRef.current.scrollWidth - seasonsRef.current.clientWidth - 5);
    }
  };
  useEffect(() => { handleSeasonScrollState(); }, [seasons]);
  const scrollSeasons = (dir: "left" | "right") => { seasonsRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" }); };
  const onSeasonMouseDown    = (e: React.MouseEvent) => { dragState.current.isSeasonDragging = true; dragState.current.seasonStartX = e.pageX - (seasonsRef.current?.offsetLeft || 0); dragState.current.seasonScrollLeft = seasonsRef.current?.scrollLeft || 0; };
  const onSeasonMouseMove    = (e: React.MouseEvent) => { if (!dragState.current.isSeasonDragging || !seasonsRef.current) return; e.preventDefault(); const walk = ((e.pageX - seasonsRef.current.offsetLeft) - dragState.current.seasonStartX) * 1.5; seasonsRef.current.scrollLeft = dragState.current.seasonScrollLeft - walk; };
  const onSeasonMouseUpOrLeave = () => { dragState.current.isSeasonDragging = false; };
  const onEpMouseDown    = (e: React.MouseEvent) => { dragState.current.isEpisodeDragging = true; dragState.current.episodeStartY = e.pageY - (episodesRef.current?.offsetTop || 0); dragState.current.episodeScrollTop = episodesRef.current?.scrollTop || 0; dragState.current.dragDistance = 0; };
  const onEpMouseMove    = (e: React.MouseEvent) => { if (!dragState.current.isEpisodeDragging || !episodesRef.current) return; e.preventDefault(); const walk = ((e.pageY - episodesRef.current.offsetTop) - dragState.current.episodeStartY) * 1.5; episodesRef.current.scrollTop = dragState.current.episodeScrollTop - walk; dragState.current.dragDistance += Math.abs(walk); };
  const onEpMouseUpOrLeave  = () => { dragState.current.isEpisodeDragging = false; };
  const onEpClickCapture    = (e: React.MouseEvent) => { if (dragState.current.dragDistance > 10) { e.stopPropagation(); e.preventDefault(); } dragState.current.dragDistance = 0; };

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const formatTime = (s: number) => {
    if (!Number.isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

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
      {/* Click target — MPV surface is rendered globally in App.tsx */}
      <div
        className="absolute inset-0 z-0"
        onClick={() => {
          if (showSettings) setShowSettings(false);
          else if (showEpisodesMenu) setShowEpisodesMenu(false);
          else togglePlay();
        }}
      />

      {/* ── BUFFERING SPINNER ──────────────────────────────────────────────── */}
      {isBuffering && !playbackError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-12 h-12 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        </div>
      )}

      {/* ── PLAYBACK ERROR ─────────────────────────────────────────────────── */}
      {playbackError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50 px-6">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[#141414]/95 p-6 text-center shadow-2xl">
            <h2 className="text-white text-xl font-bold mb-2">Playback unavailable</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">{playbackError}</p>
            <button onClick={handleExit} className="bg-white text-black font-bold px-6 py-2.5 rounded-full hover:bg-gray-200 transition-colors">Go Back</button>
          </div>
        </div>
      )}

      {/* ── UP NEXT CARD ───────────────────────────────────────────────────── */}
      {nextCountdown !== null && nextEpisode && !autoPlayCancelled && (
        <div className="absolute inset-0 z-50 flex items-end justify-end p-8 pointer-events-none">
          <div className="w-[400px] rounded-2xl border border-white/10 bg-[#0e0e0e]/96 shadow-2xl backdrop-blur-xl overflow-hidden pointer-events-auto" style={{ animation: "fadeIn 0.25s ease-out both" }}>
            <div className="relative w-full aspect-video bg-[#1a1a1a]">
              <img src={`${authData.serverUrl}/Items/${nextEpisode.Id}/Images/Primary?fillWidth=800&quality=92&api_key=${authData.token}`} alt={nextEpisode.Name} className="w-full h-full object-cover" onError={(e) => { if (nextEpisode.SeriesId) e.currentTarget.src = `${authData.serverUrl}/Items/${nextEpisode.SeriesId}/Images/Backdrop?fillWidth=800&quality=80&api_key=${authData.token}`; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute top-3 left-4"><span className="text-[10px] font-black tracking-[0.2em] text-red-500 uppercase">Up Next</span></div>
              <div className="absolute bottom-3 left-4 right-16">
                <p className="text-gray-400 text-[11px] font-semibold mb-0.5">S{nextEpisode.ParentIndexNumber} · E{nextEpisode.IndexNumber}</p>
                <h3 className="text-white font-black text-base leading-snug line-clamp-2">{nextEpisode.Name}</h3>
              </div>
              <div className="absolute bottom-3 right-3">
                <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (nextCountdown / (nextEpisode.SeriesId ? OUTRO_COUNTDOWN_SECONDS : END_COUNTDOWN_SECONDS))}`}
                    style={{ transition: "stroke-dashoffset 0.9s linear" }}/>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white font-black text-sm">{nextCountdown}</span>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <button onClick={playNextEpisode} className="flex items-center gap-2 bg-white text-black font-bold text-sm px-5 py-2 rounded-full hover:bg-gray-200 active:scale-95 transition-all">
                <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play Now
              </button>
              <button onClick={() => { setAutoPlayCancelled(true); setNextCountdown(null); }} className="text-gray-500 hover:text-white text-sm font-semibold px-3 py-2 transition-colors">Cancel</button>
              <p className="ml-auto text-gray-600 text-xs">Press <kbd className="text-gray-500 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">N</kbd> to skip</p>
            </div>
          </div>
        </div>
      )}

      {/* ── EPISODES MENU ──────────────────────────────────────────────────── */}
      {showEpisodesMenu && item.Type === "Episode" && (
        <div className="absolute top-0 right-0 h-full w-[450px] bg-[#141414]/95 backdrop-blur-3xl border-l border-white/10 p-8 shadow-2xl z-40 flex flex-col animate-[fadeIn_0.2s_ease-out]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Episodes</h2>
            <button onClick={() => setShowEpisodesMenu(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="relative border-b border-white/10 pb-4 mb-4 flex items-center group/seasons">
            {canScrollSeasonLeft && (<button onClick={() => scrollSeasons("left")} className="absolute left-0 z-10 bg-gradient-to-r from-[#141414] via-[#141414]/90 to-transparent h-full pr-4 text-white hover:text-white/80"><svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>)}
            <div ref={seasonsRef} onScroll={handleSeasonScrollState} onMouseDown={onSeasonMouseDown} onMouseMove={onSeasonMouseMove} onMouseUp={onSeasonMouseUpOrLeave} onMouseLeave={onSeasonMouseUpOrLeave} className="flex gap-2 overflow-x-auto w-full cursor-grab active:cursor-grabbing" style={{ scrollbarWidth: "none" }}>
              {seasons.map((season) => (
                <button key={season.Id} onClick={() => setSelectedSeasonId(season.Id)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedSeasonId === season.Id ? "bg-white text-black" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>{season.Name}</button>
              ))}
            </div>
            {canScrollSeasonRight && (<button onClick={() => scrollSeasons("right")} className="absolute right-0 z-10 bg-gradient-to-l from-[#141414] via-[#141414]/90 to-transparent h-full pl-4 text-white hover:text-white/80"><svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>)}
          </div>
          <div ref={episodesRef} onMouseDown={onEpMouseDown} onMouseMove={onEpMouseMove} onMouseUp={onEpMouseUpOrLeave} onMouseLeave={onEpMouseUpOrLeave} onClickCapture={onEpClickCapture} className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 cursor-grab active:cursor-grabbing" style={{ scrollbarWidth: "none" }}>
            {episodes.map((ep) => (
              <div key={ep.Id} onClick={() => navigate(`/play/${ep.Id}`, { state: { item: ep }, replace: true })} className={`flex gap-4 p-3 rounded-lg cursor-pointer transition-colors ${ep.Id === item.Id ? "bg-white/10 ring-1 ring-white/30" : "hover:bg-white/5"}`}>
                <div className="w-[120px] aspect-video bg-[#1e1e1e] rounded overflow-hidden flex-shrink-0 relative pointer-events-none">
                  <img src={`${authData.serverUrl}/Items/${ep.Id}/Images/Primary?fillWidth=240&quality=90&api_key=${authData.token}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  {ep.Id === item.Id && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center"><svg className="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>)}
                </div>
                <div className="flex flex-col justify-center pointer-events-none">
                  <span className={`text-sm font-bold ${ep.Id === item.Id ? "text-white" : "text-gray-300"}`}>{ep.IndexNumber}. {ep.Name}</span>
                  <span className="text-xs text-gray-500 mt-1 line-clamp-2">{ep.Overview || "No description."}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SETTINGS PANEL ─────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="absolute bottom-28 right-8 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-sm font-semibold text-gray-300">Auto-Skip Intro/Outro</span>
            <button onClick={() => setAutoSkipEnabled(!autoSkipEnabled)} className={`w-10 h-6 rounded-full transition-colors relative ${autoSkipEnabled ? "bg-red-600" : "bg-white/20"}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${autoSkipEnabled ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-3 min-w-[140px]">
              <h3 className="text-gray-400 font-bold text-xs tracking-widest uppercase mb-2">Audio</h3>
              {audioTracks.map((audio) => (
                <button key={audio.Index} onClick={() => handleAudioChange(audio.Index)} className={`text-left text-sm font-medium transition-colors ${selectedAudio === audio.Index ? "text-white" : "text-gray-500 hover:text-white"}`}>
                  {selectedAudio === audio.Index && <span className="text-red-500 mr-2">✓</span>}
                  {audio.DisplayTitle || audio.Language || `Track ${audio.Index}`}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 min-w-[140px] max-h-[40vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <h3 className="text-gray-400 font-bold text-xs tracking-widest uppercase mb-2">Subtitles</h3>
              <button onClick={() => handleSubtitleChange(null)} className={`text-left text-sm font-medium transition-colors ${selectedSubtitle === null ? "text-white" : "text-gray-500 hover:text-white"}`}>
                {selectedSubtitle === null && <span className="text-red-500 mr-2">✓</span>}Off
              </button>
              {subtitleTracks.map((sub) => (
                <button key={sub.Index} onClick={() => handleSubtitleChange(sub.Index)} className={`text-left text-sm font-medium transition-colors ${selectedSubtitle === sub.Index ? "text-white" : "text-gray-500 hover:text-white"}`}>
                  {selectedSubtitle === sub.Index && <span className="text-red-500 mr-2">✓</span>}
                  {sub.DisplayTitle || sub.Language || `Track ${sub.Index}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTROLS OVERLAY ───────────────────────────────────────────────── */}
      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-500 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* TOP BAR */}
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

        {/* BOTTOM CONTROLS */}
        <div className="px-8 pb-8 pt-4 pointer-events-auto">
          {/* SKIP SEGMENT BUTTON */}
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

          {/* PROGRESS BAR */}
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

          {/* BOTTOM ROW */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                {isPlaying
                  ? <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
              </button>
              <button onClick={() => triggerSeek(currentTimeSecs.current - 10)} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
              </button>
              <button onClick={() => triggerSeek(currentTimeSecs.current + 10)} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" /></svg>
              </button>
              <div className="flex items-center gap-2 group/volume relative ml-4">
                <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                  {isMuted || volume === 0
                    ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                    : volume < 0.5
                    ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M3 9v6h4l5 5V4L7 9H3zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                    : <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
                </button>
                <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 flex items-center">
                  <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-full h-1 bg-white/20 rounded-full appearance-none accent-red-600 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {item.Type === "Episode" && prevEpisode && (
                <button onClick={playPrevEpisode} title="Previous Episode (P)" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors group">
                  <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity max-w-0 group-hover:max-w-[80px] overflow-hidden whitespace-nowrap text-right">Prev Ep</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
              )}
              {item.Type === "Episode" && nextEpisode && (
                <button onClick={playNextEpisode} title="Next Episode (N)" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors group">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
                  <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity max-w-0 group-hover:max-w-[80px] overflow-hidden whitespace-nowrap">Next Ep</span>
                </button>
              )}
              {item.Type === "Episode" && (
                <button onClick={() => { setShowEpisodesMenu(!showEpisodesMenu); setShowSettings(false); }} className={`transition-colors ${showEpisodesMenu ? "text-white" : "text-white/80 hover:text-white"}`} title="Episodes">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </button>
              )}
              <button onClick={() => { setShowSettings(!showSettings); setShowEpisodesMenu(false); }} className={`transition-colors ${showSettings ? "text-red-500" : "text-white/80 hover:text-white"}`}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors" title="Fullscreen (F)">
                {isFullscreen
                  ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}