"use client";

import { useEffect } from "react";

/** Two-tone ring generated with WebAudio (no audio files to ship) + flashing tab title while active. */
export function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    let stopped = false;
    const ring = () => {
      if (stopped) return;
      [0, 0.25].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = i ? 480 : 440;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.25);
      });
    };
    ring();
    const t = setInterval(ring, 2000);
    const title = document.title;
    let flip = false;
    const tt = setInterval(() => {
      flip = !flip;
      document.title = flip ? "📞 تماس ورودی..." : title;
    }, 1000);
    return () => {
      stopped = true;
      clearInterval(t);
      clearInterval(tt);
      document.title = title;
      ctx.close().catch(() => undefined);
    };
  }, [active]);
}

/** Short "ding" for new notifications. */
export function playDing() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close().catch(() => undefined), 600);
  } catch {
    /* audio blocked until the user interacts with the page */
  }
}
