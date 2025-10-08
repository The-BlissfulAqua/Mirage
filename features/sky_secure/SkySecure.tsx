import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ThreatLevel, LogEntry } from '../../types';
import { analyzeSecurityEvents } from '../../services/geminiService';

const initialAnomalyData = [
  { name: '12:00', anomalies: 4 }, { name: '12:05', anomalies: 5 }, { name: '12:10', anomalies: 8 },
  { name: '12:15', anomalies: 3 }, { name: '12:20', anomalies: 6 }, { name: '12:25', anomalies: 5 },
  { name: '12:30', anomalies: 7 },
];

const initialSystemStatusData = [
  { name: 'Firewall', status: 98 }, { name: 'IDS/IPS', status: 95 }, { name: 'Endpoint', status: 88 },
  { name: 'API Gateway', status: 100 }, { name: 'Database', status: 92 },
];

const eventTypes = [
  { type: 'Port Scan', level: 'GUARDED' }, { type: 'Malware Detected', level: 'HIGH' },
  { type: 'Login Anomaly', level: 'ELEVATED' }, { type: 'DDoS Activity', level: 'SEVERE' },
  { type: 'Policy Update', level: 'LOW' }
] as const;

const generateLogEntry = (): LogEntry => {
    const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    return {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        type: event.type,
        level: event.level,
        source: `172.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`
    };
};

const SkySecure: React.FC = () => {
    const [anomalyData, setAnomalyData] = useState(initialAnomalyData);
    const [systemStatusData, setSystemStatusData] = useState(initialSystemStatusData);
    const [log, setLog] = useState<LogEntry[]>(() => Array.from({ length: 20 }, generateLogEntry));
    const [threatLevel, setThreatLevel] = useState<ThreatLevel>('GUARDED');
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);


    const updateData = useCallback(() => {
        // Update Anomaly Data
        setAnomalyData(prev => {
            const newPoint = {
                name: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
                anomalies: Math.floor(Math.random() * 10) + 2,
            };
            const newData = [...prev.slice(1), newPoint];
            const avgAnomalies = newData.reduce((acc, item) => acc + item.anomalies, 0) / newData.length;
            if (avgAnomalies > 8) setThreatLevel('SEVERE');
            else if (avgAnomalies > 6.5) setThreatLevel('HIGH');
            else if (avgAnomalies > 5) setThreatLevel('ELEVATED');
            else if (avgAnomalies > 3) setThreatLevel('GUARDED');
            else setThreatLevel('LOW');

            return newData;
        });

        // Update System Status
        setSystemStatusData(prev => prev.map(item => ({
            ...item,
            status: Math.max(80, Math.min(100, item.status + Math.floor(Math.random() * 7) - 3))
        })));

        // Update Log
        setLog(prev => [generateLogEntry(), ...prev.slice(0, 49)]);

    }, []);

    useEffect(() => {
        const dataInterval = setInterval(updateData, 3000);
        return () => clearInterval(dataInterval);
    }, [updateData]);

    useEffect(() => {
        const performAnalysis = async () => {
            if (!log.length) return;
            setIsAnalyzing(true);
            const analysis = await analyzeSecurityEvents(log);
            setAiAnalysis(analysis);
            setIsAnalyzing(false);
        };

        // Initial analysis on load
        performAnalysis();
        
        const analysisInterval = setInterval(performAnalysis, 15000); // Slower interval for AI analysis
        return () => clearInterval(analysisInterval);
    }, [log]);


    const threatLevelColors: Record<ThreatLevel, string> = {
        LOW: 'bg-green-500 text-green-900',
        GUARDED: 'bg-blue-500 text-blue-900',
        ELEVATED: 'bg-yellow-500 text-yellow-900',
        HIGH: 'bg-orange-500 text-orange-900',
        SEVERE: 'bg-red-500 text-red-900',
    };
    
    const getStatusColor = (status: number) => {
        if (status > 95) return '#22c55e'; // green
        if (status > 85) return '#facc15'; // yellow
        return '#ef4444'; // red
    };

    const getLogLevelClass = (level: ThreatLevel) => {
      switch (level) {
        case 'SEVERE': return 'text-red-400';
        case 'HIGH': return 'text-orange-400';
        case 'ELEVATED': return 'text-yellow-400';
        case 'GUARDED': return 'text-blue-400';
        default: return 'text-green-400';
      }
    };


    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`p-6 rounded-xl ${threatLevelColors[threatLevel]} shadow-lg`}>
                    <h4 className="font-bold text-lg">Threat Level</h4>
                    <p className="text-4xl font-black tracking-wider">{threatLevel}</p>
                </div>
                 <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h4 className="text-gray-400">Active Alerts</h4>
                    <p className="text-4xl font-bold text-white">{log.filter(l => ['HIGH', 'SEVERE'].includes(l.level)).length}</p>
                </div>
                 <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h4 className="text-gray-400">Systems Nominal</h4>
                    <p className="text-4xl font-bold text-white">{systemStatusData.filter(s => s.status > 90).length} / {systemStatusData.length}</p>
                </div>
                 <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h4 className="text-gray-400">Anomalies (5m)</h4>
                    <p className="text-4xl font-bold text-white">{anomalyData[anomalyData.length - 1].anomalies}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 p-6 bg-slate-800/50 rounded-xl border border-slate-700 h-96">
                     <h3 className="text-xl font-bold mb-4 text-white">Anomalies Detected Over Time</h3>
                     <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={anomalyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: '#475569' }}/>
                            <Legend />
                            <Line type="monotone" dataKey="anomalies" stroke="#f43f5e" strokeWidth={2} dot={{r: 4}} activeDot={{ r: 8 }}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 h-96">
                    <h3 className="text-xl font-bold mb-4 text-white">System Status</h3>
                    <ResponsiveContainer width="100%" height="90%">
                       <BarChart data={systemStatusData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" stroke="#94a3b8" width={80} />
                             <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: '#475569' }}/>
                            <Bar dataKey="status" background={{ fill: '#1e293b' }}>
                                {systemStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                                ))}
                            </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800/50 rounded-xl border border-slate-700 h-96 flex flex-col">
                    <div className="p-6 border-b border-slate-700">
                        <h3 className="text-xl font-bold text-white">Live Security Event Log</h3>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2">
                        {log.map(entry => (
                            <div key={entry.id} className="grid grid-cols-12 gap-4 p-2 font-mono text-sm border-b border-slate-800 hover:bg-slate-700/50">
                                <span className="col-span-2 text-gray-400">{entry.time}</span>
                                <span className={`col-span-2 font-bold ${getLogLevelClass(entry.level)}`}>{entry.level}</span>
                                <span className="col-span-4 text-gray-300">{entry.type}</span>
                                <span className="col-span-4 text-sky-400">{entry.source}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 h-96 flex flex-col">
                  <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">AI Security Analyst</h3>
                      {isAnalyzing && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
                           <span className="text-sm text-sky-400">Analyzing...</span>
                        </div>
                      )}
                  </div>
                  <div className="flex-grow overflow-y-auto p-6">
                      {isAnalyzing && !aiAnalysis ? (
                        <div className="space-y-4 animate-pulse">
                          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-700 rounded"></div>
                          <div className="h-4 bg-slate-700 rounded"></div>
                          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:text-gray-300 prose-strong:text-sky-400 prose-ul:list-disc prose-li:text-gray-300">
                          <pre className="whitespace-pre-wrap font-sans text-gray-300 bg-transparent p-0">{aiAnalysis}</pre>
                        </div>
                      )}
                  </div>
              </div>
            </div>
        </div>
    );
};

export default SkySecure;
