import { useState, type ChangeEvent } from 'react';
import {
  Book,
  Building2,
  Download,
  FileInput,
  ListOrdered,
  Plus,
  PlusCircle,
  Presentation,
  RefreshCw,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  AppConfig,
  DifficultyLevel,
  MaterialModule,
  QuizQuestion,
  VerificationStatus,
} from '../types/game';

export type TeacherTab = 'impor' | 'app' | 'materi' | 'soal' | 'ai' | 'kuis';

interface TeacherModalProps {
  initialTab: TeacherTab;
  appConfig: AppConfig;
  materials: MaterialModule[];
  questions: QuizQuestion[];
  onClose: () => void;
  onUpdateConfig: (cfg: AppConfig) => void;
  onUpdateMaterials: (mats: MaterialModule[]) => void;
  onUpdateQuestions: (qs: QuizQuestion[]) => void;
  onToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export function TeacherModal({
  initialTab,
  appConfig,
  materials,
  questions,
  onClose,
  onUpdateConfig,
  onUpdateMaterials,
  onUpdateQuestions,
  onToast,
}: TeacherModalProps) {
  const [tab, setTab] = useState<TeacherTab>(initialTab);

  // Tab 1: Impor
  const [importTarget, setImportTarget] = useState('NEW');
  const [importSourceRef, setImportSourceRef] = useState(
    appConfig.sourceUrl || 'https://dkv-psi.vercel.app/'
  );
  const [importRawText, setImportRawText] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // Tab 2: App identity
  const [cfgSubject, setCfgSubject] = useState(appConfig.subjectName);
  const [cfgClass, setCfgClass] = useState(appConfig.className);
  const [cfgArena, setCfgArena] = useState(appConfig.arenaTitle);

  // Tab 4: Add question
  const [newQBuilding, setNewQBuilding] = useState(materials[0]?.kodeGedung || 'GDG-01');
  const [newQDiff, setNewQDiff] = useState<DifficultyLevel>('Mudah');
  const [newQKey, setNewQKey] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [newQText, setNewQText] = useState('');
  const [newQA, setNewQA] = useState('');
  const [newQB, setNewQB] = useState('');
  const [newQC, setNewQC] = useState('');
  const [newQD, setNewQD] = useState('');
  const [newQExp, setNewQExp] = useState('');
  const [newQRef, setNewQRef] = useState('https://dkv-psi.vercel.app/');

  // Tab 5: AI Generator
  const [aiCount, setAiCount] = useState(3);
  const [aiMode, setAiMode] = useState<'append' | 'replace'>('append');
  const [aiBuilding, setAiBuilding] = useState(materials[0]?.kodeGedung || 'GDG-01');
  const [aiDiff, setAiDiff] = useState<DifficultyLevel>('Sedang');
  const [aiFeedback, setAiFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Tab 6: Quiz Settings
  const [qDuration, setQDuration] = useState(appConfig.quizDuration);
  const [qPerSession, setQPerSession] = useState(appConfig.questionsPerSession);
  const [qPoints, setQPoints] = useState(appConfig.pointsPerCorrect);
  const [qCoins, setQCoins] = useState(appConfig.coinsPerCorrect);

  const aiQuestionsCount = questions.filter((q) => q.kategoriBank === 'TAMBAHAN_AI').length;

  const handleServerUrlSync = async () => {
    setIsFetchingUrl(true);
    onToast(`Mengambil konten dari ${importSourceRef}...`, 'info');
    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importSourceRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengambil URL');
      if (!data.text || data.text.length < 80) {
        onToast(
          'Halaman SPA merender konten via JavaScript dinamis sehingga teks minimal. Silakan salin-tempel teks langsung dari tab website.',
          'warning'
        );
      } else {
        setImportRawText(data.text);
        onToast('Teks halaman berhasil dimuat! Periksa lalu klik Ekstrak & Verifikasi.', 'success');
      }
    } catch (err) {
      onToast(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil konten URL. Silakan salin-tempel teks langsung.',
        'warning'
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleProcessTextImport = () => {
    const raw = importRawText.trim();
    const refUrl = importSourceRef.trim() || 'https://dkv-psi.vercel.app/';
    if (raw.length < 25) {
      onToast('Teks materi terlalu singkat. Tempelkan paragraf/bab asli.', 'warning');
      return;
    }

    const lines = raw
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const babTitle = lines[0].slice(0, 80);
    const subbabTitle =
      lines.length > 1 ? lines[1].slice(0, 90) : `Subbab Utama – ${babTitle}`;
    const ringkasan = lines.slice(1).join('\n').slice(0, 1800) || raw.slice(0, 1800);
    const sentences = ringkasan
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 18);
    const konsepPenting = sentences.slice(0, 5);
    const istilahPenting: { istilah: string; definisi: string }[] = [];

    lines.forEach((line) => {
      const colonMatch = line.match(/^([A-Za-z0-9\s\-()]{3,35}):\s*(.{10,180})$/);
      if (colonMatch && istilahPenting.length < 6) {
        istilahPenting.push({
          istilah: colonMatch[1].trim(),
          definisi: colonMatch[2].trim(),
        });
      }
    });
    if (istilahPenting.length === 0) {
      istilahPenting.push({
        istilah: babTitle,
        definisi: sentences[0] || ringkasan.slice(0, 140),
      });
    }

    const palette = ['#2563EB', '#EC4899', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4'];
    const icons = ['pen-nib', 'palette', 'paintbrush', 'camera', 'font', 'shapes'];

    if (importTarget === 'NEW') {
      const idx = materials.length;
      const newMat: MaterialModule = {
        id: `MAT-${Date.now()}`,
        kodeGedung: `GDG-0${idx + 1}`,
        namaGedung: `Gedung ${babTitle.slice(0, 26)}`,
        ikon: icons[idx % icons.length],
        warna: palette[idx % palette.length],
        posX: (idx % 2 === 0 ? -1 : 1) * 22,
        posZ: -6 + Math.floor(idx / 2) * 18,
        bab: babTitle,
        subbab: subbabTitle,
        judul: babTitle,
        ringkasan,
        konsepPenting: konsepPenting.length ? konsepPenting : [ringkasan.slice(0, 150)],
        istilahPenting,
        contoh: sentences.slice(1, 4).length
          ? sentences.slice(1, 4)
          : ['Lihat ringkasan materi asli di atas.'],
        referensiSumber: refUrl,
        statusVerifikasi: 'IMPOR_GURU',
        isCustom: true,
      };
      onUpdateMaterials([...materials, newMat]);
    } else {
      const updated = materials.map((m) =>
        m.id === importTarget
          ? {
              ...m,
              bab: babTitle,
              subbab: subbabTitle,
              judul: babTitle,
              namaGedung: `Gedung ${babTitle.slice(0, 26)}`,
              ringkasan,
              konsepPenting: konsepPenting.length ? konsepPenting : [ringkasan.slice(0, 150)],
              istilahPenting,
              contoh: sentences.slice(1, 4).length
                ? sentences.slice(1, 4)
                : ['Lihat ringkasan materi asli di atas.'],
              referensiSumber: refUrl,
              statusVerifikasi: 'IMPOR_GURU' as VerificationStatus,
            }
          : m
      );
      onUpdateMaterials(updated);
    }

    setImportRawText('');
    onToast('Materi website berhasil diekstrak, diverifikasi, dan diperbarui pada Gedung 3D!', 'success');
  };

  const handleExportJson = () => {
    const payload = { appConfig, materialsData: materials, questionsData: questions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Edublox_DKV_Kurikulum_Backup.json';
    a.click();
    URL.revokeObjectURL(url);
    onToast('Cadangan JSON materi & soal berhasil diunduh!', 'success');
  };

  const handleImportJson = (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.materialsData)) onUpdateMaterials(parsed.materialsData);
        if (Array.isArray(parsed.questionsData)) onUpdateQuestions(parsed.questionsData);
        if (parsed.appConfig) onUpdateConfig({ ...appConfig, ...parsed.appConfig });
        onToast('Berkas JSON materi & soal berhasil dimuat!', 'success');
      } catch {
        onToast('Format berkas JSON tidak valid.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleAddQuestion = () => {
    if (!newQText.trim() || !newQA.trim() || !newQB.trim() || !newQC.trim() || !newQD.trim()) {
      onToast('Lengkapi pertanyaan dan seluruh pilihan A, B, C, D!', 'warning');
      return;
    }
    const mat = materials.find((m) => m.kodeGedung === newQBuilding) || materials[0];
    const added: QuizQuestion = {
      idSoal: `SOAL-${Date.now()}`,
      nomorSoal: questions.length + 1,
      kodeGedung: newQBuilding,
      bab: mat.bab,
      subbab: mat.subbab,
      materi: mat.judul,
      submateri: mat.subbab,
      tingkatKesulitan: newQDiff,
      pertanyaan: newQText.trim(),
      pilihanA: newQA.trim(),
      pilihanB: newQB.trim(),
      pilihanC: newQC.trim(),
      pilihanD: newQD.trim(),
      kunciJawaban: newQKey,
      pembahasan: newQExp.trim() || 'Jawaban sesuai materi referensi.',
      referensiSumber: newQRef.trim() || mat.referensiSumber,
      statusVerifikasi: 'IMPOR_GURU',
      kategoriBank: 'UTAMA',
    };
    onUpdateQuestions([...questions, added]);
    setNewQText('');
    setNewQA('');
    setNewQB('');
    setNewQC('');
    setNewQD('');
    setNewQExp('');
    onToast('Soal baru berhasil ditambahkan ke Bank Soal Utama!', 'success');
  };

  const handleRunAiGenerator = async () => {
    const mat = materials.find((m) => m.kodeGedung === aiBuilding);
    if (!mat) return;
    if (mat.statusVerifikasi === 'PERLU_VERIFIKASI_GURU') {
      setAiFeedback({
        isError: true,
        text: 'Materi pada bab ini berstatus PERLU VERIFIKASI GURU. Verifikasi atau impor materi terlebih dahulu pada Tab 1.',
      });
      return;
    }

    setIsGeneratingAi(true);
    setAiFeedback(null);

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: aiCount, difficulty: aiDiff, material: mat }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const baseList =
            aiMode === 'replace'
              ? questions.filter((q) => q.kategoriBank !== 'TAMBAHAN_AI')
              : [...questions];

          const generated: QuizQuestion[] = data.questions.map(
            (
              item: {
                pertanyaan: string;
                pilihanA: string;
                pilihanB: string;
                pilihanC: string;
                pilihanD: string;
                kunciJawaban?: string;
                pembahasan?: string;
                materi?: string;
              },
              i: number
            ) => ({
              idSoal: `AI-${Date.now()}-${i}`,
              nomorSoal: baseList.length + i + 1,
              kodeGedung: mat.kodeGedung,
              bab: mat.bab,
              subbab: mat.subbab,
              materi: item.materi || mat.judul,
              submateri: mat.subbab,
              tingkatKesulitan: aiDiff,
              pertanyaan: item.pertanyaan,
              pilihanA: item.pilihanA,
              pilihanB: item.pilihanB,
              pilihanC: item.pilihanC,
              pilihanD: item.pilihanD,
              kunciJawaban: (['A', 'B', 'C', 'D'].includes(item.kunciJawaban || '')
                ? item.kunciJawaban
                : 'A') as 'A' | 'B' | 'C' | 'D',
              pembahasan: item.pembahasan || mat.ringkasan.slice(0, 140),
              referensiSumber: mat.referensiSumber,
              statusVerifikasi: 'PERLU_VERIFIKASI_GURU',
              kategoriBank: 'TAMBAHAN_AI',
            })
          );

          onUpdateQuestions([...baseList, ...generated]);
          setAiFeedback({
            isError: false,
            text: `${generated.length} soal Gemini AI berhasil dibuat dan disimpan ke BANK SOAL TAMBAHAN AI.`,
          });
          onToast(`${generated.length} soal AI berhasil disimpan!`, 'success');
          setIsGeneratingAi(false);
          return;
        }
      }
    } catch {
      // Fallback gracefully to deterministic synthesis below
    }

    // Deterministic synthesis from verified terms when Gemini API key is not configured or offline
    if (!mat.istilahPenting || mat.istilahPenting.length === 0) {
      setAiFeedback({
        isError: true,
        text: 'Layanan AI server belum tersedia dan istilah terstruktur belum mencukupi.',
      });
      setIsGeneratingAi(false);
      return;
    }

    const baseList =
      aiMode === 'replace'
        ? questions.filter((q) => q.kategoriBank !== 'TAMBAHAN_AI')
        : [...questions];

    const synthesized: QuizQuestion[] = [];
    for (let i = 0; i < aiCount; i++) {
      const termObj = mat.istilahPenting[i % mat.istilahPenting.length];
      const concept =
        mat.konsepPenting[i % mat.konsepPenting.length] || mat.ringkasan.slice(0, 120);
      synthesized.push({
        idSoal: `AI-SYN-${Date.now()}-${i}`,
        nomorSoal: baseList.length + i + 1,
        kodeGedung: mat.kodeGedung,
        bab: mat.bab,
        subbab: mat.subbab,
        materi: mat.judul,
        submateri: mat.subbab,
        tingkatKesulitan: aiDiff,
        pertanyaan: `[SINTESIS MATERI – ${aiDiff}] Berdasarkan materi ${mat.bab} (${mat.subbab}), manakah penjelasan yang tepat mengenai "${termObj.istilah}"?`,
        pilihanA: termObj.definisi,
        pilihanB: 'Konsep yang tidak tercantum dalam materi sumber DKV Kelas X',
        pilihanC: 'Prosedur perakitan perangkat keras server jaringan',
        pilihanD: 'Rumus perhitungan akuntansi neraca keuangan',
        kunciJawaban: 'A',
        pembahasan: `Berdasarkan materi terverifikasi (${mat.referensiSumber}): ${termObj.istilah} adalah ${termObj.definisi}. Konteks terkait: ${concept}`,
        referensiSumber: mat.referensiSumber,
        statusVerifikasi: 'PERLU_VERIFIKASI_GURU',
        kategoriBank: 'TAMBAHAN_AI',
      });
    }

    onUpdateQuestions([...baseList, ...synthesized]);
    setAiFeedback({
      isError: false,
      text: `${synthesized.length} soal berbasis istilah materi terverifikasi berhasil disintesis ke BANK SOAL TAMBAHAN AI.`,
    });
    onToast(`${synthesized.length} soal tambahan ditambahkan!`, 'success');
    setIsGeneratingAi(false);
  };

