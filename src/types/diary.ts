export type MoodType = 
  | 'ecstatic'   // 🌟 欣喜
  | 'happy'      // 😊 開心
  | 'peaceful'   // 😌 平靜
  | 'neutral'    // 😐 平淡
  | 'tired'      // 🥱 疲累
  | 'sad'        // 🌧️ 沮喪
  | 'anxious';   // ⚡ 焦慮

export interface MoodMeta {
  type: MoodType;
  label: string;
  emoji: string;
  color: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'storm' | 'snow' | 'foggy';

export interface WeatherMeta {
  type: WeatherType;
  label: string;
  emoji: string;
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mood: MoodType;
  weather?: WeatherType;
  tags: string[];
  images?: string[]; // base64 / URLs
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecuritySettings {
  isPasscodeEnabled: boolean;
  passcodeHash?: string; // SHA-256 hash or encrypted token
  passcodeSalt?: string;
  securityHint?: string;
  autoLockMinutes: number; // 0 = immediately, 1, 5, 15, -1 = never
  blurWhenInactive: boolean;
}

export interface CloudBackupItem {
  id: string;
  timestamp: string;
  title: string;
  entryCount: number;
  isEncrypted: boolean;
  sizeBytes: number;
  device?: string;
}

export interface BackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  entryCount: number;
  entries: DiaryEntry[];
  settings?: {
    tags: string[];
  };
}

export interface EncryptedBackupContainer {
  format: 'mindful-diary-encrypted';
  version: number;
  salt: string; // base64
  iv: string;   // base64
  ciphertext: string; // base64
  exportedAt: string;
  entryCount: number;
}
