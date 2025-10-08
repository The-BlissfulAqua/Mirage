import { SocialMediaPost, ThreatAlert } from "../types";

/**
 * Formats a date into a relative time string (e.g., "2 hours ago").
 */
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
};

/**
 * Returns a Tailwind CSS text color class based on the threat level.
 */
export const getThreatLevelColor = (level: ThreatAlert['threatLevel']): string => {
  switch (level) {
    case 'low': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'high': return 'text-orange-400';
    case 'critical': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

/**
 * Returns an emoji icon for a given sentiment.
 */
export const getSentimentIcon = (sentiment: SocialMediaPost['sentiment']): string => {
  switch (sentiment) {
    case 'positive': return '😊';
    case 'neutral': return '😐';
    case 'negative': return '😟';
    case 'hostile': return '😠';
    default: return '❔';
  }
};

/**
 * Truncates a string to a maximum length and adds an ellipsis.
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
};