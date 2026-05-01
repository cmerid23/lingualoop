import { useCallback, useEffect, useRef, useState } from "react";
import type { LangCode } from "../data/languages";
import { speak as ttsSpeak, stop as ttsStop } from "../lib/tts";

export interface UseSpeakReturn {
  speak: (text: string, lang: LangCode) => Promise<void>;
  stop: () => void;
  speaking: boolean;
  degraded: boolean;
  warning: string | null;
}

/**
 * Convenience hook for components that need to play pronunciation.
 * Tracks `speaking` state and surfaces TTS warnings (e.g. missing voices).
 */
export function useSpeak(): UseSpeakReturn {
  const [speaking, setSpeaking] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ttsStop();
    };
  }, []);

  const speak = useCallback(async (text: string, lang: LangCode) => {
    setSpeaking(true);
    setWarning(null);
    const result = await ttsSpeak(text, { lang });
    if (!mounted.current) return;
    setSpeaking(false);
    setDegraded(result.degraded);
    if (!result.ok && result.reason) setWarning(result.reason);
  }, []);

  const stop = useCallback(() => {
    ttsStop();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, degraded, warning };
}
