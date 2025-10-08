export interface SocialMediaPost {
  id: string;
  platform: 'Twitter' | 'Reddit' | 'Telegram' | 'News';
  content: string;
  author: string;
  timestamp: Date;
  location: { lat: number; lng: number; name: string } | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'hostile';
  sentimentScore: number; // -1 to 1
  keywords: string[];
  threatScore: number; // 0-100
  category: 'informational' | 'warning' | 'critical';
  isVerified: boolean;
  engagement: { likes: number; shares: number; comments: number };
}

export interface ThreatAlert {
  id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number; name: string };
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  threatScore: number; // 0-100
  relatedPosts: string[]; // array of post IDs
  detectedAt: Date;
  status: 'active' | 'monitoring' | 'resolved';
  category: string; // e.g., "Coordinated Movement", "Smuggling Activity"
}

export interface SentimentTrend {
  timestamp: Date;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  hostileCount: number;
  totalPosts: number;
}

export interface FilterOptions {
  platforms: ('Twitter' | 'Reddit' | 'Telegram' | 'News')[];
  sentiments: ('positive' | 'neutral' | 'negative' | 'hostile')[];
  threatLevels: ('low' | 'medium' | 'high' | 'critical')[];
  dateRange: { start: Date | null; end: Date | null };
  searchQuery: string;
  location: string;
}