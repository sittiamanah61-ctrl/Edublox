import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Clock,
  Crown,
  Lock,
  Play,
  Plus,
  RotateCw,
  Trophy,
  X,
} from 'lucide-react';
import type {
  ActivityLog,
  AppConfig,
  DifficultyLevel,
  MaterialModule,
  PlayerState,
  PreparedQuizQuestion,
  QuizMode,
  QuizQuestion,
} from '../types/game';
import { SoundFX } from '../utils/sound';

interface QuizModalProps {
  appConfig: AppConfig;
  materials: MaterialModule[];
  questions: QuizQuestion[];
  players: PlayerState[];
  answeredIds: Set<string>;
  preselectBuilding: string;
  onClose: () => void;
  onOpenTeacher: () => void;
  onOpenRecap: () => void;
  onRecordAnswer: (
    entry: Omit<ActivityLog, 'waktu' | 'kelas'>,
    questionId: string,
    earnedCoins: number
  ) => void;
  onToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onQuizActiveChange: (active: boolean) => void;
  registerShortcutHandler: (fn: ((code: string) => void) | null) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizModal({
  appConfig,
  materials,
  questions,
  players,
  answeredIds,
  preselectBuilding,
  onClose,
  onOpenTeacher,
  onOpenRecap,
  onRecordAnswer,
  onToast,
  onQuizActiveChange,
  registerShortcutHandler,
}: QuizModalProps) {
  const [step, setStep] = useState<'setup' | 'play' | 'summary'>('setup');
  const [mode, setMode] = useState<QuizMode>(appConfig.defaultQuizMode || 'individu');
  const [buildingFilter, setBuildingFilter] = useState<string>(preselectBuilding || 'ALL');
  const [subbabFilter, setSubbabFilter] = useState<string>('ALL');
  const [diffFilter, setDiffFilter] = useState<'ALL' | DifficultyLevel>(
    appConfig.defaultDifficulty || 'ALL'
  );
  const [unansweredOnly, setUnansweredOnly] = useState<boolean>(false);

  const [sessionQuestions, setSessionQuestions] = useState<PreparedQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(appConfig.quizDuration || 30);
  const [answeredCurrent, setAnsweredCurrent] = useState(false);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [correctCounts, setCorrectCounts] = useState<number[]>([0, 0, 0, 0]);
  const [playerAnswers, setPlayerAnswers] = useState<(number | null)[]>([null, null, null, null]);
  const [resultHeadline, setResultHeadline] = useState('');

  const uniqueSubbabs = useMemo(() => {
    const mats =
      buildingFilter === 'ALL'
        ? materials
        : materials.filter((m) => m.kodeGedung === buildingFilter);
    const qs =
      buildingFilter === 'ALL'
        ? questions
        : questions.filter((q) => q.kodeGedung === buildingFilter);
    return [...new Set([...mats.map((m) => m.subbab), ...qs.map((q) => q.subbab)])];
  }, [buildingFilter, materials, questions]);

  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      if (buildingFilter !== 'ALL' && q.kodeGedung !== buildingFilter) return false;
      if (subbabFilter !== 'ALL' && q.subbab !== subbabFilter) return false;
      if (diffFilter !== 'ALL' && q.tingkatKesulitan !== diffFilter) return false;
      if (unansweredOnly && answeredIds.has(q.idSoal)) return false;
      return true;
    });
  }, [questions, buildingFilter, subbabFilter, diffFilter, unansweredOnly, answeredIds]);

  const currentQuestion = sessionQuestions[currentIndex] || null;

  const finalizeQuestion = useCallback(
    (
      isTimeout: boolean,
      answersSnapshot: (number | null)[],
      curQ: PreparedQuizQuestion
    ) => {
      setAnsweredCurrent(true);
      onQuizActiveChange(false);

      const pts = Number(appConfig.pointsPerCorrect) || 100;
      const coinsReward = Number(appConfig.coinsPerCorrect) || 25;

      if (mode !== 'serentak') {
        const chosenIdx = answersSnapshot[0];
        const isCorrect =
          chosenIdx !== null && Boolean(curQ.shuffledOptions[chosenIdx]?.isCorrect);

        const nextScore = scores[0] + (isCorrect ? pts : 0);
        if (isCorrect) {
          setScores((prev) => [prev[0] + pts, prev[1], prev[2], prev[3]]);
          setCorrectCounts((prev) => [prev[0] + 1, prev[1], prev[2], prev[3]]);
          SoundFX.correct();
          window.setTimeout(() => SoundFX.coin(), 180);
          setResultHeadline(`Benar! +${pts} Poin & +${coinsReward} Koin!`);
        } else {
          SoundFX.wrong();
          setResultHeadline(
            isTimeout ? 'Waktu Habis! Jawaban Belum Tepat' : 'Kurang Tepat! Pelajari Pembahasannya'
          );
        }

        const studentLabel =
          mode === 'berkelompok'
            ? `Kelompok (${players
                .filter((p) => p.active)
                .map((p) => p.name)
                .join(', ')})`
            : players[0].name;

        onRecordAnswer(
          {
            namaSiswa: studentLabel,
            idPemain: mode === 'berkelompok' ? 'KELOMPOK' : 'P1',
            kodeGedung: curQ.kodeGedung,
            bab: curQ.bab,
            subbab: curQ.subbab,
            materi: curQ.materi,
            submateri: curQ.submateri,
            nomorSoal: curQ.nomorSoal,
            pertanyaan: curQ.pertanyaan,
            jawabanSiswa:
              chosenIdx !== null
                ? `${curQ.shuffledOptions[chosenIdx].label}. ${curQ.shuffledOptions[chosenIdx].text}`
                : '(Tidak Menjawab)',
            kunciJawaban: `${curQ.shuffledCorrectLabel}. ${
              curQ.shuffledOptions[curQ.shuffledCorrectIndex].text
            }`,
            status: isCorrect ? 'Benar' : 'Salah',
            poin: isCorrect ? pts : 0,
            skorTotal: nextScore,
          },
          curQ.idSoal,
          isCorrect ? coinsReward : 0
        );
      } else {
        let anyCorrect = false;
        const nextScores = [...scores];
        const nextCorrect = [...correctCounts];

        for (let pIdx = 0; pIdx < 4; pIdx++) {
          const chosenIdx = answersSnapshot[pIdx];
          const isCorrect =
            chosenIdx !== null && Boolean(curQ.shuffledOptions[chosenIdx]?.isCorrect);
          if (isCorrect) {
            nextScores[pIdx] += pts;
            nextCorrect[pIdx] += 1;
            anyCorrect = true;
          }
          const chosenText =
            chosenIdx !== null
              ? `${curQ.shuffledOptions[chosenIdx].label}. ${curQ.shuffledOptions[chosenIdx].text}`
              : 'Tidak Menjawab';

          if (players[pIdx].active || chosenIdx !== null) {
            onRecordAnswer(
              {
                namaSiswa: players[pIdx].name,
                idPemain: players[pIdx].id,
                kodeGedung: curQ.kodeGedung,
                bab: curQ.bab,
                subbab: curQ.subbab,
                materi: curQ.materi,
                submateri: curQ.submateri,
                nomorSoal: curQ.nomorSoal,
                pertanyaan: curQ.pertanyaan,
                jawabanSiswa: chosenText,
                kunciJawaban: `${curQ.shuffledCorrectLabel}. ${
                  curQ.shuffledOptions[curQ.shuffledCorrectIndex].text
                }`,
                status: isCorrect ? 'Benar' : 'Salah',
                poin: isCorrect ? pts : 0,
                skorTotal: nextScores[pIdx],
              },
              curQ.idSoal,
              0
            );
          }
        }

        if (anyCorrect) {
          onRecordAnswer(
            {
              namaSiswa: players[0].name,
              idPemain: 'BONUS-COOP',
              kodeGedung: curQ.kodeGedung,
              bab: curQ.bab,
              subbab: curQ.subbab,
              materi: curQ.materi,
              submateri: curQ.submateri,
              nomorSoal: curQ.nomorSoal,
              pertanyaan: curQ.pertanyaan,
              jawabanSiswa: 'Bonus Koin Tim',
              kunciJawaban: `${curQ.shuffledCorrectLabel}`,
              status: 'Benar',
              poin: 0,
              skorTotal: nextScores[0],
            },
            curQ.idSoal,
            coinsReward
          );
          SoundFX.correct();
        } else {
          SoundFX.wrong();
        }
        setScores(nextScores);
        setCorrectCounts(nextCorrect);
        setResultHeadline('Hasil Pemeriksaan Jawaban Serentak (P1–P4)');
      }
    },
    [appConfig.coinsPerCorrect, appConfig.pointsPerCorrect, correctCounts, mode, onQuizActiveChange, onRecordAnswer, players, scores]
  );

  // Countdown timer effect
  useEffect(() => {
    if (step !== 'play' || answeredCurrent || !currentQuestion) return;
    const id = window.setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(id);
          finalizeQuestion(true, playerAnswers, currentQuestion);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step, answeredCurrent, currentQuestion, playerAnswers, finalizeQuestion]);

  const submitSingleAnswer = useCallback(
    (optIdx: number) => {
      if (answeredCurrent || !currentQuestion) return;
      const nextAns = [optIdx, null, null, null];
      setPlayerAnswers(nextAns);
      finalizeQuestion(false, nextAns, currentQuestion);
    },
    [answeredCurrent, currentQuestion, finalizeQuestion]
  );

  const submitSplitAnswer = useCallback(
    (pIdx: number, optIdx: number) => {
      if (answeredCurrent || !currentQuestion || playerAnswers[pIdx] !== null) return;
      SoundFX.select();
      const nextAns = [...playerAnswers];
      nextAns[pIdx] = optIdx;
      setPlayerAnswers(nextAns);

      const activeIndices = players.map((p, i) => (p.active ? i : -1)).filter((i) => i !== -1);
      const targets = activeIndices.length > 0 ? activeIndices : [0, 1, 2, 3];
      if (targets.every((i) => nextAns[i] !== null)) {
        finalizeQuestion(false, nextAns, currentQuestion);
      }
    },
    [answeredCurrent, currentQuestion, finalizeQuestion, playerAnswers, players]
  );

  // Register keyboard shortcuts for quiz play
  useEffect(() => {
    if (step !== 'play' || answeredCurrent) {
      registerShortcutHandler(null);
      return;
    }
    registerShortcutHandler((code: string) => {
      if (mode !== 'serentak') {
        const map: Record<string, number> = {
          Digit1: 0,
          KeyA: 0,
          Digit2: 1,
          KeyB: 1,
          Digit3: 2,
          KeyC: 2,
          Digit4: 3,
          KeyD: 3,
        };
        if (code in map) submitSingleAnswer(map[code]);
      } else {
        const p1: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
        const p2: Record<string, number> = { Digit7: 0, Digit8: 1, Digit9: 2, Digit0: 3 };
        const p3: Record<string, number> = { KeyZ: 0, KeyX: 1, KeyC: 2, KeyV: 3 };
        const p4: Record<string, number> = { KeyN: 0, KeyM: 1, Comma: 2, Period: 3 };
        if (code in p1) submitSplitAnswer(0, p1[code]);
        if (code in p2) submitSplitAnswer(1, p2[code]);
        if (code in p3) submitSplitAnswer(2, p3[code]);
        if (code in p4) submitSplitAnswer(3, p4[code]);
      }
    });
    return () => registerShortcutHandler(null);
  }, [step, answeredCurrent, mode, submitSingleAnswer, submitSplitAnswer, registerShortcutHandler]);

  const launchQuiz = () => {
    if (filteredPool.length === 0) {
      onToast(
        'Belum ada soal yang sesuai filter! Tambahkan soal di Panel Guru atau ubah filter.',
        'warning'
      );
      return;
    }

    const maxCount = Math.min(filteredPool.length, Number(appConfig.questionsPerSession) || 6);
    const prepared: PreparedQuizQuestion[] = shuffleArray(filteredPool)
      .slice(0, maxCount)
      .map((q) => {
        const rawOpts: { origKey: 'A' | 'B' | 'C' | 'D'; text: string }[] = [
          { origKey: 'A', text: q.pilihanA },
          { origKey: 'B', text: q.pilihanB },
          { origKey: 'C', text: q.pilihanC },
          { origKey: 'D', text: q.pilihanD },
        ];
        const shuffled = shuffleArray(rawOpts);
        const labels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        const correctIdx = shuffled.findIndex((o) => o.origKey === q.kunciJawaban);
        const safeCorrectIdx = correctIdx >= 0 ? correctIdx : 0;
        return {
          ...q,
          shuffledOptions: shuffled.map((o, idx) => ({
            label: labels[idx],
            text: o.text,
            isCorrect: o.origKey === q.kunciJawaban,
          })),
          shuffledCorrectIndex: safeCorrectIdx,
          shuffledCorrectLabel: labels[safeCorrectIdx],
        };
      });

    setSessionQuestions(prepared);
    setCurrentIndex(0);
    setTimer(Number(appConfig.quizDuration) || 30);
    setAnsweredCurrent(false);
    setScores([0, 0, 0, 0]);
    setCorrectCounts([0, 0, 0, 0]);
    setPlayerAnswers([null, null, null, null]);
    setStep('play');
    onQuizActiveChange(true);
    SoundFX.select();
  };

  const handleNextQuestion = () => {
    SoundFX.select();
    if (currentIndex + 1 < sessionQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setTimer(Number(appConfig.quizDuration) || 30);
      setAnsweredCurrent(false);
      setPlayerAnswers([null, null, null, null]);
      onQuizActiveChange(true);
    } else {
      onQuizActiveChange(false);
      setStep('summary');
    }
  };

  const handleClose = () => {
    onQuizActiveChange(false);
    registerShortcutHandler(null);
    onClose();
  };

  const keyHints = [
    ['1', '2', '3', '4'],
    ['7', '8', '9', '0'],
    ['Z', 'X', 'C', 'V'],
    ['N', 'M', ',', '.'],
  ];
  const badgeColors = ['bg-blue-600', 'bg-pink-600', 'bg-emerald-600', 'bg-amber-500'];
  const panelBorders = ['border-blue-400 bg-blue-50/70', 'border-pink-400 bg-pink-50/70', 'border-emerald-400 bg-emerald-50/70', 'border-amber-400 bg-amber-50/70'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75">
      <div className="surface-panel rounded-3xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl border-4 border-white animate-pop overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600 text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-yellow-300" />
            <div>
              <h2 className="font-display font-bold text-base sm:text-xl leading-tight">
                Arena Kuis Kreativitas DKV
              </h2>
              <p className="text-[11px] text-pink-100">
                Mode Individu, Berkelompok & Multiplayer Lokal 4-Way Split Screen
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: SETUP */}
        {step === 'setup' && (
          <div className="p-4 sm:p-6 overflow-y-auto custom-scroll space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5">
                <label className="block text-xs font-extrabold text-purple-900 uppercase mb-1.5">
                  1. Mode Kuis
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as QuizMode)}
                  className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                >
                  <option value="individu">1. Kuis Individu (1 Pemain)</option>
                  <option value="berkelompok">2. Kuis Berkelompok (Kooperatif)</option>
                  <option value="serentak">3. Kuis Serentak (4-Way Split Screen)</option>
                </select>
                <p className="text-[11px] text-purple-800 mt-1.5">
                  Mode Serentak menampilkan 4 panel jawaban (P1–P4) sekaligus pada satu layar lokal.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-extrabold text-blue-900 uppercase">
                  2. Filter Materi & Bab
                </label>
                <select
                  value={buildingFilter}
                  onChange={(e) => {
                    setBuildingFilter(e.target.value);
                    setSubbabFilter('ALL');
                  }}
                  className="w-full rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="ALL">Semua Gedung & Bab ({materials.length} Gedung)</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.kodeGedung}>
                      {m.kodeGedung} – {m.namaGedung} ({m.bab})
                    </option>
                  ))}
                </select>
                <select
                  value={subbabFilter}
                  onChange={(e) => setSubbabFilter(e.target.value)}
                  className="w-full rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="ALL">Semua Subbab / Submateri</option>
                  {uniqueSubbabs.map((sb) => (
                    <option key={sb} value={sb}>
                      {sb}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-extrabold text-emerald-900 uppercase">
                  3. Tingkat Kesulitan & Riwayat
                </label>
                <select
                  value={diffFilter}
                  onChange={(e) => setDiffFilter(e.target.value as 'ALL' | DifficultyLevel)}
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="ALL">Semua Tingkat Kesulitan</option>
                  <option value="Mudah">Mudah (Konsep & Istilah)</option>
                  <option value="Sedang">Sedang (Penerapan Desain)</option>
                  <option value="Sulit">Sulit (Analisis & Studi Kasus)</option>
                </select>
                <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={unansweredOnly}
                    onChange={(e) => setUnansweredOnly(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Hanya soal yang belum pernah dikerjakan</span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
              <span>
                Soal tersedia sesuai filter: {filteredPool.length} soal (Total Bank Soal:{' '}
                {questions.length})
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    handleClose();
                    onOpenTeacher();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Soal di Panel Guru
                </button>
                <button
                  onClick={launchQuiz}
                  className="btn-blox px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" /> Mulai Sesi Kuis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ARENA BERMAIN */}
        {step === 'play' && currentQuestion && (
          <div className="flex-1 flex flex-col overflow-y-auto custom-scroll p-3 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 rounded-2xl p-2.5 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-extrabold">
                <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-display">
                  Soal {currentIndex + 1} / {sessionQuestions.length}
                </span>
                <span className="text-blue-800">{currentQuestion.tingkatKesulitan}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    currentQuestion.statusVerifikasi === 'PERLU_VERIFIKASI_GURU'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }
                >
                  {currentQuestion.statusVerifikasi === 'PERLU_VERIFIKASI_GURU'
                    ? 'Perlu Verifikasi Guru'
                    : 'Terverifikasi'}
                </span>
              </div>

              <div className="flex-1 min-w-[120px] max-w-xs bg-slate-300 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-pink-500 h-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }}
                />
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm font-extrabold tabular-nums">
                <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {timer}d
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900">
                  {mode === 'serentak'
                    ? `P1:${scores[0]} | P2:${scores[1]} | P3:${scores[2]} | P4:${scores[3]}`
                    : `Skor: ${scores[0]}`}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="text-[11px] font-extrabold text-blue-700 uppercase mb-1">
                {currentQuestion.bab} · {currentQuestion.subbab} · Ref:{' '}
                {currentQuestion.referensiSumber}
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
                {currentQuestion.pertanyaan}
              </h3>
            </div>

            {mode !== 'serentak' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQuestion.shuffledOptions.map((opt, idx) => {
                  const chosen = playerAnswers[0] === idx;
                  let cls = 'btn-blox bg-white hover:bg-blue-50 border-slate-200 text-slate-800';
                  if (answeredCurrent) {
                    if (opt.isCorrect) cls = 'bg-emerald-500 text-white border-emerald-700';
                    else if (chosen) cls = 'bg-rose-500 text-white border-rose-700 animate-shake';
                    else cls = 'bg-slate-100 text-slate-500 border-slate-200';
                  }
                  return (
                    <button
                      key={opt.label}
                      disabled={answeredCurrent}
                      onClick={() => submitSingleAnswer(idx)}
                      className={`text-left p-3.5 rounded-2xl border-2 flex items-start gap-3 transition cursor-pointer ${cls}`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-display font-bold flex items-center justify-center shrink-0">
                        {opt.label}
                      </span>
                      <span className="text-xs sm:text-sm font-bold pt-1">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((pIdx) => {
                  const p = players[pIdx];
                  const locked = playerAnswers[pIdx] !== null;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border-2 p-3 ${panelBorders[pIdx]}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg ${badgeColors[pIdx]} text-white font-display font-bold text-xs`}
                        >
                          {p.id}: {p.name}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700 inline-flex items-center gap-1 tabular-nums">
                          {locked ? (
                            <>
                              <Lock className="w-3 h-3 text-emerald-600" /> Terkunci
                            </>
                          ) : (
                            `Skor: ${scores[pIdx]}`
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {currentQuestion.shuffledOptions.map((opt, oIdx) => {
                          const isChosen = playerAnswers[pIdx] === oIdx;
                          let btnCls =
                            'bg-white border-slate-200 text-slate-800 hover:bg-slate-50';
                          if (answeredCurrent) {
                            if (opt.isCorrect)
                              btnCls = 'bg-emerald-500 border-emerald-700 text-white';
                            else if (isChosen) btnCls = 'bg-rose-500 border-rose-700 text-white';
                          } else if (isChosen) {
                            btnCls = 'bg-slate-800 border-slate-950 text-white';
                          }
                          return (
                            <button
                              key={opt.label}
                              disabled={answeredCurrent || locked}
                              onClick={() => submitSplitAnswer(pIdx, oIdx)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 cursor-pointer ${btnCls}`}
                            >
                              <span className="truncate">
                                <strong>{opt.label}.</strong> {opt.text}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-black/10 text-[10px] shrink-0 font-mono">
                                {keyHints[pIdx][oIdx]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {answeredCurrent && (
              <div className="rounded-2xl bg-sky-50 border border-sky-300 p-4 space-y-2 animate-pop">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-base text-sky-950">
                    {resultHeadline}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-extrabold">
                    Kunci: {currentQuestion.shuffledCorrectLabel}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {currentQuestion.pembahasan}
                </p>
                {mode === 'serentak' && (
                  <div className="pt-2 border-t border-sky-200 text-xs flex flex-wrap gap-3">
                    {players.map((p, i) => {
                      const chosen = playerAnswers[i];
                      const ok =
                        chosen !== null &&
                        Boolean(currentQuestion.shuffledOptions[chosen]?.isCorrect);
                      const label =
                        chosen !== null
                          ? currentQuestion.shuffledOptions[chosen].label
                          : 'Kosong';
                      return (
                        <span
                          key={p.id}
                          className={`font-bold ${ok ? 'text-emerald-700' : 'text-rose-700'}`}
                        >
                          {p.id} ({p.name}): {label} [{ok ? 'BENAR' : 'SALAH'}]
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    className="btn-blox px-5 py-2.5 rounded-xl bg-blue-600 text-white font-display font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      {currentIndex + 1 < sessionQuestions.length
                        ? 'Soal Berikutnya'
                        : 'Lihat Hasil Akhir'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: HASIL AKHIR */}
        {step === 'summary' && (
          <div className="p-5 sm:p-7 overflow-y-auto custom-scroll text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
              <Crown className="w-8 h-8" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">Sesi Kuis Selesai!</h3>
            <p className="text-sm text-slate-600">
              Hasil penilaian telah otomatis disimpan ke dalam Rekap Nilai Siswa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left">
              {players
                .map((p, idx) => ({
                  id: p.id,
                  name: p.name,
                  active: p.active || idx === 0,
                  score: scores[idx],
                  correct: correctCounts[idx],
                }))
                .filter((e) => (mode === 'serentak' ? e.active : e.id === 'P1'))
                .sort((a, b) => b.score - a.score)
                .map((e, rank) => (
                  <div
                    key={e.id}
                    className={`rounded-2xl border-2 p-4 shadow-sm ${
                      rank === 0 ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700">
                        Peringkat #{rank + 1}
                      </span>
                      <span className="font-display font-bold text-lg text-emerald-600 tabular-nums">
                        {e.score} Poin
                      </span>
                    </div>
                    <div className="font-display font-bold text-base text-slate-900 mt-2">
                      {e.id} · {e.name}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 tabular-nums">
                      Jawaban Benar: {e.correct} / {sessionQuestions.length}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={() => setStep('setup')}
                className="btn-blox px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-4 h-4" /> Main Kuis Lagi
              </button>
              <button
                onClick={() => {
                  handleClose();
                  onOpenRecap();
                }}
                className="btn-blox px-5 py-2.5 rounded-xl bg-pink-600 text-white font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" /> Lihat Rekap & Ekspor CSV
              </button>
              <button
                onClick={handleClose}
                className="btn-blox px-5 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer"
              >
                Kembali ke Kota 3D
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
