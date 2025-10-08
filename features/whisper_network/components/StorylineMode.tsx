import React, { useState, useEffect, useMemo } from 'react';
import { SocialMediaPost, ThreatAlert } from '../types';
import { mockSentimentTrends } from '../data';
import SocialMediaFeed from './SocialMediaFeed';
import ThreatMap from './ThreatMap';
import SentimentCharts from './SentimentCharts';

// --- Storyline Chapter Definition ---
const storyline = [
  {
    title: "72 Hours Before - Normal Activity",
    annotation: "System monitors routine social media activity from tourists and locals. Threat levels are nominal.",
    startHour: 72, endHour: 49,
    highlightPostIds: ['p1', 'p2'],
  },
  {
    title: "48 Hours Before - Subtle Changes",
    annotation: "AI detects unusual keyword patterns and coded language on anonymous platforms like Telegram. Keywords like 'movement' and 'checkpoint' are flagged.",
    startHour: 48, endHour: 37,
    highlightPostIds: ['p5'],
  },
  {
    title: "36 Hours Before - Coordinated Chatter",
    annotation: "Pattern detection algorithm identifies coordinated activity. Multiple posts mention the same locations, and the first threat alert is generated based on correlated, coded messages.",
    startHour: 36, endHour: 23,
    highlightPostIds: ['p6', 'p14'],
  },
  {
    title: "24 Hours Before - Threat Level Rises",
    annotation: "Hostile sentiment increases significantly. Mainstream news begins reporting on general security concerns, corroborating chatter. Multiple critical alerts are now active.",
    startHour: 22, endHour: 13,
    highlightPostIds: ['p7', 'p8'],
  },
  {
    title: "12 Hours Before - Critical Intelligence",
    annotation: "Intelligence agencies issue official warnings, confirming the threat detected by the system hours earlier. Location correlation is strong, pointing directly to Pahalgam. Early warning could enable preventive action.",
    startHour: 12, endHour: 2,
    highlightPostIds: ['p9', 'p10', 'p17'],
  },
  {
    title: "Attack Occurs - Real-Time Response",
    annotation: "As the incident unfolds, the system provides real-time situational awareness by aggregating breaking news and on-the-ground social media reports, aiding in incident response and coordination.",
    startHour: 1.5, endHour: 0,
    highlightPostIds: ['p11', 'p12', 'p13'],
  },
];


// --- Component Props ---
interface StorylineModeProps {
  allPosts: SocialMediaPost[];
  allAlerts: ThreatAlert[];
  onClose: () => void;
}

