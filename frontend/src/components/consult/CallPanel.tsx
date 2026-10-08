"use client";

import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { get, post } from "@/lib/api";

type Signal = { id: number; kind: string; payload: Record<string, unknown>; created_at: string };
type CallState = "idle" | "ringing-out" | "ringing-in" | "connecting" | "connected" | "ended";

const ICE: RTCIceServer[] = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS || "") as RTCIceServer[];
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
})();

/**
 * 1:1 in-browser call (WebRTC). Signaling goes through the API with short polling, so it works
 * behind any reverse proxy without websockets. In production add a TURN server to NEXT_PUBLIC_ICE_SERVERS.
 */
export default function CallPanel({ code, video, enabled, peerName }: { code: string; video: boolean; enabled: boolean; peerName: string }) {
  const base = `/me/consultations/${code}/signals/`;
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const lastId = useRef(0);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);

  const send = useCallback((kind: string, payload: object = {}) => post(base, { kind, payload }).catch(() => undefined), [base]);

  const cleanup = useCallback((next: CallState = "ended") => {
    pc.current?.close();
    pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    pendingOffer.current = null;
    pendingCandidates.current = [];
    setState(next);
  }, []);

  const setupPeer = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    local.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    const peer = new RTCPeerConnection({ iceServers: ICE });
    stream.getTracks().forEach((t) => peer.addTrack(t, stream));
    peer.onicecandidate = (e) => e.candidate && send("candidate", e.candidate.toJSON());
    peer.ontrack = (e) => {
      const [remote] = e.streams;
      if (remoteVideo.current) remoteVideo.current.srcObject = remote;
      if (remoteAudio.current) remoteAudio.current.srcObject = remote;
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setState("connected");
      if (["failed", "disconnected"].includes(peer.connectionState)) setError("ارتباط قطع شد. اینترنت خود را بررسی و دوباره تماس بگیرید.");
    };
    pc.current = peer;
    return peer;
  }, [send, video]);

  const flushCandidates = async () => {
    for (const c of pendingCandidates.current) await pc.current?.addIceCandidate(c).catch(() => undefined);
    pendingCandidates.current = [];
  };

  const startCall = async () => {
    setError("");
    try {
      const peer = await setupPeer();
      await send("ring");
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await send("offer", { sdp: offer.sdp, type: offer.type });
      setState("ringing-out");
    } catch {
      setError("دسترسی به میکروفون/دوربین ممکن نشد. اجازه مرورگر را بررسی کنید.");
      cleanup("idle");
    }
  };

  const answer = async () => {
    setError("");
    try {
      const peer = await setupPeer();
      await peer.setRemoteDescription(pendingOffer.current!);
      await flushCandidates();
      const ans = await peer.createAnswer();
      await peer.setLocalDescription(ans);
      await send("answer", { sdp: ans.sdp, type: ans.type });
      setState("connecting");
    } catch {
      setError("دسترسی به میکروفون/دوربین ممکن نشد.");
      cleanup("idle");
    }
  };

  const hangup = async (notify = true) => {
    if (notify) await send("hangup");
    cleanup();
  };

  // poll signals
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const tick = async () => {
      try {
        const signals = await get<Signal[]>(`${base}?after=${lastId.current}`);
        for (const s of signals) {
          lastId.current = Math.max(lastId.current, s.id);
          const age = Date.now() - new Date(s.created_at).getTime();
          if (s.kind === "offer" && age < 60_000) {
            pendingOffer.current = s.payload as unknown as RTCSessionDescriptionInit;
            setState((st) => (st === "idle" || st === "ended" ? "ringing-in" : st));
          } else if (s.kind === "answer" && pc.current) {
            await pc.current.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
            await flushCandidates();
            setState("connecting");
          } else if (s.kind === "candidate") {
            if (pc.current?.remoteDescription) await pc.current.addIceCandidate(s.payload as RTCIceCandidateInit).catch(() => undefined);
            else pendingCandidates.current.push(s.payload as RTCIceCandidateInit);
          } else if (s.kind === "hangup" || s.kind === "decline") {
            cleanup();
          }
        }
      } catch {
        /* transient network error: keep polling */
      }
      if (alive) setTimeout(tick, pc.current || pendingOffer.current ? 1000 : 3000);
    };
    // skip signals older than this page load
    get<Signal[]>(`${base}?after=0`)
      .then((all) => {
        const recent = all.filter((s) => Date.now() - new Date(s.created_at).getTime() < 60_000);
        lastId.current = Math.max(0, ...all.filter((s) => !recent.includes(s)).map((s) => s.id));
      })
      .finally(tick);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, base]);

  useEffect(() => () => cleanup("ended"), [cleanup]);

  useEffect(() => {
    if (state !== "connected") return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  const toggleMute = () => {
    local.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  };
  const toggleCam = () => {
    local.current?.getVideoTracks().forEach((t) => (t.enabled = camOff));
    setCamOff(!camOff);
  };

  const inCall = ["ringing-out", "connecting", "connected"].includes(state);
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900 text-white">
      <div className={`relative ${video ? "aspect-video" : "h-40"} grid place-items-center`}>
        {video && <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 size-full object-cover" />}
        {!video && <audio ref={remoteAudio} autoPlay />}
        {video && inCall && <video ref={localVideo} autoPlay playsInline muted className="absolute bottom-3 left-3 h-24 w-32 rounded-xl object-cover ring-2 ring-white/40" />}
        <div className="relative text-center">
          {state === "connected" ? (
            !video && <p className="text-2xl font-black tracking-widest">{mmss}</p>
          ) : (
            <p className="text-sm text-slate-300">
              {state === "idle" && (enabled ? `تماس ${video ? "تصویری" : "صوتی"} با ${peerName}` : "تماس در زمان مشاوره فعال می‌شود")}
              {state === "ringing-out" && "در حال برقراری تماس..."}
              {state === "ringing-in" && `${peerName} تماس گرفته است`}
              {state === "connecting" && "در حال اتصال..."}
              {state === "ended" && "تماس پایان یافت"}
            </p>
          )}
          {video && state === "connected" && <span className="absolute -top-24 rounded-full bg-black/40 px-3 py-1 text-xs">{mmss}</span>}
        </div>
      </div>
      {error && <p className="bg-rose-600/90 px-4 py-2 text-center text-xs">{error}</p>}
      <div className="flex items-center justify-center gap-3 bg-slate-800 p-3">
        {state === "ringing-in" ? (
          <>
            <button onClick={answer} className="btn bg-emerald-500 px-6 text-white hover:bg-emerald-600"><Phone className="size-4" /> پاسخ</button>
            <button onClick={() => { send("decline"); cleanup("idle"); }} className="btn bg-rose-500 px-6 text-white hover:bg-rose-600"><PhoneOff className="size-4" /> رد</button>
          </>
        ) : inCall ? (
          <>
            <button onClick={toggleMute} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="میکروفون">{muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}</button>
            {video && <button onClick={toggleCam} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="دوربین">{camOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}</button>}
            <button onClick={() => hangup()} className="grid size-12 place-items-center rounded-full bg-rose-500 hover:bg-rose-600" aria-label="قطع تماس"><PhoneOff className="size-5" /></button>
          </>
        ) : (
          <button onClick={startCall} disabled={!enabled} className="btn bg-emerald-500 px-6 text-white hover:bg-emerald-600 disabled:opacity-40">
            {video ? <Video className="size-4" /> : <Phone className="size-4" />} شروع تماس
          </button>
        )}
      </div>
    </div>
  );
}
