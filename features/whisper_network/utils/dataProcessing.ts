import { SocialMediaPost, SentimentTrend } from '../types';

/**
 * Calculates the percentage distribution of sentiments across a list of posts.
 */
export const calculateSentimentDistribution = (posts: SocialMediaPost[]): { positive: number; neutral: number; negative: number; hostile: number } => {
  if (!posts.length) {
    return { positive: 0, neutral: 0, negative: 0, hostile: 0 };
  }

  const counts = posts.reduce((acc, post) => {
    acc[post.sentiment]++;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0, hostile: 0 });

  const total = posts.length;
  return {
    positive: (counts.positive / total) * 100,
    neutral: (counts.neutral / total) * 100,
    negative: (counts.negative / total) * 100,
    hostile: (counts.hostile / total) * 100,
  };
};

/**
 * Groups posts by location and calculates the average threat score for each.
 */
export const aggregateThreatsByLocation = (posts: SocialMediaPost[]): Array<{ location: string; threatScore: number; postCount: number }> => {
  const locationMap: Record<string, { totalThreat: number; postCount: number }> = {};

  posts.forEach(post => {
    if (post.location?.name) {
      if (!locationMap[post.location.name]) {
        locationMap[post.location.name] = { totalThreat: 0, postCount: 0 };
      }
      locationMap[post.location.name].totalThreat += post.threatScore;
      locationMap[post.location.name].postCount++;
    }
  });

  return Object.entries(locationMap).map(([location, data]) => ({
    location,
    threatScore: data.totalThreat / data.postCount,
    postCount: data.postCount,
  })).sort((a, b) => b.threatScore - a.threatScore);
};

/**
 * A simple pattern detection that finds posts within a time window sharing common keywords.
 */
export const detectPatterns = (posts: SocialMediaPost[], timeWindowHours: number): Array<{ keywords: string[]; posts: SocialMediaPost[]; suspicionLevel: number }> => {
  const keywordMap: Map<string, SocialMediaPost[]> = new Map();

  posts.forEach(post => {
    post.keywords.forEach(keyword => {
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, []);
      }
      keywordMap.get(keyword)!.push(post);
    });
  });

  const patterns: Array<{ keywords: string[]; posts: SocialMediaPost[]; suspicionLevel: number }> = [];
  const timeWindowMs = timeWindowHours * 60 * 60 * 1000;

  keywordMap.forEach((postList, keyword) => {
    if (postList.length < 2) return;

    const sortedPosts = postList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (sortedPosts[sortedPosts.length - 1].timestamp.getTime() - sortedPosts[0].timestamp.getTime() <= timeWindowMs) {
      const avgThreatScore = sortedPosts.reduce((sum, p) => sum + p.threatScore, 0) / sortedPosts.length;
      patterns.push({
        keywords: [keyword],
        posts: sortedPosts,
        suspicionLevel: avgThreatScore * sortedPosts.length,
      });
    }
  });
  
  return patterns.sort((a, b) => b.suspicionLevel - a.suspicionLevel);
};


/**
 * Extracts and counts all keywords, returning the most frequent ones.
 */
export const getTopKeywords = (posts: SocialMediaPost[], limit: number): Array<{ keyword: string; count: number; avgThreatScore: number }> => {
  const keywordStats: Record<string, { count: number; totalThreat: number }> = {};

  posts.forEach(post => {
    post.keywords.forEach(keyword => {
      if (!keywordStats[keyword]) {
        keywordStats[keyword] = { count: 0, totalThreat: 0 };
      }
      keywordStats[keyword].count++;
      keywordStats[keyword].totalThreat += post.threatScore;
    });
  });

  const keywordList = Object.entries(keywordStats).map(([keyword, data]) => ({
    keyword,
    count: data.count,
    avgThreatScore: data.totalThreat / data.count,
  }));

  return keywordList.sort((a, b) => b.count - a.count).slice(0, limit);
};

/**
 * Filters a list of posts to those within a specified date range.
 */
export const filterByTimeRange = (posts: SocialMediaPost[], start: Date, end: Date): SocialMediaPost[] => {
  if (!start || !end) return posts;
  return posts.filter(post => {
    const postTime = post.timestamp.getTime();
    return postTime >= start.getTime() && postTime <= end.getTime();
  });
};

/**
 * Analyzes sentiment trend data to detect significant threat escalation.
 */
export const calculateThreatEscalation = (trends: SentimentTrend[]): { isEscalating: boolean; escalationRate: number; peakTime: Date | null } => {
  if (trends.length < 2) {
    return { isEscalating: false, escalationRate: 0, peakTime: null };
  }
  
  const getThreatMetric = (trend: SentimentTrend) => trend.hostileCount * 2 + trend.negativeCount;
  
  const firstTrend = trends[0];
  const lastTrend = trends[trends.length - 1];

  const firstMetric = getThreatMetric(firstTrend);
  const lastMetric = getThreatMetric(lastTrend);

  const timeDeltaHours = (lastTrend.timestamp.getTime() - firstTrend.timestamp.getTime()) / (1000 * 60 * 60);

  if (timeDeltaHours <= 0) {
      return { isEscalating: false, escalationRate: 0, peakTime: null };
  }

  const escalationRate = (lastMetric - firstMetric) / timeDeltaHours; // change per hour

  let peakTime: Date | null = null;
  let maxHostile = -1;
  trends.forEach(trend => {
      if(trend.hostileCount > maxHostile) {
          maxHostile = trend.hostileCount;
          peakTime = trend.timestamp;
      }
  });

  return {
    isEscalating: escalationRate > 1.5, // Heuristic: rate > 1.5 indicates significant escalation
    escalationRate,
    peakTime,
  };
};