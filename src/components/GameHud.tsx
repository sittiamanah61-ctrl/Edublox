import { useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bot,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coins,
  Crosshair,
  DoorOpen,
  Gamepad2,
  Home,
  Landmark,
  Presentation,
  RotateCcw,
  RotateCw,
  Store,
  Users,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { AppConfig, MaterialModule } from '../types/game';

interface GameHudProps {
  appConfig: AppConfig;
  playerCoins: number;
  isAutoMove: boolean;
  isAudioOn: boolean;
  activeTouchPlayerIndex: number;
  nearbyBuilding: MaterialModule | null;
  onReturnHome: () => void;
  onToggleAutoMove: () => void;
  onToggleAudio: () => void;
  onOpenDirectory: () => void;
  onOpenQuizSetup: () => void;
  onOpenShop: () => void;
  onOpenAvatar: () => void;
  onOpenTeacher: () => void;
  onOpenRecap: () => void;
  onEnterNearbyBuilding: () => void;
  onSelectTouchPlayer: (idx: number) => void;
  onSetVirtualKey: (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => void;
  onJumpPlayer: (idx: number) => void;
  onRotateCamera: (delta: number) => void;
  onZoomCamera: (delta: number) => void;
  onCycleCameraFocus: () => void;
  onReturnToPlaza: () => void;
}

export function GameHud({
  appConfig,
  playerCoins,
  isAutoMove,
  isAudioOn,
  activeTouchPlayerIndex,
  nearbyBuilding,
  onReturnHome,
  onToggleAutoMove,
  onToggleAudio,
  onOpenDirectory,
  onOpenQuizSetup,
  onOpenShop,
  onOpenAvatar,
  onOpenTeacher,
  onOpenRecap,
  onEnterNearbyBuilding,
  onSelectTouchPlayer,
  onSetVirtualKey,
  onJumpPlayer,
  onRotateCamera,
  onZoomCamera,
  onCycleCameraFocus,
  onReturnToPlaza,
}: GameHudProps) {
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-3">
      {/* BARIS ATAS: Banner Identitas + Koin + Aksi Cepat */}
      <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="surface-panel rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2.5">
          <button
            onClick={onReturnHome}
            title="Menu Utama"
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold shadow cursor-pointer"
          >
            <Home className="w-4 h-4" />
          </button>
          <div>
            <div className="font-display font-bold text-xs sm:text-sm text-slate-900 whitespace-nowrap">
              {appConfig.appName}
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              {appConfig.subjectName} · {appConfig.className}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="surface-panel rounded-2xl px-3 py-1.5 shadow-lg flex items-center gap-2 border-yellow-300">
            <Coins className="w-4 h-4 text-yellow-500" />
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase leading-none">
                Koin
              </div>
              <div className="font-display font-bold text-sm text-slate-900 tabular-nums">
                {playerCoins}
              </div>
            </div>
          </div>

          <button
            onClick={onToggleAutoMove}
            className="btn-blox rounded-2xl px-3 py-2 bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Mode Gerak Pemain"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{isAutoMove ? 'Auto' : 'Manual'}</span>
          </button>

          <button
            onClick={onToggleAudio}
            className="btn-blox rounded-2xl px-3 py-2 bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Musik & Efek Suara"
          >
            {isAudioOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isAudioOn ? 'Musik ON' : 'Musik OFF'}</span>
          </button>

          <button
            onClick={onOpenDirectory}
            className="btn-blox rounded-2xl px-3 py-2 bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gedung & Teleport</span>
          </button>

          <button
            onClick={onOpenQuizSetup}
            className="btn-blox rounded-2xl px-3 py-2 bg-pink-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mulai Kuis</span>
          </button>

          <button
            onClick={onOpenShop}
            className="btn-blox rounded-2xl px-3 py-2 bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Kantin & Toko</span>
          </button>

          <button
            onClick={onOpenAvatar}
            className="btn-blox rounded-2xl px-3 py-2 bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Avatar</span>
          </button>

          <button
            onClick={onOpenTeacher}
            className="btn-blox rounded-2xl px-3 py-2 bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Panel Guru</span>
          </button>

          <button
            onClick={onOpenRecap}
            className="btn-blox rounded-2xl px-3 py-2 bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Rekap</span>
          </button>
        </div>
      </div>

      {/* NOTIFIKASI PROXIMITY GEDUNG */}
      {nearbyBuilding && (
        <div className="self-center pointer-events-auto animate-pop">
          <div className="surface-panel rounded-2xl px-4 py-3 shadow-2xl border-2 border-blue-400 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center"
              style={{ backgroundColor: nearbyBuilding.warna || '#2563EB' }}
            >
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold text-blue-700 uppercase">
                Area Gedung Terdeteksi
              </div>
              <div className="font-display font-bold text-sm sm:text-base text-slate-900">
                {nearbyBuilding.namaGedung} ({nearbyBuilding.bab})
              </div>
            </div>
            <button
              onClick={onEnterNearbyBuilding}
              className="btn-blox px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Masuk Gedung</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BARIS BAWAH: Kontrol D-Pad & Kamera 360 (Dapat dilipat untuk mode penuh 3D) */}
      <div className="flex flex-col gap-1.5">
        <div className="self-end pointer-events-auto">
          <button
            onClick={() => setControlsCollapsed((v) => !v)}
            className="surface-panel rounded-xl px-3 py-1 text-[11px] font-extrabold text-slate-700 shadow inline-flex items-center gap-1 cursor-pointer"
          >
            {controlsCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Tampilkan Kontrol Gerak & Kamera
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Sembunyikan Kontrol
              </>
            )}
          </button>
        </div>

        {!controlsCollapsed && (
          <div className="flex items-end justify-between gap-2">
            {/* KIRI BAWAH: Kontrol D-Pad & Pemilih Pemain Aktif */}
            <div className="pointer-events-auto flex flex-col gap-1.5">
              <div className="surface-panel rounded-xl p-1 flex items-center gap-1 shadow">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectTouchPlayer(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                      activeTouchPlayerIndex === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    P{idx + 1}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="grid grid-cols-3 gap-1 w-28 h-28 sm:w-32 sm:h-32">
                  <div />
                  <button
                    onPointerDown={() => onSetVirtualKey('up', true)}
                    onPointerUp={() => onSetVirtualKey('up', false)}
                    onPointerLeave={() => onSetVirtualKey('up', false)}
                    className="btn-blox rounded-xl bg-white text-slate-800 flex items-center justify-center font-bold shadow cursor-pointer"
                    aria-label="Maju"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <div />
                  <button
                    onPointerDown={() => onSetVirtualKey('left', true)}
                    onPointerUp={() => onSetVirtualKey('left', false)}
                    onPointerLeave={() => onSetVirtualKey('left', false)}
                    className="btn-blox rounded-xl bg-white text-slate-800 flex items-center justify-center font-bold shadow cursor-pointer"
                    aria-label="Kiri"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="rounded-xl bg-slate-200/80 flex items-center justify-center text-[10px] font-extrabold text-slate-600">
                    GERAK
                  </div>
                  <button
                    onPointerDown={() => onSetVirtualKey('right', true)}
                    onPointerUp={() => onSetVirtualKey('right', false)}
                    onPointerLeave={() => onSetVirtualKey('right', false)}
                    className="btn-blox rounded-xl bg-white text-slate-800 flex items-center justify-center font-bold shadow cursor-pointer"
                    aria-label="Kanan"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div />
                  <button
                    onPointerDown={() => onSetVirtualKey('down', true)}
                    onPointerUp={() => onSetVirtualKey('down', false)}
                    onPointerLeave={() => onSetVirtualKey('down', false)}
                    className="btn-blox rounded-xl bg-white text-slate-800 flex items-center justify-center font-bold shadow cursor-pointer"
                    aria-label="Mundur"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <div />
                </div>

                <button
                  onPointerDown={() => onJumpPlayer(activeTouchPlayerIndex)}
                  className="btn-blox w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-yellow-400 text-slate-900 font-display font-bold text-xs flex flex-col items-center justify-center shadow-lg border-2 border-white cursor-pointer"
                >
                  <ArrowUp className="w-5 h-5" />
                  <span>LOMPAT</span>
                </button>
              </div>
            </div>

            {/* KANAN BAWAH: Kontrol Kamera 360 */}
            <div className="pointer-events-auto flex flex-col items-end gap-1.5">
              <div className="surface-panel rounded-2xl p-2 shadow-lg flex flex-wrap justify-end gap-1.5">
                <button
                  onClick={() => onRotateCamera(-0.35)}
                  className="btn-blox px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Putar Kiri"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Putar Kiri</span>
                </button>
                <button
                  onClick={() => onRotateCamera(0.35)}
                  className="btn-blox px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Putar Kanan"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Putar Kanan</span>
                </button>
                <button
                  onClick={() => onZoomCamera(-3)}
                  className="btn-blox px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onZoomCamera(3)}
                  className="btn-blox px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onCycleCameraFocus}
                  className="btn-blox px-2.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Fokus Kamera"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fokus Kamera</span>
                </button>
                <button
                  onClick={onReturnToPlaza}
                  className="btn-blox px-2.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Kembali ke Plaza"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kembali ke Plaza</span>
                </button>
              </div>
              <div className="hidden md:block px-3 py-1 rounded-xl bg-slate-900/75 text-white text-[11px] font-semibold">
                P1: WASD+Spasi · P2: Panah+Enter · P3: IJKL+U · P4: TFGH+R · Seret layar untuk putar
                kamera 360°
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
