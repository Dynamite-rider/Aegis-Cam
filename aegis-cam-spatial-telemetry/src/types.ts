export interface TelemetryEvent {
  id: string;
  timestamp: string;
  location: string; // Hardcoded to "Magadi Main Road, Byadrahalli"
  luxValue: number;
  frames: string[]; // Base64 images
  status: 'MONITORING' | 'HAZARD_DETECTED' | 'ESCALATED';
}

export interface CivicReport {
  eventId: string;
  generatedText: string;
  ircCitation: string;
  authority: string; // e.g., "BBMP Rajarajeshwari Nagar Zone"
}

export interface HistoricalEvent {
  id: string;
  timestamp: string;
  location: string;
  luxValue: number;
  ircCitation: string;
  authority: string;
  status: 'RESOLVED' | 'ESCALATED' | 'REVIEW' | 'INVESTIGATING';
  lat?: number;
  lng?: number;
}
