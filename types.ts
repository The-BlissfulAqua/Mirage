export enum Feature {
  AdversarialSimulator = "Adversarial Simulator",
  WhisperNetwork = "Whisper Network",
  SkySecure = "Sky Secure",
}

export type ThreatLevel = 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'SEVERE';

export interface LogEntry {
  id: number;
  time: string;
  type: string;
  level: ThreatLevel;
  source: string;
}
