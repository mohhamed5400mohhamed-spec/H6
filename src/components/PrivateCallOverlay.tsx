import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Lock,
  ShieldCheck,
  Key,
  CheckCircle2,
  X
} from 'lucide-react';
import { DEFAULT_AVATAR_SVG } from '../utils/avatarConstants';
import { ICE_SERVERS } from '../utils/audioMesh';

export interface CallPartner {
  id: string;
  username: string;
  avatarUrl?: string;
  flag?: string;
}

export interface IncomingCallData {
  callId: string;
  fromUser: CallPartner;
  callType: 'audio' | 'video';
}

interface PrivateCallOverlayProps {
  socket?: any;
  incomingCall: IncomingCallData | null;
  activeCall: {
    callId: string;
    partner: CallPartner;
    callType: 'audio' | 'video';
    isInitiator: boolean;
    acceptedByPeer?: boolean;
  } | null;
  onAcceptIncoming: () => void;
  onRejectIncoming: () => void;
  onEndActiveCall: (duration: number) => void;
}

export const PrivateCallOverlay: React.FC<PrivateCallOverlayProps> = ({
  socket,
  incomingCall,
  activeCall,
  onAcceptIncoming,
  onRejectIncoming,
  onEndActiveCall
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected'>('ringing');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentRef = useRef(false);
  const ringtoneAudioRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync speaker mute to remote media elements
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerMuted;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);

  // Play synthetic pleasant ringtone while incoming call or initiator still waiting for peer accept
  useEffect(() => {
    if (incomingCall || (activeCall && callStatus === 'ringing')) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [incomingCall, activeCall, callStatus]);

  const startRingtone = () => {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringtoneAudioRef.current = ctx;

      const playBeep = () => {
        if (!ringtoneAudioRef.current || ringtoneAudioRef.current.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      };

      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, 2400);
    } catch {
      // AudioContext could be blocked by autoplay policies
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneAudioRef.current) {
      try {
        ringtoneAudioRef.current.close();
      } catch {}
      ringtoneAudioRef.current = null;
    }
  };

  const cleanupPeerAndMedia = () => {
    offerSentRef.current = false;
    pendingIceCandidatesRef.current = [];
    setHasRemoteVideo(false);
    setMediaError(null);
    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  // Call duration timer (ticks once connected)
  useEffect(() => {
    if (!activeCall || callStatus !== 'connected') return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall, callStatus]);

  // WebRTC PeerConnection + Signaling lifecycle
  useEffect(() => {
    if (!activeCall) {
      setCallDuration(0);
      setCallStatus('ringing');
      cleanupPeerAndMedia();
      return;
    }

    let cancelled = false;
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoDisabled(false);
    setCallStatus(activeCall.isInitiator && !activeCall.acceptedByPeer ? 'ringing' : 'connecting');

    const setupConnection = async () => {
      try {
        let stream: MediaStream | null = null;
        if (navigator.mediaDevices?.getUserMedia) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
              video: activeCall.callType === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
            });
          } catch {
            if (activeCall.callType === 'video') {
              try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              } catch {
                stream = null;
              }
            }
          }
        }

        if (cancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (!stream) {
          setMediaError('تعذر الوصول إلى الميكروفون أو الكاميرا في هذا المتصفح');
        } else {
          localStreamRef.current = stream;
          if (localVideoRef.current && activeCall.callType === 'video') {
            localVideoRef.current.srcObject = stream;
          }
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        if (stream) {
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream!);
          });
        } else {
          // Ensure SDP m-lines are negotiated even on receive-only containers
          pc.addTransceiver('audio', { direction: 'recvonly' });
          if (activeCall.callType === 'video') {
            pc.addTransceiver('video', { direction: 'recvonly' });
          }
        }

        const remoteStream = new MediaStream();
        remoteStreamRef.current = remoteStream;

        pc.ontrack = (event) => {
          const incomingStream = event.streams?.[0];
          if (incomingStream) {
            incomingStream.getTracks().forEach((t) => {
              if (!remoteStream.getTracks().some((et) => et.id === t.id)) {
                remoteStream.addTrack(t);
              }
            });
          } else if (event.track) {
            remoteStream.addTrack(event.track);
          }

          if (remoteStream.getVideoTracks().length > 0) {
            setHasRemoteVideo(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.muted = isSpeakerMuted;
              remoteVideoRef.current.play().catch(() => {});
            }
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.muted = isSpeakerMuted;
            remoteAudioRef.current.play().catch(() => {});
          }
          setCallStatus('connected');
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('pmCallSignal', {
              toId: activeCall.partner.id,
              data: {
                callId: activeCall.callId,
                type: 'candidate',
                candidate: event.candidate
              }
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          if (state === 'connected' || state === 'completed') {
            setCallStatus('connected');
          }
        };
      } catch (err) {
        console.warn('WebRTC initialization failed:', err);
        setMediaError('تعذر تهيئة اتصال WebRTC المباشر');
      }
    };

    setupConnection();

    return () => {
      cancelled = true;
      cleanupPeerAndMedia();
    };
  }, [activeCall?.callId]);

  // Trigger SDP offer from initiator once peer accepts call
  useEffect(() => {
    if (!activeCall || !socket || !activeCall.isInitiator || !activeCall.acceptedByPeer || offerSentRef.current) {
      return;
    }

    let attempts = 0;
    const trySendOffer = async () => {
      const pc = pcRef.current;
      if (!pc) {
        if (attempts++ < 25) {
          setTimeout(trySendOffer, 100);
        }
        return;
      }
      if (offerSentRef.current) return;
      offerSentRef.current = true;
      setCallStatus('connecting');
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('pmCallSignal', {
          toId: activeCall.partner.id,
          data: {
            callId: activeCall.callId,
            type: 'offer',
            sdp: pc.localDescription
          }
        });
      } catch (err) {
        offerSentRef.current = false;
        console.warn('Failed to create/send call offer:', err);
      }
    };

    trySendOffer();
  }, [activeCall?.callId, activeCall?.acceptedByPeer, activeCall?.isInitiator, activeCall?.partner.id, socket]);

  // Receive SDP offer / answer / ICE candidates via pmCallSignal
  useEffect(() => {
    if (!socket || !activeCall) return;

    const handleSignal = async ({ fromId, data }: { fromId: string; data: any }) => {
      if (!data) return;
      if (activeCall.partner.id && fromId !== activeCall.partner.id && data.callId !== activeCall.callId) {
        return;
      }

      const waitForPc = async (): Promise<RTCPeerConnection | null> => {
        for (let i = 0; i < 30; i++) {
          if (pcRef.current) return pcRef.current;
          await new Promise((r) => setTimeout(r, 100));
        }
        return null;
      };

      const pc = await waitForPc();
      if (!pc) return;

      try {
        if (data.type === 'offer' && data.sdp) {
          setCallStatus('connecting');
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          for (const cand of pendingIceCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingIceCandidatesRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('pmCallSignal', {
            toId: fromId,
            data: {
              callId: activeCall.callId,
              type: 'answer',
              sdp: pc.localDescription
            }
          });
        } else if (data.type === 'answer' && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          for (const cand of pendingIceCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingIceCandidatesRef.current = [];
        } else if (data.type === 'candidate' && data.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
          } else {
            pendingIceCandidatesRef.current.push(data.candidate);
          }
        }
      } catch (err) {
        console.warn('Error handling pmCallSignal:', err);
      }
    };

    socket.on('pmCallSignal', handleSignal);
    return () => {
      socket.off('pmCallSignal', handleSignal);
    };
  }, [socket, activeCall?.callId, activeCall?.partner.id]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = isVideoDisabled;
      });
    }
    setIsVideoDisabled(!isVideoDisabled);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. INCOMING CALL MODAL
  if (incomingCall && !activeCall) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#1c150e] border border-amber-500/40 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl flex flex-col items-center">
          <div className="relative mb-4">
            <div className="absolute -inset-3 bg-emerald-500/30 rounded-full animate-ping" />
            <div className="absolute -inset-1.5 bg-amber-500/40 rounded-full animate-pulse" />
            <img
              src={incomingCall.fromUser.avatarUrl || DEFAULT_AVATAR_SVG}
              alt={incomingCall.fromUser.username}
              className="relative w-24 h-24 rounded-full object-cover border-2 border-amber-400 shadow-xl"
            />
            <div className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full shadow-md">
              {incomingCall.callType === 'video' ? <Video className="w-4 h-4" /> : <PhoneCall className="w-4 h-4 animate-bounce" />}
            </div>
          </div>

          <h3 className="text-xl font-bold text-amber-200 flex items-center gap-2">
            <span>{incomingCall.fromUser.username}</span>
            {incomingCall.fromUser.flag && <span>{incomingCall.fromUser.flag}</span>}
          </h3>
          <p className="text-xs text-amber-400/80 mt-1 mb-2 font-semibold">
            {incomingCall.callType === 'video' ? 'مكالمة فيديو خاصة واردة...' : 'مكالمة صوتية خاصة واردة...'}
          </p>

          <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-500/40 rounded-full text-[11px] text-emerald-300 font-bold mb-5 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>مكالمة مشفرة طرف-إلى-طرف (DTLS-SRTP)</span>
          </div>

          <div className="flex items-center justify-center gap-6 w-full">
            <button
              onClick={onRejectIncoming}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-14 h-14 bg-red-600 group-hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-red-400">رفض</span>
            </button>

            <button
              onClick={onAcceptIncoming}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-14 h-14 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce">
                {incomingCall.callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </div>
              <span className="text-xs font-bold text-emerald-400">رد وقبول</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE CONNECTED / RINGING CALL OVERLAY
  if (activeCall) {
    const statusLabel =
      callStatus === 'ringing'
        ? 'جاري الرنين...'
        : callStatus === 'connecting'
          ? 'جاري ربط WebRTC...'
          : formatDuration(callDuration);

    return (
      <>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {isMinimized ? (
          <div className="fixed bottom-16 right-4 z-50 bg-[#1c150e]/95 border border-amber-500/50 rounded-2xl p-2.5 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom duration-200 text-right">
            <div className="relative">
              <img
                src={activeCall.partner.avatarUrl || DEFAULT_AVATAR_SVG}
                alt={activeCall.partner.username}
                className="w-10 h-10 rounded-full object-cover border border-amber-400"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${callStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200">{activeCall.partner.username}</div>
              <div className="text-[10px] font-mono text-emerald-400">{statusLabel}</div>
            </div>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg cursor-pointer"
              title="تكبير المكالمة"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEndActiveCall(callDuration)}
              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
              title="إنهاء المكالمة"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-b from-[#1e1710] to-[#120d09] border border-amber-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-right">
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${callStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                  <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                    {statusLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSecurityModal(true)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 rounded-full text-[10px] text-emerald-300 font-bold transition-all cursor-pointer shadow-xs active:scale-95 mr-1"
                    title="عرض تفاصيل التشفير وأمان المكالمة"
                  >
                    <Lock className="w-2.5 h-2.5 text-emerald-400" />
                    <span>مشفرة 🔒</span>
                  </button>
                </div>
                <div className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                  <span>مكالمة {activeCall.callType === 'video' ? 'فيديو' : 'صوتية'} خاصة</span>
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="تصغير المكالمة"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Main Visualizer / Video Container */}
              <div className="relative h-64 sm:h-72 bg-black/40 flex flex-col items-center justify-center p-6 overflow-hidden">
                {activeCall.callType === 'video' && !isVideoDisabled ? (
                  <div className="relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/20">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!hasRemoteVideo && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <img
                          src={activeCall.partner.avatarUrl || DEFAULT_AVATAR_SVG}
                          alt={activeCall.partner.username}
                          className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-xl"
                        />
                        <span className="text-white text-xs font-bold mt-2">{activeCall.partner.username}</span>
                        <span className="text-amber-300 text-[10px] mt-0.5 font-mono">
                          {callStatus === 'connected' ? 'صوت متصل (الكاميرا متوقفة لدى الطرف الآخر)' : statusLabel}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 w-20 h-28 rounded-xl overflow-hidden border border-amber-400 shadow-md bg-slate-800">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="absolute -inset-4 bg-amber-500/10 rounded-full animate-ping" />
                      <div className="absolute -inset-2 bg-amber-500/20 rounded-full animate-pulse" />
                      <img
                        src={activeCall.partner.avatarUrl || DEFAULT_AVATAR_SVG}
                        alt={activeCall.partner.username}
                        className="relative w-28 h-28 rounded-full object-cover border-2 border-amber-400 shadow-2xl"
                      />
                    </div>

                    <h3 className="text-lg font-bold text-amber-100 mt-4 flex items-center gap-1.5">
                      <span>{activeCall.partner.username}</span>
                      {activeCall.partner.flag && <span>{activeCall.partner.flag}</span>}
                    </h3>
                    <span className="text-xs text-amber-300/70 font-mono mt-1">
                      {mediaError ? mediaError : statusLabel}
                    </span>

                    <div className="flex items-center gap-1.5 mt-5 h-8">
                      {[30, 60, 90, 45, 80, 100, 70, 50, 85, 40, 95, 65, 30].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-amber-400 rounded-full animate-pulse"
                          style={{
                            height: callStatus === 'connected' ? `${Math.max(25, (h * ((callDuration % 4) + 1)) / 4)}%` : '22%',
                            animationDelay: `${i * 80}ms`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Call Controls */}
              <div className="p-6 bg-[#17110c] border-t border-white/10 flex items-center justify-around">
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isMuted ? 'إلغاء كتم المايك' : 'كتم المايك'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {activeCall.callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isVideoDisabled
                        ? 'bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isVideoDisabled ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
                  >
                    {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                )}

                <button
                  onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isSpeakerMuted
                      ? 'bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isSpeakerMuted ? 'تشغيل مكبر الصوت' : 'كتم الصوت'}
                >
                  {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => onEndActiveCall(callDuration)}
                  className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                  title="إنهاء المكالمة"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>

            {showSecurityModal && (
              <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#1a140e] border border-amber-500/50 rounded-3xl p-5 w-full max-w-sm text-right shadow-2xl text-slate-100">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-300">تشفير المكالمة الخاصة</h4>
                        <p className="text-[10px] text-slate-400 font-mono">WebRTC DTLS-SRTP</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSecurityModal(false)}
                      className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>حماية الاتصال المباشر (P2P):</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        هذه المكالمة مشفرة ومحمية ببروتوكول WebRTC DTLS-SRTP. الصوت والصورة ينتقلان عبر قناة WebRTC بينك وبين {activeCall?.partner.username}.
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>معرف جلسة المكالمة:</span>
                      </div>
                      <div className="p-1.5 bg-black/50 rounded text-[10px] font-mono text-emerald-400 text-center select-all break-all border border-emerald-500/20">
                        {`WEBRTC:${(activeCall?.callId || 'sec').substring(0, 16).toUpperCase()}:${(activeCall?.partner.id || 'usr').substring(0, 8).toUpperCase()}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>شهادة التشفير WebRTC DTLS نشطة</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSecurityModal(false)}
                    className="w-full mt-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold rounded-xl text-xs hover:from-amber-500 hover:to-amber-600 cursor-pointer shadow-md"
                  >
                    فهمت ذلك، استمرار المكالمة
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return null;
};
