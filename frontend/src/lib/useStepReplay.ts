import { useEffect, useRef, useState } from "react";

/**
 * Steps an index from -1 (nothing active) through `count - 1` (everything
 * active), either automatically on an interval or via manual prev/next.
 * Shared by the Graph Viewer's "Replay request" control and the Overview
 * page's request-lifecycle diagram, so both animate a pipeline the same way.
 */
export function useStepReplay(count: number, intervalMs = 500) {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const play = () => {
    if (count <= 0) return;
    clear();
    setPlaying(true);
    setStep(0);
    let s = 0;
    timerRef.current = window.setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= count - 1) {
        clear();
        setPlaying(false);
      }
    }, intervalMs);
  };

  const pause = () => {
    clear();
    setPlaying(false);
  };

  const next = () => {
    pause();
    setStep((s) => Math.min(s + 1, count - 1));
  };

  const prev = () => {
    pause();
    setStep((s) => Math.max(s - 1, -1));
  };

  const reset = () => {
    pause();
    setStep(-1);
  };

  useEffect(() => clear, []);

  return { step, playing, play, pause, next, prev, reset };
}
