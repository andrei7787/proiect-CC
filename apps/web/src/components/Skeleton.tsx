import React from 'react';
import './Skeleton.css';

type SkeletonVariant = 'text' | 'card' | 'stat-card';

interface SkeletonBaseProps {
  variant?: SkeletonVariant;
  className?: string;
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

interface SkeletonCardProps {
  className?: string;
}

interface SkeletonStatCardProps {
  className?: string;
}

const SkeletonBase: React.FC<SkeletonBaseProps> = ({ variant = 'text', className = '' }) => {
  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      aria-hidden="true"
      role="presentation"
    />
  );
};

const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className = '' }) => {
  const widths = ['100%', '92%', '85%', '97%', '78%', '90%'];
  return (
    <div className={`skeleton-text-group ${className}`} aria-hidden="true" role="presentation">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton--text-line"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
};

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => {
  return (
    <div className={`skeleton-card ${className}`} aria-hidden="true" role="presentation">
      <div className="skeleton skeleton--card-header" />
      <div className="skeleton skeleton--card-body" />
      <div className="skeleton skeleton--card-footer" />
    </div>
  );
};

const SkeletonStatCard: React.FC<SkeletonStatCardProps> = ({ className = '' }) => {
  return (
    <div className={`skeleton-stat-card ${className}`} aria-hidden="true" role="presentation">
      <div className="skeleton skeleton--stat-icon" />
      <div className="skeleton skeleton--stat-value" />
      <div className="skeleton skeleton--stat-label" />
    </div>
  );
};

type SkeletonComponent = React.FC<SkeletonBaseProps> & {
  Text: typeof SkeletonText;
  Card: typeof SkeletonCard;
  StatCard: typeof SkeletonStatCard;
};

const Skeleton = SkeletonBase as SkeletonComponent;
Skeleton.Text = SkeletonText;
Skeleton.Card = SkeletonCard;
Skeleton.StatCard = SkeletonStatCard;

export { Skeleton };
export type { SkeletonBaseProps, SkeletonTextProps, SkeletonCardProps, SkeletonStatCardProps };
export default Skeleton;
