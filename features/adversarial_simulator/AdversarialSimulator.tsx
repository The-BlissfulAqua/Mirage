import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapComponent from './MapComponent';
import { Actor, SensorEvent, Weather, DetectionRule, IterationResult, PatchSuggestion, PointOfInterest, ActionLog, Sensor } from './types';
import { SCENARIOS, POINTS_OF_INTEREST } from './mapData';
import { runDetectionLogic } from './detectionLogic';
import { PRNG } from '../../utils/prng';
import { generateAdversarialScenario, generateRulePatch, generatePostIncidentAnalysis } from '../../services/geminiService';

const TICK_RATE_MS = 1000;
const CIVILIAN_COUNT = 10;

const getRandomPoiName = (prng: PRNG, exclude: string[] = []): string => {
    const poiNames = Object.keys(POINTS_OF_INTEREST).filter(name => !exclude.includes(name));
    return poiNames[Math.floor(prng.random() * poiNames.length)];
};

const AdversarialSimulator: React.FC = () => {
    const [actors, setActors] = useState<Actor[]>([]);
    const [events, setEvents] = useState<SensorEvent[]>([]);
    const [simulationVerdict, setSimulationVerdict] = useState<'PENDING' | 'DETECTED' | 'BYPASSED' | null>(null);

    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [scenarioIndex, setScenarioIndex] = useState(0);
    const [activeRules, setActiveRules] = useState<DetectionRule[]>(SCENARIOS[0].rules);
    const [seed, setSeed] = useState<string>('42');
    const [actionLog, setActionLog] = useState<ActionLog[]>([]);
    const [postIncidentAnalysis, setPostIncidentAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    const prngRef = useRef<PRNG>(new PRNG(parseInt(seed, 10) || 42));
    const logContainerRef = useRef<HTMLDivElement>(null);
    
    const currentScenario = SCENARIOS[scenarioIndex];
    
    useEffect(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, [actionLog]);

    const logAction = useCallback((message: string, type: ActionLog['type'] = 'info', details?: string) => {
        setActionLog(prev => [...prev, { timestamp: Date.now(), message, type, details }]);
    }, []);

    const resetFullExperiment = useCallback(() => {
        setIsRunning(false);
        setActors([]);
        setEvents([]);
        // For a single run demo, we start with a weaker ruleset to guarantee a bypass
        const initialRules = currentScenario.rules.filter(r => r.type !== 'persistent_sighting');
        setActiveRules(initialRules);
        setSimulationVerdict(null);
        setActionLog([]);
        setPostIncidentAnalysis(null);
        setIsAnalyzing(false);
    }, [currentScenario]);

    const runSimulationPromise = useCallback((initialActors: Actor[], sensors: Sensor[], rules: DetectionRule[], prng: PRNG): Promise<'DETECTED' | 'BYPASSED'> => {
        return new Promise(resolve => {
            setActors(initialActors);
            setEvents([]);
            
            let currentActors = [...initialActors];
            let detectionState = {};
            
            const interval = setInterval(() => {
                currentActors = currentActors.map(actor => {
                    if (actor.pathIndex >= actor.path.length - 1) {
                         if (actor.type === 'civilian') {
                            const newPath = [actor.pos, POINTS_OF_INTEREST[getRandomPoiName(prng, [])].pos];
                            return { ...actor, path: newPath, pathIndex: 0 };
                         }
                         return actor;
                    }
                    const newPathIndex = actor.pathIndex + 1;
                    return { ...actor, pathIndex: newPathIndex, pos: actor.path[newPathIndex] };
                });
                setActors(currentActors);

                const adversary = currentActors.find(a => a.type === 'adversary');
                if (!adversary || adversary.pathIndex >= adversary.path.length - 1) {
                    clearInterval(interval);
                    resolve('BYPASSED');
                    return;
                }

                const { newAlerts, newEvents, updatedState } = runDetectionLogic(currentActors, sensors, 'clear', prng, rules, detectionState);
                detectionState = updatedState;

                if (newEvents.length > 0) setEvents(prev => [...prev, ...newEvents]);
                if (newAlerts.length > 0) {
                     newAlerts.forEach(alert => logAction(alert.message, alert.level));
                    if (newAlerts.some(a => a.level === 'critical')) {
                        clearInterval(interval);
                        resolve('DETECTED');
                        return;
                    }
                }
            }, TICK_RATE_MS);
        });
    }, [logAction]);

    const handleStartScenario = async () => {
        resetFullExperiment();
        setIsRunning(true);

        const masterSeed = parseInt(seed, 10) || Date.now();
        prngRef.current = new PRNG(masterSeed);
        logAction(`Starting Scenario ${scenarioIndex + 1}: "${currentScenario.name}"`, 'info', `Seed: ${masterSeed}`);

        // For demo, start with a weaker ruleset to ensure bypass
        const initialRules = currentScenario.rules.filter(r => r.type !== 'persistent_sighting' && r.type !== 'group_sighting');
        setActiveRules(initialRules);
        let currentRules = [...initialRules];

        const civilians: Actor[] = Array.from({ length: CIVILIAN_COUNT }, (_, i) => {
            const startPoi = getRandomPoiName(prngRef.current);
            const endPoi = getRandomPoiName(prngRef.current, [startPoi]);
            return {
                id: `civ-${i}`, type: 'civilian', pos: POINTS_OF_INTEREST[startPoi].pos,
                path: [POINTS_OF_INTEREST[startPoi].pos, POINTS_OF_INTEREST[endPoi].pos],
                pathIndex: 0, speed: 10, gpsMode: 'on'
            };
        });
        
        setSimulationVerdict('PENDING');

        logAction(`Red Team AI is generating a scenario...`, 'red');
        const scenario = await generateAdversarialScenario('Parking', 'Meadow', POINTS_OF_INTEREST, currentScenario.sensors, currentRules, 'clear', masterSeed);
        logAction('Red Team Plan:', 'red', `Strategy: ${scenario.strategy}`);
        
        const adversary: Actor = {
            id: `adv-1`, type: 'adversary', pos: scenario.path[0], path: scenario.path,
            pathIndex: 0, speed: 20, gpsMode: scenario.gpsMode,
        };

        logAction(`Simulation starting...`);
        const initialActors = [adversary, ...civilians];
        const verdict = await runSimulationPromise(initialActors, currentScenario.sensors, currentRules, prngRef.current);
        setSimulationVerdict(verdict);
        logAction(`Scenario Verdict: ${verdict}`, verdict === 'BYPASSED' ? 'red' : 'green', `Adversary was ${verdict.toLowerCase()}.`);

        if (verdict === 'BYPASSED') {
            logAction('Bypass detected. Blue Team AI is generating a patch...', 'blue');
            const generatedPatch = await generateRulePatch(scenario, currentRules, masterSeed);
            currentRules = [...currentRules.filter(r => r.id !== generatedPatch!.rule.id), generatedPatch!.rule];
            setActiveRules(currentRules);
            logAction('Blue Team Patch Applied:', 'blue', `Rule "${generatedPatch.rule.id}" added. ${generatedPatch.explanation}`);

            logAction('Generating post-incident analysis...', 'info');
            setIsAnalyzing(true);
            const analysis = await generatePostIncidentAnalysis(scenario, generatedPatch);
            setPostIncidentAnalysis(analysis);
            setIsAnalyzing(false);
            logAction('Analysis complete.', 'green');
        }

        setIsRunning(false);
        // Cycle to the next scenario for the next run
        setScenarioIndex(prev => (prev + 1) % SCENARIOS.length);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
            <div className="lg:col-span-3 h-full min-h-[500px]">
                <MapComponent actors={actors} events={events} sensors={currentScenario.sensors} />
            </div>
            <div className="lg:col-span-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col space-y-4">
                <Controls
                    isRunning={isRunning}
                    onStart={handleStartScenario}
                    onReset={resetFullExperiment}
                    seed={seed}
                    onSeedChange={setSeed}
                />
                <hr className="border-slate-700" />
                
                {postIncidentAnalysis && <AnalysisReport analysis={postIncidentAnalysis} isLoading={isAnalyzing} />}

                <div className="flex flex-col flex-grow min-h-0">
                  <h3 className="text-xl font-bold text-white mb-2">Action Log</h3>
                  <div ref={logContainerRef} className="flex-grow overflow-y-auto space-y-2 pr-2 bg-slate-900/50 rounded-md p-2 border border-slate-700">
                      {actionLog.map(log => <LogItem key={log.timestamp} log={log} />)}
                  </div>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const Controls: React.FC<{isRunning: boolean, onStart: () => void, onReset: () => void, seed: string, onSeedChange: (s: string) => void}> = ({ isRunning, onStart, onReset, seed, onSeedChange }) => (
    <div className="space-y-3">
        <h3 className="text-xl font-bold text-white">Scenario Controls</h3>
        <div>
            <label className="text-sm font-medium text-gray-400">Simulation Seed</label>
            <input type="text" value={seed} onChange={e => onSeedChange(e.target.value)} disabled={isRunning} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={onStart} disabled={isRunning} className="flex items-center justify-center w-full px-4 py-2 font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-600 transition-colors">
                {isRunning ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : '▶'}
                <span className="ml-2">{isRunning ? 'Running...' : 'Run Scenario'}</span>
            </button>
            <button onClick={onReset} disabled={isRunning} className="flex items-center justify-center px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-slate-600 transition-colors">
                ■<span className="ml-2">Reset</span>
            </button>
        </div>
    </div>
);

const AnalysisReport: React.FC<{ analysis: string; isLoading: boolean }> = ({ analysis, isLoading }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-sky-500/50 animate-fade-in">
        <h3 className="text-lg font-bold text-sky-400 mb-2 flex items-center">
            <span className="mr-2">🛡️</span> Blue Team: Post-Incident Analysis
        </h3>
        {isLoading ? (
            <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
        ) : (
             <pre className="whitespace-pre-wrap font-sans text-gray-300 text-sm">{analysis}</pre>
        )}
    </div>
);


const LogItem: React.FC<{ log: ActionLog }> = ({ log }) => {
    const typeClasses: Record<ActionLog['type'], { border: string, text: string, icon: string }> = {
        info: { border: 'border-l-slate-500', text: 'text-gray-300', icon: 'ℹ️' },
        red: { border: 'border-l-red-500', text: 'text-red-400', icon: '🎯' },
        blue: { border: 'border-l-sky-500', text: 'text-sky-400', icon: '🛡️' },
        green: { border: 'border-l-green-500', text: 'text-green-400', icon: '✅' },
        warning: { border: 'border-l-yellow-500', text: 'text-yellow-400', icon: '⚠️' },
        critical: { border: 'border-l-red-500 font-bold', text: 'text-red-400', icon: '🚨' },
    };
    const classes = typeClasses[log.type] || typeClasses.info;

    return (
        <div className={`pl-3 border-l-2 ${classes.border} animate-fade-in`}>
            <p className={`text-sm font-semibold ${classes.text}`}>
                <span className="mr-2">{classes.icon}</span>{log.message}
            </p>
            {log.details && <p className="text-xs text-gray-400 pl-7">{log.details}</p>}
        </div>
    );
};

export default AdversarialSimulator;