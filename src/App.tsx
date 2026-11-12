import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_MATERIALS,
  DEFAULT_PLAYERS,
  DEFAULT_QUESTIONS,
  SHOP_ITEMS,
} from './data/dkvData';
import type {
  ActivityLog,
  AppConfig,
  MaterialModule,
  PlayerState,
  QuizQuestion,
  ToastMessage,
} from './types/game';
import { SafeStorage, STORAGE_KEYS } from './utils/storage';
import { SoundFX } from './utils/sound';
import { World3DCanvas, type World3DHandle } from './components/World3DCanvas';
import { StartScreen } from './components/StartScreen';
import { GameHud } from './components/GameHud';
import { DirectoryModal } from './components/DirectoryModal';
import { BuildingModal } from './components/BuildingModal';
import { QuizModal } from './components/QuizModal';
import { AvatarModal } from './components/AvatarModal';
import { ShopModal } from './components/ShopModal';
import { GuideModal } from './components/GuideModal';
import { TeacherModal, type TeacherTab } from './components/TeacherModal';
import { RecapModal } from './components/RecapModal';

export default function App() {
  const worldRef = useRef<World3DHandle | null>(null);
  const quizShortcutRef = useRef<((code: string) => void) | null>(null);

  const [appConfig, setAppConfig] = useState<AppConfig>(() =>
    SafeStorage.get(STORAGE_KEYS.CONFIG, DEFAULT_APP_CONFIG)
  );
  const [materials, setMaterials] = useState<MaterialModule[]>(() =>
    SafeStorage.get(STORAGE_KEYS.MATERIALS, DEFAULT_MATERIALS)
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    SafeStorage.get(STORAGE_KEYS.QUESTIONS, DEFAULT_QUESTIONS)
  );
  const [players, setPlayers] = useState<PlayerState[]>(() =>
    SafeStorage.get(STORAGE_KEYS.PLAYERS, DEFAULT_PLAYERS)
  );
  const [playerCoins, setPlayerCoins] = useState<number>(() =>
    SafeStorage.get(STORAGE_KEYS.COINS, 50)
  );
  const [unlockedShopItems, setUnlockedShopItems] = useState<Set<string>>(
    () => new Set(SafeStorage.get<string[]>(STORAGE_KEYS.UNLOCKED_ITEMS, []))
  );
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(
    () => new Set(SafeStorage.get<string[]>(STORAGE_KEYS.ANSWERED_IDS, []))
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    SafeStorage.get(STORAGE_KEYS.LOGS, [])
  );
  const [sheetsWebhookUrl, setSheetsWebhookUrl] = useState<string>(() =>
    SafeStorage.get(STORAGE_KEYS.WEBHOOK, '')
  );

  const [isStartScreen, setIsStartScreen] = useState(true);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isAutoMove, setIsAutoMove] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(() => SoundFX.isEnabled());
  const [activeTouchPlayerIndex, setActiveTouchPlayerIndex] = useState(0);
  const [nearbyBuildingId, setNearbyBuildingId] = useState<string | null>(null);
  const [isQuizActive, setIsQuizActive] = useState(false);

  // Modal states
  const [showDirectory, setShowDirectory] = useState(false);
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);
  const [quizPreselectBuilding, setQuizPreselectBuilding] = useState<string | null>(null);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [teacherTab, setTeacherTab] = useState<TeacherTab | null>(null);
  const [showRecap, setShowRecap] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const nearbyBuilding = useMemo(
    () => materials.find((m) => m.id === nearbyBuildingId) || null,
    [materials, nearbyBuildingId]
  );

  const activeBuilding = useMemo(
    () => materials.find((m) => m.id === activeBuildingId) || null,
    [materials, activeBuildingId]
  );

  const handleStartAdventure = () => {
    setIsStartScreen(false);
    SoundFX.initStart();
    showToast('Selamat datang di Kota Kreativitas DKV – Edublox City By Sitty!', 'success');
  };

  const handleToggleAudio = () => {
    const on = SoundFX.toggle();
    setIsAudioOn(on);
    showToast(on ? 'Musik & Efek Suara Diaktifkan' : 'Musik & Efek Suara Dimatikan', 'info');
  };

  const handleToggleAutoMove = () => {
    setIsAutoMove((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Mode Auto Aktif: Pemain menjelajah otomatis'
          : 'Mode Manual Aktif: Kendalikan dengan tombol',
        'info'
      );
      return next;
    });
  };

  const handleSelectTouchPlayer = (idx: number) => {
    setActiveTouchPlayerIndex(idx);
    if (!players[idx]?.active) {
      const next = players.map((p, i) => (i === idx ? { ...p, active: true } : p));
      setPlayers(next);
      SafeStorage.set(STORAGE_KEYS.PLAYERS, next);
      showToast(`${players[idx].id} diaktifkan!`, 'info');
    }
  };

  const handleEnterBuilding = (id: string) => {
    SoundFX.select();
    worldRef.current?.pulseBuilding(id);
    setActiveBuildingId(id);
  };

  const handleTeleport = (x: number, z: number, label: string) => {
    worldRef.current?.teleportToCoords(x, z);
    showToast(`Teleport berhasil ke ${label}!`, 'success');
  };

  const handleSaveAvatars = (updated: PlayerState[]) => {
    setPlayers(updated);
    SafeStorage.set(STORAGE_KEYS.PLAYERS, updated);
    showToast('Pengaturan Avatar & Pemain berhasil disimpan!', 'success');
  };

  const handleBuyShopItem = (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    if (playerCoins < item.price) {
      showToast(
        `Koin belum cukup! Butuh ${item.price} koin (jawab soal kuis untuk mendapat koin).`,
        'warning'
      );
      return;
    }
    const nextCoins = playerCoins - item.price;
    const nextUnlocked = new Set(unlockedShopItems);
    nextUnlocked.add(item.id);
    const nextPlayers = players.map((p, idx) =>
      idx === 0 ? { ...p, equippedItem: item.id } : p
    );

    setPlayerCoins(nextCoins);
    setUnlockedShopItems(nextUnlocked);
    setPlayers(nextPlayers);

    SafeStorage.set(STORAGE_KEYS.COINS, nextCoins);
    SafeStorage.set(STORAGE_KEYS.UNLOCKED_ITEMS, [...nextUnlocked]);
    SafeStorage.set(STORAGE_KEYS.PLAYERS, nextPlayers);

    SoundFX.coin();
    showToast(`Berhasil membuka & memasang ${item.name}!`, 'success');
  };

  const handleEquipShopItem = (itemId: string) => {
    const nextPlayers = players.map((p, idx) =>
      idx === 0 ? { ...p, equippedItem: itemId } : p
    );
    setPlayers(nextPlayers);
    SafeStorage.set(STORAGE_KEYS.PLAYERS, nextPlayers);
    SoundFX.select();
    showToast('Aksesoris dipasang ke Avatar P1!', 'success');
  };

  const handleRecordAnswer = useCallback(
    (
      entryWithoutMeta: Omit<ActivityLog, 'waktu' | 'kelas'>,
      questionId: string,
      earnedCoins: number
    ) => {
      setAnsweredIds((prev) => {
        const next = new Set(prev);
        next.add(questionId);
        SafeStorage.set(STORAGE_KEYS.ANSWERED_IDS, [...next]);
        return next;
      });

      if (earnedCoins > 0) {
        setPlayerCoins((prev) => {
          const next = prev + earnedCoins;
          SafeStorage.set(STORAGE_KEYS.COINS, next);
          return next;
        });
      }

      if (entryWithoutMeta.idPemain !== 'BONUS-COOP') {
        const fullEntry: ActivityLog = {
          waktu: new Date().toLocaleString('id-ID'),
          kelas: appConfig.className,
          ...entryWithoutMeta,
        };
        setActivityLogs((prev) => {
          const next = [fullEntry, ...prev];
          SafeStorage.set(STORAGE_KEYS.LOGS, next);
          return next;
        });

        if (sheetsWebhookUrl && navigator.onLine) {
          fetch(sheetsWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullEntry),
          }).catch(() => {});
        }
      }
    },
    [appConfig.className, sheetsWebhookUrl]
  );

  const handleUpdateConfig = (cfg: AppConfig) => {
    setAppConfig(cfg);
    SafeStorage.set(STORAGE_KEYS.CONFIG, cfg);
  };

  const handleUpdateMaterials = (mats: MaterialModule[]) => {
    setMaterials(mats);
    SafeStorage.set(STORAGE_KEYS.MATERIALS, mats);
  };

  const handleUpdateQuestions = (qs: QuizQuestion[]) => {
    setQuestions(qs);
    SafeStorage.set(STORAGE_KEYS.QUESTIONS, qs);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 1. 3D Voxel World */}
      <World3DCanvas
        ref={worldRef}
        appConfig={appConfig}
        materials={materials}
        players={players}
        isStartScreen={isStartScreen}
        isAutoMove={isAutoMove}
        activeTouchPlayerIndex={activeTouchPlayerIndex}
        isQuizActive={isQuizActive}
        onProximityChange={setNearbyBuildingId}
        onQuizShortcutKey={(code) => quizShortcutRef.current?.(code)}
      />

      {/* 2. Toast Notifications */}
      <div className="fixed top-20 right-4 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2">
        {toasts.map((t) => {
          const colorCls =
            t.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-300'
              : t.type === 'warning'
              ? 'bg-amber-500 text-slate-950 border-amber-200'
              : t.type === 'error'
              ? 'bg-rose-600 text-white border-rose-300'
              : 'bg-slate-900 text-white border-slate-600';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-xl border-2 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-pop ${colorCls}`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0" />}
              {t.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
              <span className="flex-1">{t.message}</span>
            </div>
          );
        })}
      </div>

      {/* 3. Start Screen Overlay */}
      {isStartScreen && (
        <StartScreen
          appConfig={appConfig}
          materials={materials}
          questions={questions}
          isOnline={isOnline}
          onStartAdventure={handleStartAdventure}
          onOpenAvatar={() => setShowAvatar(true)}
          onOpenGuide={() => setShowGuide(true)}
          onOpenTeacher={(tab = 'impor') => setTeacherTab(tab)}
          onOpenRecap={() => setShowRecap(true)}
        />
      )}

      {/* 4. In-Game HUD */}
      {!isStartScreen && (
        <GameHud
          appConfig={appConfig}
          playerCoins={playerCoins}
          isAutoMove={isAutoMove}
          isAudioOn={isAudioOn}
          activeTouchPlayerIndex={activeTouchPlayerIndex}
          nearbyBuilding={nearbyBuilding}
          onReturnHome={() => setIsStartScreen(true)}
          onToggleAutoMove={handleToggleAutoMove}
          onToggleAudio={handleToggleAudio}
          onOpenDirectory={() => setShowDirectory(true)}
          onOpenQuizSetup={() => setQuizPreselectBuilding('ALL')}
          onOpenShop={() => setShowShop(true)}
          onOpenAvatar={() => setShowAvatar(true)}
          onOpenTeacher={() => setTeacherTab('impor')}
          onOpenRecap={() => setShowRecap(true)}
          onEnterNearbyBuilding={() => {
            if (nearbyBuilding) handleEnterBuilding(nearbyBuilding.id);
          }}
          onSelectTouchPlayer={handleSelectTouchPlayer}
          onSetVirtualKey={(dir, pressed) => worldRef.current?.setVirtualKey(dir, pressed)}
          onJumpPlayer={(idx) => worldRef.current?.triggerPlayerJump(idx)}
          onRotateCamera={(delta) => worldRef.current?.rotateCameraBy(delta)}
          onZoomCamera={(delta) => worldRef.current?.zoomCameraBy(delta)}
          onCycleCameraFocus={() => {
            const label = worldRef.current?.cycleCameraFocus() || 'Pemain 1';
            showToast(`Kamera Fokus: ${label}`, 'info');
          }}
          onReturnToPlaza={() => {
            worldRef.current?.returnPlayersToPlaza();
            showToast('Seluruh pemain kembali ke Plaza Monumen Kristal!', 'success');
          }}
        />
      )}

      {/* 5. Modals */}
      {showDirectory && (
        <DirectoryModal
          materials={materials}
          onClose={() => setShowDirectory(false)}
          onEnterBuilding={handleEnterBuilding}
          onTeleport={handleTeleport}
        />
      )}

      {activeBuilding && (
        <BuildingModal
          material={activeBuilding}
          onClose={() => setActiveBuildingId(null)}
          onTeleport={handleTeleport}
          onStartQuiz={(kode) => setQuizPreselectBuilding(kode)}
        />
      )}

      {quizPreselectBuilding !== null && (
        <QuizModal
          appConfig={appConfig}
          materials={materials}
          questions={questions}
          players={players}
          answeredIds={answeredIds}
          preselectBuilding={quizPreselectBuilding}
          onClose={() => setQuizPreselectBuilding(null)}
          onOpenTeacher={() => setTeacherTab('soal')}
          onOpenRecap={() => setShowRecap(true)}
          onRecordAnswer={handleRecordAnswer}
          onToast={showToast}
          onQuizActiveChange={setIsQuizActive}
          registerShortcutHandler={(fn) => {
            quizShortcutRef.current = fn;
          }}
        />
      )}

      {showAvatar && (
        <AvatarModal
          players={players}
          onClose={() => setShowAvatar(false)}
          onSave={handleSaveAvatars}
        />
      )}

      {showShop && (
        <ShopModal
          playerCoins={playerCoins}
          unlockedItems={unlockedShopItems}
          equippedItem={players[0]?.equippedItem || null}
          onClose={() => setShowShop(false)}
          onBuyItem={handleBuyShopItem}
          onEquipItem={handleEquipShopItem}
        />
      )}

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {teacherTab !== null && (
        <TeacherModal
          initialTab={teacherTab}
          appConfig={appConfig}
          materials={materials}
          questions={questions}
          onClose={() => setTeacherTab(null)}
          onUpdateConfig={handleUpdateConfig}
          onUpdateMaterials={handleUpdateMaterials}
          onUpdateQuestions={handleUpdateQuestions}
          onToast={showToast}
        />
      )}

      {showRecap && (
        <RecapModal
          logs={activityLogs}
          materials={materials}
          webhookUrl={sheetsWebhookUrl}
          onClose={() => setShowRecap(false)}
          onSaveWebhook={(url) => {
            setSheetsWebhookUrl(url);
            SafeStorage.set(STORAGE_KEYS.WEBHOOK, url);
            showToast(
              url
                ? 'Webhook Google Sheets disimpan! Hasil kuis akan dikirim otomatis saat online.'
                : 'Webhook dikosongkan.',
              'success'
            );
          }}
          onClearLogs={() => {
            setActivityLogs([]);
            SafeStorage.set(STORAGE_KEYS.LOGS, []);
            showToast('Log aktivitas nilai dibersihkan.', 'info');
          }}
          onToast={showToast}
        />
      )}
    </div>
  );
}
