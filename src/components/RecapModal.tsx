import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Copy,
  FileSpreadsheet,
  Medal,
  Trash2,
  X,
} from 'lucide-react';
import type { ActivityLog, MaterialModule } from '../types/game';

interface RecapModalProps {
  logs: ActivityLog[];
  materials: MaterialModule[];
  webhookUrl: string;
  onClose: () => void;
  onSaveWebhook: (url: string) => void;
  onClearLogs: () => void;
  onToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export function RecapModal({
  logs,
  materials,
  webhookUrl,
  onClose,
  onSaveWebhook,
  onClearLogs,
  onToast,
}: RecapModalProps) {
  const [filterStudent, setFilterStudent] = useState('ALL');
  const [filterBuilding, setFilterBuilding] = useState('ALL');
  const [webhookInput, setWebhookInput] = useState(webhookUrl);

  const uniqueStudents = useMemo(() => [...new Set(logs.map((l) => l.namaSiswa))], [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterStudent !== 'ALL' && l.namaSiswa !== filterStudent) return false;
      if (filterBuilding !== 'ALL' && l.kodeGedung !== filterBuilding) return false;
      return true;
    });
  }, [logs, filterStudent, filterBuilding]);

  const stats = useMemo(() => {
    const totalAct = filtered.length;
    const correctCount = filtered.filter((l) => l.status === 'Benar').length;
    const wrongCount = totalAct - correctCount;
    const accuracy = totalAct > 0 ? Math.round((correctCount / totalAct) * 100) : 0;

    const studentScores: Record<string, number> = {};
    const wrongByMaterial: Record<string, number> = {};
    filtered.forEach((l) => {
      studentScores[l.namaSiswa] = (studentScores[l.namaSiswa] || 0) + Number(l.poin || 0);
      if (l.status === 'Salah') {
        wrongByMaterial[l.materi] = (wrongByMaterial[l.materi] || 0) + 1;
      }
    });

    const rankedStudents = Object.entries(studentScores).sort((a, b) => b[1] - a[1]);
    const highestScore = rankedStudents.length > 0 ? rankedStudents[0][1] : 0;
    const hardestMaterial = Object.entries(wrongByMaterial).sort((a, b) => b[1] - a[1])[0];

    return {
      totalAct,
      correctCount,
      wrongCount,
      accuracy,
      rankedStudents,
      highestScore,
      hardestMaterial,
    };
  }, [filtered]);

  const getRecapRowsMatrix = () => {
    const headers = [
      'Waktu Pengerjaan',
      'Nama Kelas',
      'Nama Siswa',
      'ID Pemain',
      'Kode Gedung',
      'Bab',
      'Subbab',
      'Materi',
      'Submateri',
      'Nomor Soal',
      'Pertanyaan',
      'Jawaban Siswa',
      'Kunci Jawaban',
      'Status Benar/Salah',
      'Poin',
      'Skor Total',
    ];
    const rows = logs.map((l) => [
      l.waktu,
      l.kelas,
      l.namaSiswa,
      l.idPemain,
      l.kodeGedung,
      l.bab,
      l.subbab,
      l.materi,
      l.submateri,
      l.nomorSoal,
      l.pertanyaan,
      l.jawabanSiswa,
      l.kunciJawaban,
      l.status,
      l.poin,
      l.skorTotal,
    ]);
    return [headers, ...rows];
  };

  const downloadCsvBom = () => {
    const matrix = getRecapRowsMatrix();
    const csvContent = matrix
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_Edublox_DKV_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Berkas CSV UTF-8 BOM berhasil diunduh!', 'success');
  };

  const copyTsvClipboard = async () => {
    const matrix = getRecapRowsMatrix();
    const tsv = matrix
      .map((row) => row.map((c) => String(c ?? '').replace(/\t|\n|\r/g, ' ')).join('\t'))
      .join('\n');

    try {
      await navigator.clipboard.writeText(tsv);
      onToast('Tabel TSV berhasil disalin! Siap ditempel (Ctrl+V) ke Google Sheets / Excel.', 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = tsv;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        onToast('Tabel TSV berhasil disalin! Siap ditempel ke Google Sheets / Excel.', 'success');
      } catch {
        onToast('Gagal menyalin otomatis. Gunakan tombol Download CSV UTF-8 BOM.', 'warning');
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75">
      <div className="surface-panel rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border-4 border-white animate-pop overflow-hidden">
        <div className="px-4 py-3.5 bg-gradient-to-r from-pink-600 to-purple-700 text-white flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Rekap Nilai Siswa & Ekspor Spreadsheet
            </h2>
            <p className="text-[11px] text-pink-100">
              Statistik real-time, peringkat, analisis kesalahan materi, CSV UTF-8 BOM, TSV & Google
              Sheets
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll flex-1 space-y-4">
          {/* Kartu Statistik */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center tabular-nums">
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="text-[11px] font-extrabold text-blue-700">Jumlah Siswa</div>
              <div className="font-display font-bold text-xl text-slate-900">
                {uniqueStudents.length}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
              <div className="text-[11px] font-extrabold text-slate-600">Total Aktivitas</div>
              <div className="font-display font-bold text-xl text-slate-900">{stats.totalAct}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-extrabold text-emerald-700">Jawaban Benar</div>
              <div className="font-display font-bold text-xl text-emerald-700">
                {stats.correctCount}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="text-[11px] font-extrabold text-rose-700">Jawaban Salah</div>
              <div className="font-display font-bold text-xl text-rose-700">{stats.wrongCount}</div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
              <div className="text-[11px] font-extrabold text-purple-700">Rata-rata Akurasi</div>
              <div className="font-display font-bold text-xl text-purple-800">{stats.accuracy}%</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-extrabold text-amber-800">Skor Tertinggi</div>
              <div className="font-display font-bold text-xl text-amber-900">
                {stats.highestScore}
              </div>
            </div>
          </div>

          {/* Peringkat & Analisis Kesalahan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
              <div className="font-display font-bold text-sm text-slate-900 mb-1.5 flex items-center gap-1.5">
                <Medal className="w-4 h-4 text-yellow-500" /> Peringkat Akumulasi Siswa
              </div>
              {stats.rankedStudents.length === 0 ? (
                <p className="text-slate-500">Belum ada data pengerjaan kuis.</p>
              ) : (
                stats.rankedStudents.map(([name, sc], i) => (
                  <div
                    key={name}
                    className="flex justify-between py-1 border-b border-slate-100 font-bold tabular-nums"
                  >
                    <span>
                      #{i + 1} {name}
                    </span>
                    <span className="text-emerald-700">{sc} Poin</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Analisis Materi Perlu Penguatan
              </div>
              <p className="text-slate-700">
                {stats.hardestMaterial
                  ? `Materi paling banyak kesalahan: ${stats.hardestMaterial[0]} (${stats.hardestMaterial[1]} kesalahan)`
                  : 'Belum ada catatan kesalahan materi.'}
              </p>
              <div className="pt-1 border-t border-slate-200">
                <label className="block font-extrabold text-slate-700 mb-1">
                  Webhook Google Apps Script (Integrasi Google Sheets)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => onSaveWebhook(webhookInput.trim())}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Filter & Ekspor */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold"
              >
                <option value="ALL">Semua Siswa</option>
                {uniqueStudents.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold"
              >
                <option value="ALL">Semua Gedung</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.kodeGedung}>
                    {m.kodeGedung}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadCsvBom}
                className="btn-blox px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Download CSV UTF-8 BOM
              </button>
              <button
                onClick={copyTsvClipboard}
                className="btn-blox px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Salin Tabel TSV
              </button>
              <button
                onClick={onClearLogs}
                className="px-3 py-2 rounded-xl bg-rose-100 text-rose-700 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset Log
              </button>
            </div>
          </div>

          {/* Tabel Detail */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-[11px] tabular-nums">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-2.5">Waktu</th>
                  <th className="p-2.5">Kelas</th>
                  <th className="p-2.5">Siswa (ID)</th>
                  <th className="p-2.5">Gedung / Bab</th>
                  <th className="p-2.5">Materi / Submateri</th>
                  <th className="p-2.5">No. Soal</th>
                  <th className="p-2.5">Jawaban Siswa</th>
                  <th className="p-2.5">Kunci</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Poin</th>
                  <th className="p-2.5">Skor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-5 text-center text-slate-500 font-bold">
                      Belum ada catatan aktivitas kuis siswa.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l, idx) => (
                    <tr key={`${l.waktu}-${l.idPemain}-${idx}`} className="hover:bg-slate-50">
                      <td className="p-2 whitespace-nowrap">{l.waktu}</td>
                      <td className="p-2">{l.kelas}</td>
                      <td className="p-2 font-bold">
                        {l.namaSiswa} ({l.idPemain})
                      </td>
                      <td className="p-2">
                        {l.kodeGedung} · {l.bab}
                      </td>
                      <td className="p-2">
                        {l.materi} / {l.submateri}
                      </td>
                      <td className="p-2 font-bold">#{l.nomorSoal}</td>
                      <td className="p-2 max-w-[160px] truncate" title={l.jawabanSiswa}>
                        {l.jawabanSiswa}
                      </td>
                      <td className="p-2 max-w-[140px] truncate" title={l.kunciJawaban}>
                        {l.kunciJawaban}
                      </td>
                      <td
                        className={`p-2 font-extrabold ${
                          l.status === 'Benar' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {l.status}
                      </td>
                      <td className="p-2 font-bold">{l.poin}</td>
                      <td className="p-2 font-extrabold text-slate-900">{l.skorTotal}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
