import { Building2, Coffee, DoorOpen, Gem, MapPin, Palette, Pencil, X } from 'lucide-react';
import type { MaterialModule } from '../types/game';

interface DirectoryModalProps {
  materials: MaterialModule[];
  onClose: () => void;
  onEnterBuilding: (id: string) => void;
  onTeleport: (x: number, z: number, label: string) => void;
}

export function DirectoryModal({
  materials,
  onClose,
  onEnterBuilding,
  onTeleport,
}: DirectoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60">
      <div className="surface-panel rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-white animate-pop">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Peta Gedung & Area Kota Kreativitas DKV
            </h2>
            <p className="text-xs text-slate-600">
              Pilih gedung materi DKV Kelas X atau landmark kota untuk teleport langsung.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll space-y-5">
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-blue-700 mb-2.5">
              Gedung Materi Pembelajaran DKV
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map((m) => {
                const isVerif =
                  m.statusVerifikasi === 'TERVERIFIKASI_SUMBER' ||
                  m.statusVerifikasi === 'IMPOR_GURU';
                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between gap-2.5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold">
                        <span style={{ color: m.warna }}>{m.kodeGedung}</span>
                        <span className={isVerif ? 'text-emerald-700' : 'text-amber-700'}>
                          {isVerif ? 'Terverifikasi' : 'Perlu Verifikasi Guru'}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-base text-slate-900 mt-1">
                        {m.namaGedung}
                      </h4>
                      <p className="text-xs font-bold text-slate-600">
                        {m.bab} · {m.subbab}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          onClose();
                          onEnterBuilding(m.id);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <DoorOpen className="w-3.5 h-3.5" /> Masuk
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onTeleport(m.posX || 0, m.posZ || 0, m.namaGedung);
                        }}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Teleport
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-emerald-700 mb-2.5">
              Fasilitas & Landmark Kreativitas Kota
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-bold">
              <button
                onClick={() => {
                  onTeleport(0, 0, 'Monumen Kristal Utama');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 flex flex-col items-center gap-1.5 text-center cursor-pointer"
              >
                <Gem className="w-5 h-5 text-sky-600" />
                <span>Plaza & Monumen Kristal</span>
              </button>
              <button
                onClick={() => {
                  onTeleport(-24, -18, 'Monumen Palet Warna');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-900 flex flex-col items-center gap-1.5 text-center cursor-pointer"
              >
                <Palette className="w-5 h-5 text-pink-600" />
                <span>Monumen Palet Warna</span>
              </button>
              <button
                onClick={() => {
                  onTeleport(24, -18, 'Patung Pensil & Kamera');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 flex flex-col items-center gap-1.5 text-center cursor-pointer"
              >
                <Pencil className="w-5 h-5 text-amber-600" />
                <span>Patung Pensil & Kamera</span>
              </button>
              <button
                onClick={() => {
                  onTeleport(0, 26, 'Kantin Edublox & Galeri Karya');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 flex flex-col items-center gap-1.5 text-center cursor-pointer"
              >
                <Coffee className="w-5 h-5 text-emerald-600" />
                <span>Kantin Edublox & Galeri</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
