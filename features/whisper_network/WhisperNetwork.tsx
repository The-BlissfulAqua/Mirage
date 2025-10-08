import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SocialMediaPost, ThreatAlert, FilterOptions } from './types';
import { mockPosts, mockAlerts, mockSentimentTrends } from './data';
import FiltersSidebar from './components/FiltersSidebar';
import ThreatAlertsPanel from './components/ThreatAlertsPanel';
import SocialMediaFeed from './components/SocialMediaFeed';
import ThreatMap from './components/ThreatMap';
import SentimentCharts from './components/SentimentCharts';
import StorylineMode from './components/StorylineMode';

// --- Constants ---
const SCENARIO_DURATION_HOURS = 72;
const PLAYBACK_TICK_MS = 100;

// --- Main Component ---
const WhisperNetwork: React.FC = () => {
    // Data State
    const [posts] = useState<SocialMediaPost[]>(mockPosts);
    const [alerts] = useState<ThreatAlert[]>(mockAlerts);
    const [trends] = useState(mockSentimentTrends);

    // UI State
    const [activeTab, setActiveTab] = useState<'feed' | 'analytics' | 'map'>('feed');
    const [filters, setFilters] = useState<FilterOptions>({
        platforms: [], sentiments: [], threatLevels: [],
        dateRange: { start: null, end: null }, searchQuery: '', location: 'All Locations'
    });
    const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isPresentationMode, setIsPresentationMode] = useState(false);


    // Scenario Playback State
    const [isScenarioPlaying, setIsScenarioPlaying] = useState(false);
    const [scenarioProgress, setScenarioProgress] = useState(0); // 0 to 100
    const playbackIntervalRef = useRef<number | null>(null);

    // Debounced search query for performance
    const useDebounce = (value: string, delay: number) => {
        const [debouncedValue, setDebouncedValue] = useState(value);
        useEffect(() => {
            const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
            return () => { clearTimeout(handler); };
        }, [value, delay]);
        return debouncedValue;
    };
    const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

    // --- Derived State & Memos ---
    const scenarioTime = useMemo(() => {
        const hoursAgo = SCENARIO_DURATION_HOURS * (1 - scenarioProgress / 100);
        return new Date(Date.now() - hoursAgo * 3600 * 1000);
    }, [scenarioProgress]);

    // Apply scenario time filter first
    const timeFilteredPosts = useMemo(() => posts.filter(p => p.timestamp <= scenarioTime), [posts, scenarioTime]);
    const timeFilteredAlerts = useMemo(() => alerts.filter(a => a.detectedAt <= scenarioTime), [alerts, scenarioTime]);

    // Apply sidebar filters on top of time-filtered data
    const fullyFilteredAlerts = useMemo(() => {
        return timeFilteredAlerts.filter(alert => {
             if (filters.threatLevels.length > 0 && !filters.threatLevels.includes(alert.threatLevel)) return false;
             if (filters.location !== 'All Locations' && alert.location.name !== filters.location) return false;
             if (debouncedSearchQuery && !alert.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) && !alert.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) return false;
            return true;
        }).sort((a, b) => b.threatScore - a.threatScore);
    }, [timeFilteredAlerts, filters.threatLevels, filters.location, debouncedSearchQuery]);

    const fullyFilteredPosts = useMemo(() => {
        // If a post is selected from the map, show only that one, regardless of time.
        if (selectedPostId) {
            return posts.filter(p => p.id === selectedPostId);
        }
        
        let postsToFilter = timeFilteredPosts;

        // If an alert is selected, show only its related posts that are within the current scenario time.
        if (selectedAlert) {
            const relatedPostIds = new Set(selectedAlert.relatedPosts);
            postsToFilter = postsToFilter.filter(p => relatedPostIds.has(p.id));
        }
        
        return postsToFilter.filter(post => {
            if (filters.platforms.length > 0 && !filters.platforms.includes(post.platform)) return false;
            if (filters.sentiments.length > 0 && !filters.sentiments.includes(post.sentiment)) return false;
            if (filters.threatLevels.length > 0) {
                const postThreatLevel = post.threatScore > 75 ? 'critical' : post.threatScore > 50 ? 'high' : post.threatScore > 25 ? 'medium' : 'low';
                if (!filters.threatLevels.includes(postThreatLevel as any)) return false;
            }
            if (filters.location !== 'All Locations' && (!post.location || post.location.name !== filters.location)) return false;
            if (debouncedSearchQuery) {
                const query = debouncedSearchQuery.toLowerCase();
                const inContent = post.content.toLowerCase().includes(query);
                const inAuthor = post.author.toLowerCase().includes(query);
                const inKeywords = post.keywords.some(k => k.toLowerCase().includes(query));
                if (!inContent && !inAuthor && !inKeywords) return false;
            }
            return true;
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [posts, timeFilteredPosts, filters, selectedAlert, selectedPostId, debouncedSearchQuery]);

    // --- Handlers ---
    const handleFilterChange = useCallback((newFilters: FilterOptions) => {
        setFilters(newFilters);
        // Clear selections when filters change to avoid confusion
        setSelectedPostId(null);
        setSelectedAlert(null);
    }, []);
    
    const handleKeywordClick = (keyword: string) => {
        setFilters(prev => ({ ...prev, searchQuery: prev.searchQuery === keyword ? '' : keyword }));
        setSelectedPostId(null);
    };

    const handleMarkerClick = (postId: string | null) => {
        setSelectedPostId(postId);
        setSelectedAlert(null);
    };
    
    const handleAlertSelect = (alert: ThreatAlert | null) => {
        setSelectedAlert(alert);
        setSelectedPostId(null);
    };

    const handleScenarioProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsScenarioPlaying(false);
        setScenarioProgress(Number(e.target.value));
    };

    // --- Effects ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if the target is not an input field to avoid overriding typing
            if (e.key === '/' && (e.target as HTMLElement)?.nodeName !== 'INPUT') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isScenarioPlaying) {
            playbackIntervalRef.current = window.setInterval(() => {
                setScenarioProgress(prev => {
                    if (prev >= 100) {
                        setIsScenarioPlaying(false);
                        return 100;
                    }
                    // This increment makes the 72h scenario last about 72 seconds.
                    return Math.min(100, prev + 100 / (SCENARIO_DURATION_HOURS * 10));
                });
            }, PLAYBACK_TICK_MS);
        } else {
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
        }
        return () => { if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current); };
    }, [isScenarioPlaying]);

    // --- Metrics ---
    const totalPosts = useMemo(() => timeFilteredPosts.length, [timeFilteredPosts]);
    const activeThreats = useMemo(() => timeFilteredAlerts.filter(a => a.status === 'active').length, [timeFilteredAlerts]);
    const highPriorityAlerts = useMemo(() => timeFilteredAlerts.filter(a => a.threatLevel === 'high' || a.threatLevel === 'critical').length, [timeFilteredAlerts]);
    const avgThreatScore = useMemo(() => {
        if (timeFilteredPosts.length === 0) return 0;
        const totalScore = timeFilteredPosts.reduce((sum, post) => sum + post.threatScore, 0);
        return Math.round(totalScore / timeFilteredPosts.length);
    }, [timeFilteredPosts]);

    const renderContent = () => {
        switch (activeTab) {
            case 'analytics': return <SentimentCharts posts={fullyFilteredPosts} trends={trends} />;
            case 'map': return <ThreatMap posts={timeFilteredPosts} alerts={alerts} activeFilters={filters} onMarkerClick={handleMarkerClick} selectedPostId={selectedPostId} />;
            case 'feed':
            default: return <SocialMediaFeed posts={fullyFilteredPosts} onKeywordClick={handleKeywordClick} />;
        }
    };
    
    return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header, Stats, and Scenario Controls */}
      <div className="flex-shrink-0 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h2 className="text-xl font-bold text-white">Border Security Threat Intelligence System</h2>
                <p className="text-sm text-gray-400">Demo: Pahalgam Attack Intelligence Reconstruction</p>
            </div>
            <div className="text-right">
                <p className="text-lg font-mono text-sky-400">{scenarioTime.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Scenario Time</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard title="Posts in Timespan" value={totalPosts} />
            <StatCard title="Active Threats" value={activeThreats} color="text-orange-400" />
            <StatCard title="High Priority" value={highPriorityAlerts} color="text-red-400" />
            <StatCard title="Avg. Threat Score" value={avgThreatScore} />
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={() => setIsScenarioPlaying(!isScenarioPlaying)}
                className="w-28 text-center px-4 py-2 font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors"
                title={isScenarioPlaying ? 'Pause scenario playback' : 'Play scenario'}
            >
                {isScenarioPlaying ? '❚❚ Pause' : '▶ Play'}
            </button>
            <span className="text-xs text-gray-400">72h ago</span>
            <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={scenarioProgress}
                onChange={handleScenarioProgressChange}
                className="flex-grow h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                title={`Timeline: ${Math.round(SCENARIO_DURATION_HOURS * (1 - scenarioProgress/100))} hours ago`}
            />
            <span className="text-xs text-gray-400">Now</span>
            <button onClick={() => setIsPresentationMode(true)} className="px-4 py-2 font-bold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors">
                Start Presentation
            </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0">
          <div className="lg:col-span-3 flex flex-col gap-6">
              <FiltersSidebar onFilterChange={handleFilterChange} activeFilters={filters} searchInputRef={searchInputRef} />
              <ThreatAlertsPanel alerts={fullyFilteredAlerts} posts={posts} onAlertSelect={handleAlertSelect} selectedAlertId={selectedAlert?.id} />
          </div>

          <div className="lg:col-span-9 flex flex-col">
              <div className="flex-shrink-0 border-b border-slate-700 mb-4">
                  <div className="flex space-x-2">
                      <TabButton label="Live Feed" isActive={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
                      <TabButton label="Analytics" isActive={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
                      <TabButton label="Map View" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
                  </div>
              </div>
              <div className="flex-grow min-h-0">{renderContent()}</div>
          </div>
      </div>

       {isPresentationMode && (
          <StorylineMode 
              allPosts={posts} 
              allAlerts={alerts} 
              onClose={() => setIsPresentationMode(false)} 
          />
      )}
    </div>
  );
};

// --- Subcomponents ---

const StatCard: React.FC<{ title: string; value: string | number; color?: string }> = ({ title, value, color = 'text-white' }) => (
    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
        <h4 className="text-xs font-medium text-gray-400 mb-1">{title}</h4>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
);

const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors focus:outline-none ${isActive ? 'bg-slate-800/50 border-b-2 border-sky-500 text-white' : 'text-gray-400 hover:bg-slate-800/20'}`}>
        {label}
    </button>
);

export default WhisperNetwork;