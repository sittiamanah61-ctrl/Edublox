import { useState } from 'react';
import {
  AlignLeft,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Link2,
  ListChecks,
  MapPin,
  Palette,
  Play,
  X,
} from 'lucide-react';
import type { MaterialModule } from '../types/game';
import { SoundFX } from '../utils/sound';

interface BuildingModalProps {
  material: MaterialModule;
  onClose: () => void;
  onTeleport: (x: number, z: number, label: string) => void;
  onStartQuiz: (kodeGedung: string) => void;
}

export function BuildingModal({
  material,
  onClose,
  onTeleport,
  onStartQuiz,
}: BuildingModalProps) {
  const [drawerMode, setDrawerMode] = useState<'none' | 'study' | 'examples'>('none');

  const isVerif =
    material.statusVerifikasi === 'TERVERIFIKASI_SUMBER' ||
    material.statusVerifikasi === 'IMPOR_GURU';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65">
      <div className="surface-panel rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border-4 border-white animate-pop">
        {/* Header Gedung */}
        <div
          className="p-4 sm:p-6 rounded-t-2xl text-white flex items-start justify-between gap-3"
          style={{
            background: `linear-gradient(135deg, ${material.warna || '#2563EB'}, #1e1b4b)`,
          }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Palette className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-amber-200">
                <span>{material.bab}</span>
                <span aria-hidden="true">·</span>
                <span>{isVerif ? 'Terverifikasi Sumber' : 'Perlu Verifikasi Guru'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mt-1">
                {material.namaGedung} — {material.judul}
              </h2>
              <p className="text-xs text-white/85 mt-0.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                <span>Referensi: {material.referensiSumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi Gedung */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll space-y-4 flex-1">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <h3 className="font-display font-bold text-base text-slate-900 mb-1.5 flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-blue-600" />
              Ringkasan Materi
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {material.ringkasan}
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-base text-slate-900 mb-2 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-purple-600" />
              Daftar Submateri & Konsep Penting
            </h3>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5">
              <div className="font-bold text-xs text-purple-700 uppercase">{material.subbab}</div>
              <div className="text-xs font-extrabold text-slate-800">Konsep Penting:</div>
              <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                {material.konsepPenting.map((k, idx) => (
                  <li key={idx}>{k}</li>
                ))}
              </ul>
              <div className="text-xs font-extrabold text-slate-800 pt-1">Istilah Penting:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {material.istilahPenting.map((it, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900">{it.istilah}</div>
                    <div className="text-slate-600 mt-0.5">{it.definisi}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {drawerMode === 'study' && (
            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 space-y-2 animate-pop">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  Panduan Belajar Terstruktur: {material.judul}
                </h4>
                <span className="text-[11px] font-bold text-indigo-700">
                  Baca seluruh poin sebelum kuis
                </span>
              </div>
              <p className="p-3 rounded-xl bg-white border border-indigo-100 text-xs text-slate-800">
                <strong>1. Pemahaman Inti:</strong> {material.ringkasan}
              </p>
              <p className="p-3 rounded-xl bg-white border border-indigo-100 text-xs text-slate-800">
                <strong>2. Fokus Subbab ({material.subbab}):</strong>{' '}
                {material.konsepPenting.join(' · ')}
              </p>
            </div>
          )}

          {drawerMode === 'examples' && (
            <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4 space-y-2 animate-pop">
              <h4 className="font-display font-bold text-sm text-purple-950 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                Contoh & Penerapan Materi ({material.bab})
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {(material.contoh.length ? material.contoh : ['Belum ada contoh yang ditambahkan.']).map(
                  (ex, i) => (
                    <li key={i} className="p-2.5 rounded-xl bg-white border border-purple-100">
                      <strong>Contoh {i + 1}:</strong> {ex}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Tombol Aksi */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                SoundFX.select();
                setDrawerMode((m) => (m === 'study' ? 'none' : 'study'));
              }}
              className="btn-blox px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" /> Mulai Belajar
            </button>
            <button
              onClick={() => {
                SoundFX.select();
                setDrawerMode((m) => (m === 'examples' ? 'none' : 'examples'));
              }}
              className="btn-blox px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" /> Lihat Contoh
            </button>
            <button
              onClick={() => {
                onClose();
                onTeleport(material.posX || 0, material.posZ || 0, material.namaGedung);
              }}
              className="btn-blox px-3.5 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-4 h-4" /> Teleport
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onStartQuiz(material.kodeGedung);
            }}
            className="btn-blox px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-bold text-sm sm:text-base inline-flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> Mulai Kuis Gedung Ini
          </button>
        </div>
      </div>
    </div>
  );
}
