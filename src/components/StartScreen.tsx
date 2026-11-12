import {
  BookOpen,
  Boxes,
  Camera,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  LayoutGrid,
  ListChecks,
  Monitor,
  Paintbrush,
  Palette,
  PenTool,
  Play,
  Presentation,
  Rocket,
  Shapes,
  Type,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { AppConfig, MaterialModule, QuizQuestion } from '../types/game';

interface StartScreenProps {
  appConfig: AppConfig;
  materials: MaterialModule[];
  questions: QuizQuestion[];
  isOnline: boolean;
  onStartAdventure: () => void;
  onOpenAvatar: () => void;
  onOpenGuide: () => void;
  onOpenTeacher: (tab?: 'impor' | 'soal') => void;
  onOpenRecap: () => void;
}

export function StartScreen({
  appConfig,
  materials,
  questions,
  isOnline,
  onStartAdventure,
  onOpenAvatar,
  onOpenGuide,
  onOpenTeacher,
  onOpenRecap,
}: StartScreenProps) {
  const verifiedCount = materials.filter(
    (m) => m.statusVerifikasi === 'TERVERIFIKASI_SUMBER' || m.statusVerifikasi === 'IMPOR_GURU'
  ).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-900/45 overflow-y-auto">
      <div className="surface-panel rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border-4 border-white animate-pop my-auto">
        {/* Header Identitas */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-slate-200 pb-5">
          <div className="flex items-center gap-4 text-center md:text-left flex-col sm:flex-row">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg border-4 border-yellow-300 animate-float">
              <Boxes className="w-9 h-9 sm:w-10 sm:h-10" />
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-wide text-amber-800 uppercase mb-1 flex items-center justify-center sm:justify-start gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>{appConfig.className}</span>
                <span aria-hidden="true">·</span>
                <span>{appConfig.arenaTitle}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                EDUBLOX CITY{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">
                  BY SITTY
                </span>
              </h1>
              <p className="text-base sm:text-lg font-bold text-slate-700">
                Pembelajaran {appConfig.subjectName} (DKV)
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1.5 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 text-emerald-800">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              )}
              {isOnline
                ? 'Online · Sinkronisasi & Offline Siap'
                : 'Mode Offline Lokal (Penyimpanan Lokal Aktif)'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-800">
              <Database className="w-3.5 h-3.5" />
              Bank Materi & {questions.length} Soal DKV Terintegrasi
            </span>
          </div>
        </div>

        {/* Status Kelengkapan Materi & Bank Soal */}
        <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-300 p-3.5 sm:p-4 text-xs sm:text-sm text-emerald-950">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-emerald-950 flex flex-wrap items-center gap-2">
                <span>Materi & Bank Soal DKV Kelas X Siap Dimainkan</span>
                <span className="text-xs font-extrabold text-emerald-800">
                  ({verifiedCount} / {materials.length} Bab Terverifikasi · {questions.length} Soal)
                </span>
              </div>
              <p className="mt-1 text-emerald-900 leading-relaxed">
                Seluruh {materials.length} gedung pembelajaran (
                <strong>Studio Dasar DKV & Nirmana</strong>,{' '}
                <strong>Lab Warna & Tipografi</strong>,{' '}
                <strong>Galeri Ilustrasi & Sketsa</strong>, dan{' '}
                <strong>Studio Fotografi & Media Digital</strong>) telah dilengkapi ringkasan
                materi, contoh, serta <strong>{questions.length} soal pilihan ganda</strong> beserta
                pembahasannya.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  onClick={onStartAdventure}
                  className="btn-blox px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" /> Langsung Masuk Kota & Kerjakan Kuis
                </button>
                <button
                  onClick={() => onOpenTeacher('soal')}
                  className="btn-blox px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-400 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ListChecks className="w-3.5 h-3.5" /> Kelola / Tambah Soal di Panel Guru
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pratinjau Visual Kota 3D & Tombol Navigasi Utama */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          <div className="md:col-span-7 rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-4 text-white flex flex-col justify-between shadow-inner border border-sky-300">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-200">
                Dunia Voxel Interaktif 3D
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mt-1">
                Jelajahi Kota Kreativitas DKV!
              </h2>
              <p className="text-xs sm:text-sm text-sky-100 mt-1">
                Temukan Monumen Palet Warna, Patung Pensil Raksasa, Taman Tipografi, Galeri
                Ilustrasi, Kantin Edublox, dan Gedung Pembelajaran DKV Kelas X.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-sky-100">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-yellow-300" /> 1–4 Pemain Co-Op
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <LayoutGrid className="w-3.5 h-3.5 text-pink-300" /> 4-Way Split Screen
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" /> Ekspor CSV & Sheets
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-around bg-white/10 rounded-xl p-2.5">
              <PenTool className="w-6 h-6 text-yellow-300" aria-label="Pena" />
              <Paintbrush className="w-6 h-6 text-pink-300" aria-label="Kuas" />
              <Palette className="w-6 h-6 text-emerald-300" aria-label="Palet Warna" />
              <Camera className="w-6 h-6 text-cyan-200" aria-label="Kamera" />
              <Type className="w-6 h-6 text-amber-200" aria-label="Tipografi" />
              <Shapes className="w-6 h-6 text-purple-200" aria-label="Geometris" />
              <Monitor className="w-6 h-6 text-rose-200" aria-label="Media Digital" />
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col justify-center gap-2.5">
            <button
              onClick={onStartAdventure}
              className="btn-blox w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-bold text-lg sm:text-xl flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" /> MULAI PETUALANGAN
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onOpenAvatar}
                className="btn-blox py-2.5 px-3 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" /> PILIH AVATAR
              </button>
              <button
                onClick={onOpenGuide}
                className="btn-blox py-2.5 px-3 rounded-2xl bg-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" /> PANDUAN
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onOpenTeacher('impor')}
                className="btn-blox py-2.5 px-3 rounded-2xl bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Presentation className="w-4 h-4" /> PANEL GURU
              </button>
              <button
                onClick={onOpenRecap}
                className="btn-blox py-2.5 px-3 rounded-2xl bg-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> REKAP NILAI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
