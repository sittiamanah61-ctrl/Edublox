import { BookOpen, X } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

export function GuideModal({ onClose }: GuideModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65">
      <div className="surface-panel rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-white animate-pop">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            Panduan Bermain Edublox City By Sitty
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-700 font-bold flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll space-y-4 text-sm text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <h3 className="font-display font-bold text-blue-900 mb-1">
                1. Jelajahi Kota Kreativitas DKV
              </h3>
              <p className="text-xs leading-relaxed">
                Gunakan tombol keyboard, D-Pad layar sentuh, atau fitur Teleport untuk berjalan
                menuju gedung materi DKV, Taman Tipografi, Galeri Karya, dan Kantin Edublox.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <h3 className="font-display font-bold text-emerald-900 mb-1">
                2. Belajar & Jawab Kuis
              </h3>
              <p className="text-xs leading-relaxed">
                Masuki gedung untuk membaca ringkasan materi, daftar submateri, contoh desain, lalu
                kerjakan kuis untuk memperoleh <strong>100 poin</strong> dan{' '}
                <strong>koin kreatif</strong>.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200">
              <h3 className="font-display font-bold text-pink-900 mb-1">
                3. Kontrol 4 Pemain Lokal (Co-Op)
              </h3>
              <ul className="text-xs space-y-0.5">
                <li>
                  <strong>P1:</strong> W A S D + Spasi (Lompat)
                </li>
                <li>
                  <strong>P2:</strong> Panah ↑ ← ↓ → + Enter (Lompat)
                </li>
                <li>
                  <strong>P3:</strong> I J K L + U (Lompat)
                </li>
                <li>
                  <strong>P4:</strong> T F G H + R (Lompat)
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <h3 className="font-display font-bold text-amber-900 mb-1">
                4. Panel Guru & Rekap Nilai
              </h3>
              <p className="text-xs leading-relaxed">
                Guru dapat mengimpor materi dari website, mengelola bab & soal, membuat soal AI
                berbasis materi terverifikasi, serta mengunduh rekap nilai ke CSV/Google Sheets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