// --- Main Component ---
const StorylineMode: React.FC<StorylineModeProps> = ({ allPosts, allAlerts, onClose }) => {
    const [chapterIndex, setChapterIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTab, setActiveTab] = useState<'feed' | 'analytics' | 'map'>('feed');

    const currentChapter = storyline[chapterIndex];

    // --- Data Filtering based on Storyline ---
    const chapterData = useMemo(() => {
        const now = new Date();
        const startTime = new Date(now.getTime() - currentChapter.startHour * 3600 * 1000);
        const endTime = new Date(now.getTime() - currentChapter.endHour * 3600 * 1000);

        const posts = allPosts.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
        const alerts = allAlerts.filter(a => a.detectedAt >= startTime && a.detectedAt <= endTime);

        return { posts, alerts };
    }, [chapterIndex, allPosts, allAlerts, currentChapter]);

    // --- Handlers for Playback Controls ---
    const handleNext = () => setChapterIndex(i => Math.min(i + 1, storyline.length - 1));
    const handlePrev = () => setChapterIndex(i => Math.max(i - 1, 0));
    const handlePlayPause = () => setIsPlaying(p => !p);
    const handleSelectChapter = (index: number) => {
        setIsPlaying(false);
        setChapterIndex(index);
    };

    // --- Effect for Auto-Advance ---
    useEffect(() => {
        if (isPlaying) {
            const timer = setTimeout(() => {
                if (chapterIndex < storyline.length - 1) {
                    handleNext();
                } else {
                    setIsPlaying(false);
                }
            }, 10000); // 10 seconds per chapter
            return () => clearTimeout(timer);
        }
    }, [isPlaying, chapterIndex]);

    const renderContent = () => {
        const dummyFilters = { platforms: [], sentiments: [], threatLevels: [], dateRange: { start: null, end: null }, searchQuery: '', location: 'All Locations' };
        switch (activeTab) {
            case 'analytics': return <SentimentCharts posts={chapterData.posts} trends={mockSentimentTrends} />;
            case 'map': return <ThreatMap posts={chapterData.posts} alerts={chapterData.alerts} onMarkerClick={() => {}} selectedPostId={null} activeFilters={dummyFilters} />;
            case 'feed':
            default: return <SocialMediaFeed posts={chapterData.posts} highlightedPostIds={currentChapter.highlightPostIds} />;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4 lg:p-8">
            <div className="w-full h-full max-w-screen-2xl flex gap-6">
                {/* Main Content (Dashboard View) */}
                <div className="flex-grow h-full bg-slate-900 rounded-lg border border-slate-700 p-4 flex flex-col">
                    <div className="flex-shrink-0 border-b border-slate-700 mb-4">
                        <div className="flex space-x-2">
                            <TabButton label="Feed" isActive={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
                            <TabButton label="Analytics" isActive={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
                            <TabButton label="Map View" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
                        </div>
                    </div>
                    <div className="flex-grow min-h-0">{renderContent()}</div>
                </div>

                {/* Narrative & Controls Panel */}
                <div className="w-full max-w-sm h-full bg-slate-800 rounded-lg border border-slate-700 p-6 flex flex-col text-white">
                    <h2 className="text-2xl font-bold text-sky-400 mb-2">Pahalgam Attack: Intel Storyline</h2>
                    <p className="text-sm text-gray-400 mb-6">A guided walkthrough of the intelligence timeline.</p>
                    
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                           <h3 className="text-lg font-bold">{currentChapter.title}</h3>
                           <span className="text-sm font-mono text-gray-400">{chapterIndex + 1} / {storyline.length}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${((chapterIndex + 1) / storyline.length) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg flex-grow mb-6">
                        <p className="text-gray-300">{currentChapter.annotation}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="chapter-select" className="block text-sm font-medium text-gray-400 mb-1">Skip to Chapter</label>
                            <select id="chapter-select" value={chapterIndex} onChange={e => handleSelectChapter(Number(e.target.value))} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white outline-none">
                                {storyline.map((chap, idx) => <option key={idx} value={idx}>{idx + 1}: {chap.title.split('-')[1].trim()}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <ControlButton onClick={handlePrev} disabled={chapterIndex === 0}>&laquo; Prev</ControlButton>
                            <ControlButton onClick={handlePlayPause} className="bg-sky-600 hover:bg-sky-700">{isPlaying ? '❚❚ Pause' : '▶ Play'}</ControlButton>
                            <ControlButton onClick={handleNext} disabled={chapterIndex === storyline.length - 1}>Next &raquo;</ControlButton>
                        </div>
                        <button onClick={onClose} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                            Exit Presentation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors focus:outline-none ${isActive ? 'bg-slate-800 border-b-2 border-sky-500 text-white' : 'text-gray-400 hover:bg-slate-700/50'}`}>
        {label}
    </button>
);

const ControlButton: React.FC<{onClick: () => void, disabled?: boolean, children: React.ReactNode, className?: string}> = ({ onClick, disabled, children, className = '' }) => (
     <button onClick={onClick} disabled={disabled} className={`px-4 py-2 font-bold text-white bg-slate-600 rounded-md hover:bg-slate-700 disabled:bg-slate-700/50 disabled:cursor-not-allowed transition-colors ${className}`}>
        {children}
    </button>
);

export default StorylineMode;