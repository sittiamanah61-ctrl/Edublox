import { useState } from 'react';
import { Check, Users, X } from 'lucide-react';
import { AVATAR_PRESETS } from '../data/dkvData';
import type { PlayerState } from '../types/game';
import { SoundFX } from '../utils/sound';

interface AvatarModalProps {
  players: PlayerState[];
  onClose: () => void;
  onSave: (updated: PlayerState[]) => void;
}

export function AvatarModal({ players, onClose, onSave }: AvatarModalProps) {
  const [drafts, setDrafts] = useState<PlayerState[]>(() =>
    players.map((p) => ({ ...p }))
  );

  const updateDraft = (idx: number, patch: Partial<PlayerState>) => {
    setDrafts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65">
      <div className="surface-panel rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-white animate-pop">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Kustomisasi Avatar & Co-Op 4 Pemain
            </h2>
            <p className="text-xs text-slate-600">
              Atur nama siswa, pilih 1 dari 6 karakter voxel, dan aktifkan pemain P1–P4.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-700 font-bold flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map((p, idx) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-display font-bold text-xs">
                  Pemain {p.id}
                </span>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.active}
                    disabled={idx === 0}
                    onChange={(e) => updateDraft(idx, { active: e.target.checked })}
                  />
                  <span>Aktif di Kota 3D</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                  Nama Siswa
                </label>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updateDraft(idx, { name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                  Pilih Karakter Voxel
                </label>
                <select
                  value={p.avatarId}
                  onChange={(e) => updateDraft(idx, { avatarId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-900"
                >
                  {AVATAR_PRESETS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 bg-slate-50 rounded-b-2xl">
          <span className="text-xs font-bold text-slate-600">
            Perubahan langsung diterapkan pada karakter 3D di Kota Kreativitas DKV.
          </span>
          <button
            onClick={() => {
              SoundFX.select();
              onSave(drafts.map((d, i) => ({ ...d, name: d.name.trim() || `Siswa ${i + 1}` })));
              onClose();
            }}
            className="btn-blox px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-display font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Simpan & Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
