export type Weather = 'clear' | 'fog';
export type ActorType = 'adversary' | 'civilian';

export interface PointOfInterest {
    pos: [number, number];
}

export interface Sensor {
    id: string;
    type: 'camera' | 'acoustic';
    pos: [number, number]; // lat, lng
    range: number; // in meters
    base_p: number; // base probability of detection
    weather_penalty: { [key in Weather]?: number };
}

export interface Actor {
    id:string;
    type: ActorType;
    pos: [number, number];
    path: [number, number][];
    pathIndex: number;
    speed: number; // meters per tick
    gpsMode: 'on' | 'off';
}

export interface SensorEvent {
    timestamp: number;
    sensorId: string;
    actorId: string;
    confidence: number;
    actorPos: [number, number];
}

export interface Alert {
    id: string;
    timestamp: number;
    message: string;
    level: 'info' | 'warning' | 'critical';
    relatedEvents: SensorEvent[];
}

// --- Detection Logic and AI Patching ---

export type DetectionRuleType = 'high_confidence_sighting' | 'persistent_sighting' | 'group_sighting';

export interface DetectionRule {
    id: string;
    type: DetectionRuleType;
    params: { [key: string]: any };
}

export interface PatchSuggestion {
    rule: DetectionRule;
    explanation: string;
}

// --- Orchestrator and History ---

export interface Scenario {
    name: string;
    sensors: Sensor[];
    rules: DetectionRule[];
}

export interface IterationResult {
    iteration: number;
    verdict: 'DETECTED' | 'BYPASSED';
    patchSuggestion: PatchSuggestion | null;
    rulesInEffect: DetectionRule[];
    adversaryStrategy: string;
}

export interface ActionLog {
    timestamp: number;
    message: string;
    type: 'info' | 'red' | 'blue' | 'green' | 'warning' | 'critical';
    details?: string;
}