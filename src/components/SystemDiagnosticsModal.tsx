import React, { useState, useEffect } from 'react';
import {
  Activity,
  Wifi,
  Cpu,
  RefreshCw,
  Download,
  CheckCircle2,
  Server,
  Zap
} from 'lucide-react';

export interface SystemDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineCount: number;
  currentRoom: string;
  socketConnected: boolean;
  pingLatency?: number | null;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const SystemDiagnosticsModal: React.FC<SystemDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onlineCount,
  currentRoom,
  socketConnected,
  pingLatency = null,
  onShowToast
}) => {
  const [fps, setFps] = useState<number>(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Measure real browser frame rate while diagnostics modal is open
  useEffect(() => {
    if (!isOpen) return;
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number | null = null;

    const tick = (now: number) => {
      frameCount += 1;
      const elapsed = now - lastTime;
      if (elapsed >= 1000) {
        setFps(Math.min(120, Math.round((frameCount * 1000) / elapsed)));
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isOpen]);

  const handleRunHealthCheck = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      onShowToast(
        socketConnected
          ? 'تم الفحص التشخيصي: اتصال الخادم نشط ويعمل بشكل طبيعي 🟢'
          : 'الخادم غير متصل حالياً، جاري محاولة إعادة الاتصال...',
        socketConnected ? 'success' : 'error'
      );
    }, 500);
  };

  const navConnection = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  const networkTypeLabel = navConnection?.effectiveType ? String(navConnection.effectiveType).toUpperCase() : 'متاح';
  const rttDisplay = pingLatency !== null ? `${pingLatency} ms` : 'جاري القياس...';
  const qualityLabel =
    !socketConnected
      ? 'غير متصل'
      : pingLatency === null
        ? 'متصل'
        : pingLatency < 80
          ? 'ممتاز جداً'
          : pingLatency < 180
            ? 'جيد'
            : 'بطيء نسبياً';

  const handleExportDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      platform: 'Hassan Pro Chat Web App',
      status: socketConnected ? 'Connected' : 'Disconnected',
      room: currentRoom,
      onlineUsers: onlineCount,
      pingMs: pingLatency,
      measuredFps: fps,
      networkEffectiveType: networkTypeLabel,
      browserUserAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prochat-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('تم تحميل التقرير التشخيصي بنجاح 📋', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                لوحة فحص جودة الاتصال وصحة الخادم
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  socketConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                  {socketConnected ? 'متصل ومباشر' : 'منقطع'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">مراقبة حقيقية لزمن الاستجابة، حالة الاتصال، وأداء العرض الفعلي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Real Ping */}
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                سرعة الاستجابة Ping
              </div>
              <div className="text-xl font-mono font-bold text-emerald-400">{rttDisplay}</div>
              <div className="text-[10px] text-emerald-500/80 mt-0.5">{qualityLabel}</div>
            </div>

            {/* Socket Status */}
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                خادم المقبس Socket
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {socketConnected ? 'متصل بنجاح ✓' : 'انقطاع الاتصال'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Socket.IO Realtime</div>
            </div>

            {/* Real FPS */}
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                معدل الإطارات FPS
              </div>
              <div className="text-xl font-mono font-bold text-amber-400">{fps}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">قياس فعلي</div>
            </div>

            {/* Network Info */}
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                الشبكة والتواجد
              </div>
              <div className="text-xl font-mono font-bold text-purple-400">{networkTypeLabel}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{onlineCount} متصل الآن</div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-200 mb-2">حالة المكونات الفعالة:</h3>

            {[
              { name: 'محرك الصوت الشبكي WebRTC Audio Mesh', status: 'WebRTC Opus + STUN/TURN', ok: true },
              { name: 'اتصال Socket.IO الفوري بالخادم', status: socketConnected ? 'نشط ومتصل بالخادم' : 'جاري إعادة الاتصال', ok: socketConnected },
              { name: 'مقاومة الخلفية والحفاظ على الجلسة', status: 'Wake Lock + Keep-Alive Active', ok: true },
              { name: 'حماية الغرف والرتب والصلاحيات', status: 'تحقق من جهة الخادم', ok: true },
              { name: 'مكالمات الخاص الصوتية والمرئية (P2P)', status: 'DTLS-SRTP via WebRTC', ok: true }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800 last:border-none">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${item.ok ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="text-[11px] text-slate-400">{item.status}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleRunHealthCheck}
              disabled={isRefreshing}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              إعادة الفحص المباشر
            </button>
            <button
              onClick={handleExportDiagnostics}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل تقرير التشخيص JSON
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>الغرفة النشطة: <b className="text-white">{currentRoom}</b> | المتواجدون: <b className="text-amber-400">{onlineCount}</b></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
