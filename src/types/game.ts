export type VerificationStatus =
  | 'TERVERIFIKASI_SUMBER'
  | 'IMPOR_GURU'
  | 'PERLU_VERIFIKASI_GURU';

export type DifficultyLevel = 'Mudah' | 'Sedang' | 'Sulit';
export type QuizMode = 'individu' | 'berkelompok' | 'serentak';
export type QuestionBankCategory = 'UTAMA' | 'TAMBAHAN_AI';

export interface AppConfig {
  appName: string;
  subjectName: string;
  className: string;
  arenaTitle: string;
  sourceUrl: string;
  quizDuration: number;
  questionsPerSession: number;
  pointsPerCorrect: number;
  coinsPerCorrect: number;
  defaultDifficulty: 'ALL' | DifficultyLevel;
  defaultQuizMode: QuizMode;
}

export interface TermDefinition {
  istilah: string;
  definisi: string;
}

export interface MaterialModule {
  id: string;
  kodeGedung: string;
  namaGedung: string;
  ikon: string;
  warna: string;
  posX: number;
  posZ: number;
  bab: string;
  subbab: string;
  judul: string;
  ringkasan: string;
  konsepPenting: string[];
  istilahPenting: TermDefinition[];
  contoh: string[];
  referensiSumber: string;
  statusVerifikasi: VerificationStatus;
  isCustom?: boolean;
}

export interface QuizQuestion {
  idSoal: string;
  nomorSoal: number;
  kodeGedung: string;
  bab: string;
  subbab: string;
  materi: string;
  submateri: string;
  tingkatKesulitan: DifficultyLevel;
  pertanyaan: string;
  pilihanA: string;
  pilihanB: string;
  pilihanC: string;
  pilihanD: string;
  kunciJawaban: 'A' | 'B' | 'C' | 'D';
  pembahasan: string;
  referensiSumber: string;
  statusVerifikasi: VerificationStatus;
  kategoriBank: QuestionBankCategory;
}

export interface ShuffledOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

export interface PreparedQuizQuestion extends QuizQuestion {
  shuffledOptions: ShuffledOption[];
  shuffledCorrectIndex: number;
  shuffledCorrectLabel: 'A' | 'B' | 'C' | 'D';
}

export interface AvatarPreset {
  id: string;
  name: string;
  head: string;
  torso: string;
  legs: string;
  hat: 'crown' | 'cat' | 'star' | 'knight' | 'wizard' | 'none';
  desc: string;
}

export interface PlayerState {
  id: 'P1' | 'P2' | 'P3' | 'P4';
  name: string;
  avatarId: string;
  active: boolean;
  equippedItem: string | null;
  x: number;
  y: number;
  z: number;
  vy: number;
  rotY: number;
  walkPhase: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  desc: string;
}

export interface ActivityLog {
  waktu: string;
  kelas: string;
  namaSiswa: string;
  idPemain: string;
  kodeGedung: string;
  bab: string;
  subbab: string;
  materi: string;
  submateri: string;
  nomorSoal: number;
  pertanyaan: string;
  jawabanSiswa: string;
  kunciJawaban: string;
  status: 'Benar' | 'Salah';
  poin: number;
  skorTotal: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}