  const tabs: { id: TeacherTab; label: string; icon: typeof FileInput }[] = [
    { id: 'impor', label: '1. Ekstraksi & Impor Website', icon: FileInput },
    { id: 'app', label: '2. Aplikasi & Gedung', icon: Building2 },
    { id: 'materi', label: '3. Materi & Subbab', icon: Book },
    { id: 'soal', label: '4. Bank Soal', icon: ListOrdered },
    { id: 'ai', label: '5. AI Generator Soal', icon: Sparkles },
    { id: 'kuis', label: '6. Pengaturan Kuis', icon: Sliders },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75">
      <div className="surface-panel rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border-4 border-white animate-pop overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl leading-tight">
                Panel Custom Guru – EDUBLOX CITY BY SITTY
              </h2>
              <p className="text-[11px] text-slate-300">
                Manajemen Impor Website, Gedung 3D, Materi, Bank Soal & AI Generator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-rose-600 text-white font-bold flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-1.5 text-xs">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-extrabold'
                    : 'bg-white text-slate-700 font-bold hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll flex-1 space-y-4">
          {/* TAB 1: IMPOR */}
          {tab === 'impor' && (
            <>
              <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 space-y-2 text-xs sm:text-sm">
                <div className="font-display font-bold text-amber-950 text-base">
                  Impor & Pembaruan Materi Sumber ({appConfig.sourceUrl})
                </div>
                <p className="text-amber-900">
                  Materi lengkap 4 Bab DKV Kelas X telah terintegrasi secara lokal. Guru dapat
                  menyinkronkan ulang URL website atau menyalin-tempel materi baru di bawah ini untuk
                  memperbarui isi Gedung 3D secara otomatis.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Impor Teks Halaman dari DKV X Studio
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
                        Target Gedung
                      </label>
                      <select
                        value={importTarget}
                        onChange={(e) => setImportTarget(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                      >
                        <option value="NEW">+ Buat Gedung Materi Baru Otomatis</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            Perbarui {m.kodeGedung} ({m.namaGedung})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
                        Referensi Halaman Sumber
                      </label>
                      <input
                        type="text"
                        value={importSourceRef}
                        onChange={(e) => setImportSourceRef(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
                      Tempel Salinan Materi Website
                    </label>
                    <textarea
                      rows={7}
                      value={importRawText}
                      onChange={(e) => setImportRawText(e.target.value)}
                      placeholder="Tempel judul bab, subbab, dan ringkasan materi di sini..."
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleProcessTextImport}
                      className="btn-blox px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-display font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> Ekstrak & Verifikasi ke Gedung 3D
                    </button>
                    <button
                      disabled={isFetchingUrl}
                      onClick={handleServerUrlSync}
                      className="btn-blox px-3.5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isFetchingUrl ? 'Mengambil...' : 'Sinkronisasi Langsung URL'}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Status Verifikasi Seluruh Materi ({materials.length} Modul)
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll pr-1">
                    {materials.map((m) => {
                      const ok =
                        m.statusVerifikasi === 'TERVERIFIKASI_SUMBER' ||
                        m.statusVerifikasi === 'IMPOR_GURU';
                      return (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                            ok
                              ? 'border-emerald-200 bg-emerald-50/60'
                              : 'border-amber-200 bg-amber-50/60'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">
                              {m.kodeGedung} · {m.bab}
                            </div>
                            <div className="text-slate-600">{m.judul}</div>
                          </div>
                          <span
                            className={`text-[11px] font-extrabold shrink-0 ${
                              ok ? 'text-emerald-800' : 'text-amber-800'
                            }`}
                          >
                            {ok ? 'TERVERIFIKASI' : 'PERLU VERIFIKASI'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                    <button
                      onClick={handleExportJson}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Cadangkan Paket Materi & Soal (JSON)
                    </button>
                    <label className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Muat Berkas JSON Guru
                      <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: APLIKASI & GEDUNG */}
          {tab === 'app' && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="font-display font-bold text-base text-slate-900">
                  Identitas Pembelajaran & Arena
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 mb-1">
                      Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      value={cfgSubject}
                      onChange={(e) => setCfgSubject(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 mb-1">
                      Nama Kelas
                    </label>
                    <input
                      type="text"
                      value={cfgClass}
                      onChange={(e) => setCfgClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 mb-1">
                      Judul Arena
                    </label>
                    <input
                      type="text"
                      value={cfgArena}
                      onChange={(e) => setCfgArena(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    onUpdateConfig({
                      ...appConfig,
                      subjectName: cfgSubject.trim() || appConfig.subjectName,
                      className: cfgClass.trim() || appConfig.className,
                      arenaTitle: cfgArena.trim() || appConfig.arenaTitle,
                    });
                    onToast('Identitas aplikasi berhasil diperbarui!', 'success');
                  }}
                  className="btn-blox px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
                >
                  Simpan Identitas Aplikasi
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Pengaturan Gedung 3D ({materials.length} Gedung)
                  </h3>
                  <button
                    onClick={() => {
                      const idx = materials.length;
                      const added: MaterialModule = {
                        id: `MAT-ADD-${Date.now()}`,
                        kodeGedung: `GDG-0${idx + 1}`,
                        namaGedung: `Gedung Materi Tambahan ${idx + 1}`,
                        ikon: 'shapes',
                        warna: '#06B6D4',
                        posX: (idx % 2 === 0 ? -1 : 1) * 22,
                        posZ: -6 + Math.floor(idx / 2) * 18,
                        bab: `Bab ${idx + 1} – Tambahan Guru`,
                        subbab: `Subbab ${idx + 1}.1`,
                        judul: `Materi DKV Tambahan ${idx + 1}`,
                        ringkasan: 'Silakan isi ringkasan materi berdasarkan kurikulum DKV.',
                        konsepPenting: ['Konsep utama materi'],
                        istilahPenting: [{ istilah: 'Istilah Utama', definisi: 'Definisi sumber' }],
                        contoh: ['Contoh penerapan desain'],
                        referensiSumber: appConfig.sourceUrl,
                        statusVerifikasi: 'PERLU_VERIFIKASI_GURU',
                        isCustom: true,
                      };
                      onUpdateMaterials([...materials, added]);
                      onToast('Gedung baru berhasil ditambahkan ke Kota 3D!', 'success');
                    }}
                    className="btn-blox px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Gedung Baru
                  </button>
                </div>

                <div className="space-y-2">
                  {materials.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2"
                    >
                      <span className="font-extrabold text-xs text-slate-600 w-16">
                        {m.kodeGedung}
                      </span>
                      <input
                        type="text"
                        value={m.namaGedung}
                        onChange={(e) => {
                          const next = materials.map((item, i) =>
                            i === idx ? { ...item, namaGedung: e.target.value } : item
                          );
                          onUpdateMaterials(next);
                        }}
                        className="flex-1 min-w-[180px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                      />
                      <input
                        type="color"
                        value={m.warna}
                        onChange={(e) => {
                          const next = materials.map((item, i) =>
                            i === idx ? { ...item, warna: e.target.value } : item
                          );
                          onUpdateMaterials(next);
                        }}
                        className="w-10 h-8 rounded cursor-pointer"
                      />
                      {materials.length > 1 && (
                        <button
                          onClick={() => {
                            onUpdateMaterials(materials.filter((_, i) => i !== idx));
                            onToast('Gedung dihapus.', 'info');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: MATERI & SUBBAB */}
          {tab === 'materi' && (
            <div className="space-y-3">
              {materials.map((m, idx) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-blue-700">
                      {m.kodeGedung} — {m.namaGedung}
                    </span>
                    <select
                      value={m.statusVerifikasi}
                      onChange={(e) => {
                        const next = materials.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                statusVerifikasi: e.target.value as VerificationStatus,
                              }
                            : item
                        );
                        onUpdateMaterials(next);
                      }}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-extrabold"
                    >
                      <option value="PERLU_VERIFIKASI_GURU">PERLU VERIFIKASI GURU</option>
                      <option value="IMPOR_GURU">TERVERIFIKASI (IMPOR GURU)</option>
                      <option value="TERVERIFIKASI_SUMBER">TERVERIFIKASI SUMBER WEBSITE</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={m.bab}
                      onChange={(e) => {
                        const next = materials.map((item, i) =>
                          i === idx ? { ...item, bab: e.target.value } : item
                        );
                        onUpdateMaterials(next);
                      }}
                      placeholder="Nama Bab"
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={m.subbab}
                      onChange={(e) => {
                        const next = materials.map((item, i) =>
                          i === idx ? { ...item, subbab: e.target.value } : item
                        );
                        onUpdateMaterials(next);
                      }}
                      placeholder="Nama Subbab"
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={m.referensiSumber}
                      onChange={(e) => {
                        const next = materials.map((item, i) =>
                          i === idx ? { ...item, referensiSumber: e.target.value } : item
                        );
                        onUpdateMaterials(next);
                      }}
                      placeholder="Referensi Sumber"
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={m.ringkasan}
                    onChange={(e) => {
                      const next = materials.map((item, i) =>
                        i === idx ? { ...item, ringkasan: e.target.value } : item
                      );
                      onUpdateMaterials(next);
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: BANK SOAL */}
          {tab === 'soal' && (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2.5">
                <h3 className="font-display font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" /> Tambah Soal Evaluasi Baru
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newQBuilding}
                    onChange={(e) => setNewQBuilding(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.kodeGedung}>
                        {m.kodeGedung} – {m.bab}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newQDiff}
                    onChange={(e) => setNewQDiff(e.target.value as DifficultyLevel)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                  >
                    <option value="Mudah">Tingkat: Mudah</option>
                    <option value="Sedang">Tingkat: Sedang</option>
                    <option value="Sulit">Tingkat: Sulit</option>
                  </select>
                  <select
                    value={newQKey}
                    onChange={(e) => setNewQKey(e.target.value as 'A' | 'B' | 'C' | 'D')}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                  >
                    <option value="A">Kunci Jawaban: A</option>
                    <option value="B">Kunci Jawaban: B</option>
                    <option value="C">Kunci Jawaban: C</option>
                    <option value="D">Kunci Jawaban: D</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="Tulis pertanyaan pilihan ganda berdasarkan materi..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newQA}
                    onChange={(e) => setNewQA(e.target.value)}
                    placeholder="Pilihan A"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={newQB}
                    onChange={(e) => setNewQB(e.target.value)}
                    placeholder="Pilihan B"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={newQC}
                    onChange={(e) => setNewQC(e.target.value)}
                    placeholder="Pilihan C"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={newQD}
                    onChange={(e) => setNewQD(e.target.value)}
                    placeholder="Pilihan D"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newQExp}
                    onChange={(e) => setNewQExp(e.target.value)}
                    placeholder="Pembahasan alasan jawaban benar..."
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={newQRef}
                    onChange={(e) => setNewQRef(e.target.value)}
                    placeholder="Referensi bab & submateri sumber"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
                <button
                  onClick={handleAddQuestion}
                  className="btn-blox px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                >
                  Simpan ke Bank Soal Utama
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Daftar Bank Soal ({questions.length} Soal)
                </h3>
                {questions.map((q, idx) => (
                  <div
                    key={q.idSoal}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 font-bold">
                        <span className="text-slate-900">
                          #{idx + 1} · {q.kodeGedung}
                        </span>
                        <span className="text-blue-700">{q.tingkatKesulitan}</span>
                        <span className="text-purple-700">{q.kategoriBank || 'UTAMA'}</span>
                        <span
                          className={
                            q.statusVerifikasi === 'PERLU_VERIFIKASI_GURU'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }
                        >
                          {q.statusVerifikasi}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onUpdateQuestions(questions.filter((_, i) => i !== idx));
                          onToast('Soal dihapus dari bank soal.', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{q.pertanyaan}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px] text-slate-700">
                      <div>
                        <strong>A.</strong> {q.pilihanA}
                      </div>
                      <div>
                        <strong>B.</strong> {q.pilihanB}
                      </div>
                      <div>
                        <strong>C.</strong> {q.pilihanC}
                      </div>
                      <div>
                        <strong>D.</strong> {q.pilihanD}
                      </div>
                    </div>
                    <div className="text-[11px] text-emerald-800 font-bold">
                      Kunci: {q.kunciJawaban} · Pembahasan: {q.pembahasan}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 5: AI GENERATOR */}
          {tab === 'ai' && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-base text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI Generator Soal (Bersumber Materi Terverifikasi)
                </h3>
                <span className="text-xs font-extrabold text-purple-900">
                  Bank Soal Tambahan AI: {aiQuestionsCount} Soal (Terpisah dari Bank Utama)
                </span>
              </div>
              <p className="text-xs text-purple-900">
                Soal yang dihasilkan disimpan terpisah pada kategori{' '}
                <strong>TAMBAHAN_AI</strong> dan tidak mengubah Bank Soal Utama. Pembuatan soal
                dijalankan secara aman melalui layanan server aplikasi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Jumlah Soal</label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold"
                  >
                    <option value={3}>3 Soal</option>
                    <option value={5}>5 Soal</option>
                    <option value={8}>8 Soal</option>
                    <option value={10}>10 Soal</option>
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Mode Penyimpanan
                  </label>
                  <select
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value as 'append' | 'replace')}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold"
                  >
                    <option value="append">1. Tambahkan soal baru</option>
                    <option value="replace">2. Ganti soal tambahan AI</option>
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Pilih Bab / Gedung
                  </label>
                  <select
                    value={aiBuilding}
                    onChange={(e) => setAiBuilding(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.kodeGedung}>
                        {m.bab} ({m.statusVerifikasi})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Tingkat & Jenis
                  </label>
                  <select
                    value={aiDiff}
                    onChange={(e) => setAiDiff(e.target.value as DifficultyLevel)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold"
                  >
                    <option value="Mudah">Mudah · Pengertian Konsep</option>
                    <option value="Sedang">Sedang · Penerapan Prinsip Desain</option>
                    <option value="Sulit">Sulit · Analisis Studi Kasus</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <button
                  disabled={isGeneratingAi}
                  onClick={handleRunAiGenerator}
                  className="btn-blox px-4 py-2.5 rounded-xl bg-purple-600 text-white font-display font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isGeneratingAi
                      ? 'Sedang Membuat Soal...'
                      : 'Generate Soal dari Materi Terverifikasi'}
                  </span>
                </button>
              </div>

              {aiFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border ${
                    aiFeedback.isError
                      ? 'bg-rose-100 border-rose-300 text-rose-900'
                      : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  }`}
                >
                  {aiFeedback.text}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PENGATURAN KUIS */}
          {tab === 'kuis' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 max-w-2xl">
              <h3 className="font-display font-bold text-base text-slate-900">
                Pengaturan Parameter Kuis
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Durasi per Soal (Detik)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={qDuration}
                    onChange={(e) => setQDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Jumlah Soal per Sesi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={qPerSession}
                    onChange={(e) => setQPerSession(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Poin Jawaban Benar
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={qPoints}
                    onChange={(e) => setQPoints(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Koin Jawaban Benar
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={qCoins}
                    onChange={(e) => setQCoins(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  onUpdateConfig({
                    ...appConfig,
                    quizDuration: Math.max(10, qDuration || 30),
                    questionsPerSession: Math.max(1, qPerSession || 6),
                    pointsPerCorrect: Math.max(10, qPoints || 100),
                    coinsPerCorrect: Math.max(1, qCoins || 25),
                  });
                  onToast('Pengaturan kuis berhasil disimpan!', 'success');
                }}
                className="btn-blox px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
              >
                Simpan Pengaturan Kuis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
