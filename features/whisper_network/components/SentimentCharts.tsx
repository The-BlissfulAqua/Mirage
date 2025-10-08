import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { SocialMediaPost, SentimentTrend } from '../types';

// --- Props & Types ---
interface SentimentChartsProps {
  posts: SocialMediaPost[];
  trends: SentimentTrend[];
}
type ChartType = 'timeline' | 'distribution' | 'threatTiers' | 'platform';

// --- Chart Configs ---
const SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#3b82f6',
  negative: '#eab308',
  hostile: '#ef4444',
};

const PLATFORM_COLORS = {
  Twitter: '#38bdf8',
  Reddit: '#fb923c',
  Telegram: '#60a5fa',
  News: '#a78bfa',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const finalLabel = typeof label === 'object' ? label.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : label;
    return (
      <div className="bg-slate-900/80 p-2 border border-slate-700 rounded-md shadow-lg text-sm">
        <p className="label text-gray-300 font-bold">{finalLabel}</p>
        {payload.map((pld: any) => (
          <p key={pld.name} style={{ color: pld.color || pld.fill }} className="intro">{`${pld.name} : ${pld.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main Component ---
const SentimentCharts: React.FC<SentimentChartsProps> = ({ posts, trends }) => {
  const [activeChart, setActiveChart] = useState<ChartType>('timeline');

  // --- Data Memoization ---
  const sentimentDistributionData = useMemo(() => {
    const counts = posts.reduce((acc, post) => {
      acc[post.sentiment] = (acc[post.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<SocialMediaPost['sentiment'], number>);
    const data = Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    return data.length > 0 ? data : [{name: 'No Data', value: 1}];
  }, [posts]);

  const threatScoreData = useMemo(() => {
    const tiers: Record<string, number> = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    posts.forEach(post => {
      if (post.threatScore <= 25) tiers['0-25']++;
      else if (post.threatScore <= 50) tiers['26-50']++;
      else if (post.threatScore <= 75) tiers['51-75']++;
      else tiers['76-100']++;
    });
    return Object.entries(tiers).map(([name, count]) => ({ name, count }));
  }, [posts]);

  const platformActivityData = useMemo(() => {
    const counts = posts.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {} as Record<SocialMediaPost['platform'], number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [posts]);

  // --- Render Logic ---
  const renderChart = () => {
    if (posts.length === 0 && activeChart !== 'timeline') {
        return <div className="flex items-center justify-center h-full text-gray-500">No data for selected filters.</div>;
    }

    switch (activeChart) {
      case 'timeline':
        return <TimelineChart data={trends} />;
      case 'distribution':
        return <DistributionChart data={sentimentDistributionData} />;
      case 'threatTiers':
        return <ThreatTiersChart data={threatScoreData} />;
      case 'platform':
        return <PlatformActivityChart data={platformActivityData} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Sentiment Analysis</h3>
        <div className="flex items-center bg-slate-900/50 rounded-lg p-1 text-xs">
            <ChartToggle label="Timeline" type="timeline" active={activeChart} onClick={setActiveChart} />
            <ChartToggle label="Distribution" type="distribution" active={activeChart} onClick={setActiveChart} />
            <ChartToggle label="Threats" type="threatTiers" active={activeChart} onClick={setActiveChart} />
            <ChartToggle label="Platforms" type="platform" active={activeChart} onClick={setActiveChart} />
        </div>
      </div>
      <div className="flex-grow min-h-0">{renderChart()}</div>
    </div>
  );
};

// --- Subcomponents for Charts ---

const ChartToggle: React.FC<{label: string, type: ChartType, active: ChartType, onClick: (type: ChartType) => void}> = ({ label, type, active, onClick }) => (
    <button onClick={() => onClick(type)} className={`px-3 py-1 font-bold rounded-md transition-colors ${active === type ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-slate-700'}`}>
        {label}
    </button>
);

const TimelineChart: React.FC<{data: SentimentTrend[]}> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <defs>
                <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={SENTIMENT_COLORS.positive} stopOpacity={0.8}/><stop offset="95%" stopColor={SENTIMENT_COLORS.positive} stopOpacity={0}/></linearGradient>
                <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={SENTIMENT_COLORS.negative} stopOpacity={0.8}/><stop offset="95%" stopColor={SENTIMENT_COLORS.negative} stopOpacity={0}/></linearGradient>
                <linearGradient id="colorHostile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={SENTIMENT_COLORS.hostile} stopOpacity={0.8}/><stop offset="95%" stopColor={SENTIMENT_COLORS.hostile} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={(time: Date) => time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{fontSize: '12px'}} />
            <Area type="monotone" dataKey="positiveCount" name="Positive" stroke={SENTIMENT_COLORS.positive} fillOpacity={1} fill="url(#colorPositive)" />
            <Area type="monotone" dataKey="negativeCount" name="Negative" stroke={SENTIMENT_COLORS.negative} fillOpacity={1} fill="url(#colorNegative)" />
            <Area type="monotone" dataKey="hostileCount" name="Hostile" stroke={SENTIMENT_COLORS.hostile} fillOpacity={1} fill="url(#colorHostile)" />
        </AreaChart>
    </ResponsiveContainer>
);

const DistributionChart: React.FC<{data: {name: string, value: number}[]}> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} fill="#8884d8" paddingAngle={5}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name.toLowerCase() as keyof typeof SENTIMENT_COLORS] || '#8884d8'} />
                ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{fontSize: '12px'}} />
        </PieChart>
    </ResponsiveContainer>
);

const ThreatTiersChart: React.FC<{data: {name: string, count: number}[]}> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Post Count">
                {data.map((entry, index) => {
                    const colors = ['#10b981', '#eab308', '#f59e0b', '#ef4444'];
                    return <Cell key={`cell-${index}`} fill={colors[index]} />;
                })}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

const PlatformActivityChart: React.FC<{data: {name: string, count: number}[]}> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Post Count">
                 {data.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={PLATFORM_COLORS[entry.name as keyof typeof PLATFORM_COLORS]} />
                ))}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

export default SentimentCharts;
