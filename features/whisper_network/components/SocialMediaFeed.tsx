import React, { useState, useMemo } from 'react';
import { SocialMediaPost } from '../types';
import { formatTimestamp, getSentimentIcon } from '../utils/formatting';

// --- Component Interfaces ---
interface SocialMediaFeedProps {
  posts: SocialMediaPost[];
  onKeywordClick?: (keyword: string) => void;
  highlightedPostIds?: string[];
}

interface PostCardProps {
    post: SocialMediaPost;
    onKeywordClick?: (keyword: string) => void;
    isHighlighted?: boolean;
}

// --- Styling & Config ---
const platformConfig = {
    Twitter: { icon: '🐦', color: 'border-sky-400', name: 'Twitter/X' },
    Reddit: { icon: '👽', color: 'border-orange-500', name: 'Reddit' },
    Telegram: { icon: '✈️', color: 'border-blue-500', name: 'Telegram' },
    News: { icon: '📰', color: 'border-purple-400', name: 'News' },
};

const sentimentConfig = {
    positive: 'text-green-400',
    neutral: 'text-sky-400',
    negative: 'text-yellow-400',
    hostile: 'text-red-400',
};

const getThreatScoreColor = (score: number): string => {
    if (score > 90) return 'bg-red-600';
    if (score > 70) return 'bg-orange-500';
    if (score > 40) return 'bg-yellow-600';
    return 'bg-slate-600';
}

const CONTENT_TRUNCATE_LENGTH = 200;

// --- Post Card Subcomponent ---
const PostCard: React.FC<PostCardProps> = ({ post, onKeywordClick, isHighlighted }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const config = platformConfig[post.platform];

    const toggleExpansion = () => setIsExpanded(!isExpanded);
    
    const displayContent = isExpanded ? post.content : post.content.slice(0, CONTENT_TRUNCATE_LENGTH);

    return (
        <div className={`p-3 rounded-lg bg-slate-900/70 border-l-4 ${config.color} transition-all duration-200 hover:bg-slate-800/50 ${isHighlighted ? 'animate-highlight' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="font-bold text-sky-300">{post.author}</span>
                    {post.isVerified && <span className="text-blue-400 text-xs font-bold" title="Verified">✔ VERIFIED</span>}
                </div>
                <span className="text-gray-400 text-xs">{formatTimestamp(post.timestamp)}</span>
            </div>

            {/* Content */}
            <p className="text-gray-300 mb-3 whitespace-pre-wrap">
                {displayContent}
                {post.content.length > CONTENT_TRUNCATE_LENGTH && (
                    <button onClick={toggleExpansion} className="text-sky-400 text-sm ml-2 hover:underline">
                        {isExpanded ? 'Show less' : '...Show more'}
                    </button>
                )}
            </p>

            {/* Keywords */}
            <div className="flex flex-wrap gap-2 mb-3">
                {post.keywords.map(k => (
                    <button key={k} onClick={() => onKeywordClick?.(k)} className="bg-slate-700 px-2 py-0.5 rounded-full text-xs text-gray-300 hover:bg-sky-600 hover:text-white transition-colors">
                        #{k}
                    </button>
                ))}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 border-t border-slate-700/50 pt-2">
                <div className="flex items-center gap-1 font-bold">
                    <span className="text-lg">{getSentimentIcon(post.sentiment)}</span>
                    <span className={`${sentimentConfig[post.sentiment]} capitalize`}>{post.sentiment}</span>
                </div>
                 <div className="flex items-center gap-4">
                    <span>❤️ {post.engagement.likes}</span>
                    <span>🔁 {post.engagement.shares}</span>
                </div>
                <div className={`px-2 py-1 rounded-md text-white font-bold text-center ${getThreatScoreColor(post.threatScore)}`}>
                    Threat: {post.threatScore}
                </div>
            </div>
        </div>
    );
};


// --- Main Social Feed Component ---
const SocialMediaFeed: React.FC<SocialMediaFeedProps> = ({ posts, onKeywordClick, highlightedPostIds = [] }) => {
    const [sortBy, setSortBy] = useState<'recent' | 'threatScore' | 'engagement'>('recent');

    const sortedPosts = useMemo(() => {
        const sorted = [...posts]; // Create a mutable copy
        switch (sortBy) {
            case 'threatScore':
                return sorted.sort((a, b) => b.threatScore - a.threatScore);
            case 'engagement':
                const getEngagement = (p: SocialMediaPost) => p.engagement.likes + p.engagement.shares + p.engagement.comments;
                return sorted.sort((a, b) => getEngagement(b) - getEngagement(a));
            case 'recent':
            default:
                return sorted.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }
    }, [posts, sortBy]);

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col h-full">
            <style>{`
                @keyframes highlight-glow {
                    0% { box-shadow: 0 0 0px 0px rgba(56, 189, 248, 0); }
                    50% { box-shadow: 0 0 10px 2px rgba(56, 189, 248, 0.5); }
                    100% { box-shadow: 0 0 0px 0px rgba(56, 189, 248, 0); }
                }
                .animate-highlight {
                    animation: highlight-glow 2.5s ease-in-out;
                }
            `}</style>
            <div className="p-4 border-b border-slate-700 flex-shrink-0 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Live Social Feed</h3>
                <select 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-slate-700 border border-slate-600 rounded-md p-1.5 text-xs text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                >
                    <option value="recent">Most Recent</option>
                    <option value="threatScore">Highest Threat</option>
                    <option value="engagement">Top Engagement</option>
                </select>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {sortedPosts.length > 0 ? (
                     sortedPosts.map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            onKeywordClick={onKeywordClick}
                            isHighlighted={highlightedPostIds.includes(post.id)}
                        />
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-16">
                        <p className="text-lg font-semibold">No posts match the current filters.</p>
                        <p className="text-sm">Try adjusting your filter criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialMediaFeed;