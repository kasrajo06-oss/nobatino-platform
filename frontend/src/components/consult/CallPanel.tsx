"use client";

import { Camera, Mic, MicOff, Phone, PhoneOff, RotateCcw, ShieldAlert, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { get, post } from "@/lib/api";
import { useRingtone } from "@/lib/ringtone";

type Signal = { id: number; kind: string; payload: Record<string, unknown>; created_at: string };
export type CallState = "idle" | "preview" | "ringing-out" | "ringing-in" | "connecting" | "connected" | "failed" | "ended";

const ICE: RTCIceServer[] = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS || "") as RTCIceServer[];
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
})();

/**
 * 1:1 in-browser call (WebRTC). Signaling goes through the API with short polling, so it works
 * behind any reverse proxy without websockets. Needs HTTPS (or localhost) for camera/mic access,
 * and a TURN server (NEXT_PUBLIC_ICE_SERVERS) for users behind strict NATs / mobile networks.
 */
export default function CallPanel({ code, video, enabled, peerName }: { code: string; video: boolean; enabled: boolean; peerName: string }) {
  const base = `/me/consultations/${code}/signals/`;
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [secure, setSecure] = useState(true);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const lastId = useRef(0);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  // remote candidates buffered per call id (they can arrive before the offer/answer they belong to)
  const remoteCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  // local candidates are held back until our offer/answer has been posted, so the peer never sees them first
  const localQueue = useRef<RTCIceCandidateInit[] | null>(null);
  const callId = useRef<string | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);

  useRingtone(state === "ringing-in" || state === "ringing-out");
  useEffect(() => setSecure(typeof window === "undefined" || window.isSecureContext), []);

  const send = useCallback((kind: string, payload: object = {}) => post(base, { kind, payload }).catch(() => undefined), [base]);

  const stopLocal = () => {
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
  };

  const cleanup = useCallback((next: CallState = "ended") => {
    pc.current?.close();
    pc.current = null;
    stopLocal();
    pendingOffer.current = null;
    remoteCandidates.current = {};
    localQueue.current = null;
    callId.current = null;
    setMuted(false);
    setCamOff(false);
    setState(next);
  }, []);

  const getMedia = async () => {
    if (local.current) return local.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: video ? { width: 1280, height: 720 } : false });
    local.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    return stream;
  };

  const mediaError = (e: unknown) => {
    const name = (e as { name?: string })?.name;
    if (name === "NotAllowedError") return "اجازه دسترسی به میکروفون/دوربین داده نشد. از تنظیمات مرورگر (آیکون قفل کنار آدرس) اجازه دهید.";
    if (name === "NotFoundError") return video ? "دوربین یا میکروفون پیدا نشد." : "میکروفون پیدا نشد.";
    if (name === "NotReadableError") return "دوربین/میکروفون در حال استفاده توسط برنامه دیگری است.";
    return "دسترسی به میکروفون/دوربین ممکن نشد.";
  };

  const setupPeer = useCallback(async () => {
    const stream = await getMedia();
    const peer = new RTCPeerConnection({ iceServers: ICE });
    stream.getTracks().forEach((t) => peer.addTrack(t, stream));
    localQueue.current = [];
    peer.onicecandidate = (e) => {
      if (!e.candidate) return;
      const c = e.candidate.toJSON();
      if (localQueue.current) localQueue.current.push(c);
      else send("candidate", { ...c, callId: callId.current });
    };
    peer.ontrack = (e) => {
      const [remote] = e.streams;
      if (remoteVideo.current) remoteVideo.current.srcObject = remote;
      if (remoteAudio.current) remoteAudio.current.srcObject = remote;
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setError("");
        setState("connected");
      }
      if (peer.connectionState === "failed") {
        setError("ارتباط برقرار نشد یا قطع شد. اینترنت را بررسی و دوباره تلاش کنید.");
        setState("failed");
      }
    };
    pc.current = peer;
    return peer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send, video]);

  const flushRemoteCandidates = async () => {
    const id = callId.current;
    if (!id) return;
    for (const c of remoteCandidates.current[id] ?? []) await pc.current?.addIceCandidate(c).catch(() => undefined);
    remoteCandidates.current[id] = [];
  };

  const flushLocalQueue = () => {
    const queued = localQueue.current ?? [];
    localQueue.current = null;
    queued.forEach((c) => send("candidate", { ...c, callId: callId.current }));
  };

  const preview = async () => {
    setError("");
    try {
      await getMedia();
      setState("preview");
    } catch (e) {
      setError(mediaError(e));
    }
  };

  const startCall = async () => {
    setError("");
    try {
      pc.current?.close();
      callId.current = Math.random().toString(36).slice(2, 10);
      const peer = await setupPeer();
      await send("ring", { callId: callId.current });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await send("offer", { sdp: offer.sdp, type: offer.type, callId: callId.current });
      flushLocalQueue();
      setState("ringing-out");
    } catch (e) {
      setError(mediaError(e));
      cleanup("idle");
    }
  };

  const answer = async () => {
    setError("");
    try {
      const peer = await setupPeer();
      await peer.setRemoteDescription(pendingOffer.current!);
      await flushRemoteCandidates();
      const ans = await peer.createAnswer();
      await peer.setLocalDescription(ans);
      await send("answer", { sdp: ans.sdp, type: ans.type, callId: callId.current });
      flushLocalQueue();
      setState("connecting");
    } catch (e) {
      setError(mediaError(e));
      cleanup("idle");
    }
  };

  const hangup = async () => {
    await send("hangup", { callId: callId.current });
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
          const sigCall = (s.payload as { callId?: string }).callId ?? "";
          if (s.kind === "offer" && age < 60_000) {
            const { callId: _ignored, ...desc } = s.payload as { callId?: string; sdp: string; type: RTCSdpType };
            void _ignored;
            pendingOffer.current = desc;
            callId.current = sigCall;
            setState((st) => (["idle", "ended", "preview", "failed"].includes(st) ? "ringing-in" : st));
          } else if (s.kind === "answer" && pc.current && sigCall === callId.current && !pc.current.currentRemoteDescription) {
            const { callId: _ignored, ...desc } = s.payload as { callId?: string; sdp: string; type: RTCSdpType };
            void _ignored;
            await pc.current.setRemoteDescription(desc);
            await flushRemoteCandidates();
            setState("connecting");
          } else if (s.kind === "candidate") {
            const { callId: _ignored, ...cand } = s.payload as RTCIceCandidateInit & { callId?: string };
            void _ignored;
            if (pc.current?.remoteDescription && sigCall === callId.current) await pc.current.addIceCandidate(cand).catch(() => undefined);
            else (remoteCandidates.current[sigCall] ??= []).push(cand);
          } else if ((s.kind === "hangup" || s.kind === "decline") && (!sigCall || !callId.current || sigCall === callId.current)) {
            if (s.kind === "decline") setError(`${peerName} تماس را رد کرد.`);
            cleanup();
          }
        }
      } catch {
        /* transient network error: keep polling */
      }
      if (alive) setTimeout(tick, pc.current || pendingOffer.current ? 800 : 2500);
    };
    // ignore signals from earlier calls (older than a minute)
    get<Signal[]>(`${base}?after=0`)
      .then((all) => {
        const old = all.filter((s) => Date.now() - new Date(s.created_at).getTime() >= 60_000);
        lastId.current = Math.max(0, ...old.map((s) => s.id));
      })
      .catch(() => undefined)
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
  const showLocal = video && (inCall || state === "preview");
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900 text-white" data-call-state={state}>
      <div className={`relative ${video ? "aspect-video" : "h-40"} grid place-items-center`}>
        {video && <video ref={remoteVideo} autoPlay playsInline className={`absolute inset-0 size-full object-cover ${state === "connected" ? "" : "opacity-0"}`} data-testid="remote-video" />}
        {!video && <audio ref={remoteAudio} autoPlay />}
        {/* always mounted so the stream can be attached before the call connects */}
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className={`absolute rounded-xl object-cover ring-2 ring-white/40 ${showLocal ? "" : "hidden"} ${state === "preview" ? "inset-0 size-full rounded-none ring-0" : "bottom-3 left-3 h-24 w-32"}`}
        />
        <div className="relative px-4 text-center">
          {state === "connected" ? (
            !video && <p className="text-2xl font-black tracking-widest">{mmss}</p>
          ) : state === "preview" ? (
            !video && <p className="text-sm text-emerald-300">میکروفون فعال است؛ آماده تماس هستید.</p>
          ) : (
            <p className="text-sm text-slate-300">
              {state === "idle" && (enabled ? `تماس ${video ? "تصویری" : "صوتی"} با ${peerName}` : "تماس در زمان مشاوره فعال می‌شود")}
              {state === "ringing-out" && "در حال زنگ خوردن..."}
              {state === "ringing-in" && <b className="animate-pulse text-base text-white">{peerName} تماس گرفته است</b>}
              {state === "connecting" && "در حال اتصال..."}
              {state === "failed" && "اتصال ناموفق"}
              {state === "ended" && "تماس پایان یافت"}
            </p>
          )}
        </div>
        {video && state === "connected" && <span className="absolute top-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs">{mmss}</span>}
      </div>
      {!secure && (
        <p className="flex items-center gap-2 bg-amber-500/90 px-4 py-2 text-xs text-amber-950">
          <ShieldAlert className="size-4 shrink-0" /> برای تماس، سایت باید با https باز شود (دسترسی دوربین/میکروفون در اتصال ناامن مسدود است).
        </p>
      )}
      {error && <p className="bg-rose-600/90 px-4 py-2 text-center text-xs">{error}</p>}
      <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-800 p-3">
        {state === "ringing-in" ? (
          <>
            <button onClick={answer} className="btn bg-emerald-500 px-6 text-white hover:bg-emerald-600"><Phone className="size-4" /> پاسخ</button>
            <button onClick={() => { send("decline"); cleanup("idle"); }} className="btn bg-rose-500 px-6 text-white hover:bg-rose-600"><PhoneOff className="size-4" /> رد</button>
          </>
        ) : inCall ? (
          <>
            <button onClick={toggleMute} className={`grid size-11 place-items-center rounded-full ${muted ? "bg-white text-slate-900" : "bg-white/10 hover:bg-white/20"}`} aria-label="میکروفون">{muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}</button>
            {video && <button onClick={toggleCam} className={`grid size-11 place-items-center rounded-full ${camOff ? "bg-white text-slate-900" : "bg-white/10 hover:bg-white/20"}`} aria-label="دوربین">{camOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}</button>}
            <button onClick={hangup} className="grid size-12 place-items-center rounded-full bg-rose-500 hover:bg-rose-600" aria-label="قطع تماس"><PhoneOff className="size-5" /></button>
          </>
        ) : (
          <>
            <button onClick={startCall} disabled={!enabled || !secure} className="btn bg-emerald-500 px-6 text-white hover:bg-emerald-600 disabled:opacity-40">
              {state === "failed" ? <RotateCcw className="size-4" /> : video ? <Video className="size-4" /> : <Phone className="size-4" />}
              {state === "failed" ? "تلاش مجدد" : "شروع تماس"}
            </button>
            {state !== "preview" ? (
              <button onClick={preview} disabled={!secure} className="btn bg-white/10 text-white hover:bg-white/20 disabled:opacity-40">
                {video ? <Camera className="size-4" /> : <Mic className="size-4" />} تست {video ? "دوربین" : "میکروفون"}
              </button>
            ) : (
              <button onClick={() => { stopLocal(); setState("idle"); }} className="btn bg-white/10 text-white hover:bg-white/20">پایان تست</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
