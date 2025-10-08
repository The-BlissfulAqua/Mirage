import React, { useState, useMemo } from 'react';
import { SocialMediaPost, ThreatAlert } from '../types';
import { formatTimestamp } from '../utils/formatting';

// --- Helper Data & Types ---
const threatLevelConfig = {
    low: { color: 'border-green-500', pulse: false, text: 'text-green-400', bg: 'bg-green-600' },
    medium: { color: 'border-yellow-500', pulse: false, text: 'text-yellow-400', bg: 'bg-yellow-600' },
    high: { color: 'border-orange-500', pulse: false, text: 'text-orange-400', bg: 'bg-orange-600' },
    critical: { color: 'border-red-500', pulse: true, text: 'text-red-400', bg: 'bg-red-700' },
};

const categoryIcons: Record<string, string> = {
    "Coded Communication": "🤫",
    "Security Posture Change": "🛡️",
    "Pre-Attack Coordination": "🎯",
    "Official Warning": "⚠️",
    "Active Incident": "🚨",
};

// --- Props Interface ---
interface ThreatAlertsPanelProps {
  alerts: ThreatAlert[];
  posts: SocialMediaPost[];
  onAlertSelect: (alert: ThreatAlert | null) => void;
  selectedAlertId?: string | null;
}

// --- Main Component ---
const ThreatAlertsPanel: React.FC<ThreatAlertsPanelProps> = ({ alerts, posts, onAlertSelect, selectedAlertId }) => {
    const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
    const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

    const filteredAndSortedAlerts = useMemo(() => {
        return alerts
            .filter(alert => statusFilter === 'all' || alert.status === 'active')
            .sort((a, b) => {
                const levelOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                if (levelOrder[b.threatLevel] !== levelOrder[a.threatLevel]) {
                    return levelOrder[b.threatLevel] - levelOrder[a.threatLevel];
                }
                return b.threatScore - a.threatScore;
            });
    }, [alerts, statusFilter]);
    
    const handleSelect = (alert: ThreatAlert) => {
        // Toggle selection for filtering the main feed
        if (selectedAlertId === alert.id) {
            onAlertSelect(null);
        } else {
            onAlertSelect(alert);
        }
    };
    
    const handleExpand = (alertId: string) => {
        // Toggle expansion for viewing details within the panel
        setExpandedAlertId(prevId => (prevId === alertId ? null : alertId));
    };

    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col flex-grow min-h-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-xl font-bold text-white">Threat Alerts</h3>
                <div className="flex items-center bg-slate-900/50 rounded-lg p-1">
                    <button onClick={() => setStatusFilter('active')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${statusFilter === 'active' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-slate-700'}`}>
                        Active
                    </button>
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${statusFilter === 'all' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-slate-700'}`}>
                        All
                    </button>
                </div>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                {filteredAndSortedAlerts.length > 0 ? (
                    filteredAndSortedAlerts.map(alert => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                            allPosts={posts}
                            isExpanded={expandedAlertId === alert.id}
                            isSelected={selectedAlertId === alert.id}
                            onExpand={() => handleExpand(alert.id)}
                            onSelect={() => handleSelect(alert)}
                        />
                    ))
                ) : (
                     <div className="text-center text-gray-500 py-8">
                        <p className="font-semibold">No {statusFilter} threats detected.</p>
                        <p className="text-sm">System is clear based on current filters.</p>
                     </div>
                )}
            </div>
        </div>
    );
};


// --- Alert Card Subcomponent ---
interface AlertCardProps {
    alert: ThreatAlert;
    allPosts: SocialMediaPost[];
    isExpanded: boolean;
    isSelected: boolean;
    onExpand: () => void;
    onSelect: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, allPosts, isExpanded, isSelected, onExpand, onSelect }) => {
    const config = threatLevelConfig[alert.threatLevel];
    const relatedPosts = useMemo(() => allPosts.filter(p => alert.relatedPosts.includes(p.id)), [allPosts, alert.relatedPosts]);

    return (
        <div className={`rounded-lg bg-slate-900/70 border-l-4 ${config.color} ${isSelected ? 'ring-2 ring-sky-400' : ''} ${config.pulse ? 'animate-pulse' : ''} transition-all duration-300 overflow-hidden`}>
            {/* --- Compact View --- */}
            <div className="p-3 cursor-pointer" onClick={onSelect}>
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-2xl mr-2">{categoryIcons[alert.category] || '⚡'}</span>
                        <span className="font-bold text-sky-300">{alert.title}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full text-white ${config.bg}`}>{alert.threatLevel}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1 pl-9">{alert.description}</p>
                <div className="flex justify-between items-center mt-3 text-xs text-gray-500 pl-9">
                    <span>📍 {alert.location.name}</span>
                    <span>{formatTimestamp(alert.detectedAt)}</span>
                </div>
                {/* Threat Score Meter */}
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2 ml-9">
                    <div className={`${config.bg}`} style={{ width: `${alert.threatScore}%`, height: '100%', borderRadius: 'inherit' }}></div>
                </div>
                <div className="flex justify-end mt-2">
                     <button onClick={(e) => { e.stopPropagation(); onExpand(); }} className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                        {isExpanded ? 'Hide Details ▲' : `View ${alert.relatedPosts.length} Posts ▼`}
                    </button>
                </div>
            </div>

            {/* --- Expanded View --- */}
            {isExpanded && (
                <div className="bg-slate-900/50 p-4 border-t border-slate-700 animate-fade-in">
                    <h5 className="font-bold text-white mb-2">Related Intelligence</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {relatedPosts.map(post => (
                            <div key={post.id} className="text-xs p-2 bg-slate-800 rounded-md">
                                <p className="text-gray-300"><strong>{post.author} ({post.platform}):</strong> {post.content}</p>
                                <p className="text-gray-500 text-right">{formatTimestamp(post.timestamp)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button className="flex-1 text-xs bg-slate-600 hover:bg-slate-700 text-white font-bold py-1 px-2 rounded">Mark as Reviewed</button>
                        <button className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">Escalate</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThreatAlertsPanel;
