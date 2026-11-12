const memoryStore: Record<string, unknown> = {};

export const SafeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return Object.prototype.hasOwnProperty.call(memoryStore, key)
        ? (memoryStore[key] as T)
        : fallback;
    }
  },
  set<T>(key: string, value: T): void {
    memoryStore[key] = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Fallback to in-memory store when iframe blocks localStorage
    }
  },
  remove(key: string): void {
    delete memoryStore[key];
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

export const STORAGE_KEYS = {
  CONFIG: 'edublox_dkv_config_v2',
  MATERIALS: 'edublox_dkv_materials_v2',
  QUESTIONS: 'edublox_dkv_questions_v2',
  PLAYERS: 'edublox_dkv_players_v2',
  COINS: 'edublox_dkv_coins_v2',
  UNLOCKED_ITEMS: 'edublox_dkv_shop_v2',
  LOGS: 'edublox_dkv_logs_v2',
  ANSWERED_IDS: 'edublox_dkv_answered_ids_v2',
  WEBHOOK: 'edublox_dkv_sheets_webhook_v2',
} as const;
