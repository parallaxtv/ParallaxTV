import { useState, useEffect } from "react";
import { SkipSegment } from "../../types/player"; // Adjust path if needed
import { AuthData } from "../../types/auth";       // Adjust path if needed

export function useSkipSegments(item: any, authData: AuthData | null, chapters: any[]) {
  const [introSegments, setIntroSegments] = useState<SkipSegment[]>([]);
  const [activeSkipSegment, setActiveSkipSegment] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !authData) return;
    
    setIntroSegments([]);
    
    async function fetchSegments() {
      const id = item.Id; 
      const base = authData.serverUrl; 
      const token = authData.token;
      
      // 1. Try standard MediaSegments API
      try {
        const res = await fetch(`${base}/MediaSegments/${id}?api_key=${token}`);
        if (res.ok) {
          const data = await res.json();
          const segs = (data.Items ?? [])
            .filter((s: any) => s.StartTicks != null && s.EndTicks != null)
            .map((s: any) => ({ 
              type: s.Type ?? "Unknown", 
              startSecs: s.StartTicks / 10_000_000, 
              endSecs: s.EndTicks / 10_000_000 
            }));
          if (segs.length > 0) { 
            setIntroSegments(segs); 
            return; 
          }
        }
      } catch {}

      // 2. Try IntroTimestamps API (Plugin fallback)
      try {
        const res = await fetch(`${base}/Episode/${id}/IntroTimestamps/v1?api_key=${token}`);
        if (res.ok) {
          const data = await res.json();
          const segs: SkipSegment[] = [];
          if (data.Introduction?.End > data.Introduction?.Start) {
            segs.push({ type: "Introduction", startSecs: data.Introduction.Start, endSecs: data.Introduction.End });
          }
          if (data.Credits?.End > data.Credits?.Start) {
            segs.push({ type: "Credits", startSecs: data.Credits.Start, endSecs: data.Credits.End });
          }
          if (segs.length > 0) { 
            setIntroSegments(segs); 
            return; 
          }
        }
      } catch {}

      // 3. Regex Chapters Fallback
      if (chapters.length > 0) {
        const PATTERNS = [
          { type: "Introduction", re: /(^|\s)(Intro|Introduction|OP|Opening)(?!\sEnd)(\s|$)/i },
          { type: "Credits",      re: /(^|\s)(Credits?|ED|Ending|Outro)(?!\sEnd)(\s|$)/i },
          { type: "Preview",      re: /(^|\s)(Preview|PV|Sneak\s?Peek|Coming\s?(Up|Soon)|Next\s+(time|on|episode)|Extra|Teaser|Trailer)(?!\sEnd)(\s|:|$)/i },
          { type: "Recap",        re: /(^|\s)(Re?cap|Sum{1,2}ary|Prev(ious(ly)?)?|(Last|Earlier)(\s\w+)?|Catch[ -]up)(?!\sEnd)(\s|:|$)/i },
        ];
        
        const duration = item?.RunTimeTicks ? item.RunTimeTicks / 10_000_000 : 0;
        const segs: SkipSegment[] = [];
        
        chapters.forEach((ch: any, idx: number) => {
          const name = String(ch.Name ?? "");
          const match = PATTERNS.find((p) => p.re.test(name));
          if (!match) return;
          
          const startSecs = (ch.StartPositionTicks ?? 0) / 10_000_000;
          const nextCh = chapters[idx + 1];
          const endSecs = nextCh ? (nextCh.StartPositionTicks ?? 0) / 10_000_000 : duration;
          
          if (endSecs > startSecs) {
            segs.push({ type: match.type as any, startSecs, endSecs });
          }
        });
        
        if (segs.length > 0) setIntroSegments(segs);
      }
    }
    
    fetchSegments();
  }, [item, authData, chapters]);

  return { introSegments, activeSkipSegment, setActiveSkipSegment };
}