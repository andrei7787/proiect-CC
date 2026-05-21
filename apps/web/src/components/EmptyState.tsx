import React from 'react';
import './EmptyState.css';

type EmptyStateIcon = 'books' | 'target' | 'calendar' | 'brain' | 'bell';

interface EmptyStateProps {
  icon: EmptyStateIcon;
  title: string;
  description?: string;
  className?: string;
}

const iconMap: Record<EmptyStateIcon, React.ReactNode> = {
  /* ---- Books / Graduation ---- */
  books: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"
        fill="currentColor"
      />
      <path d="M10 9h8v2h-8zm0 3h4v2h-4zm0-6h8v2h-8z" fill="currentColor" opacity="0.6" />
      <path
        d="M17 18l-5-3-5 3V7l5 3 5-3v11z"
        fill="currentColor"
        opacity="0.3"
        transform="translate(3, 0) scale(0.95)"
      />
    </svg>
  ),

  /* ---- Target / Dart ---- */
  target: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),

  /* ---- Calendar ---- */
  calendar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),

  /* ---- Brain / AI Circuit ---- */
  brain: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2a4 4 0 00-4 4c0 .74.2 1.43.55 2.03L6 10l2.55 1.97A4 4 0 008 14a4 4 0 004 4 4 4 0 004-4 4 4 0 00-.55-2.03L18 10l-2.55-1.97A4 4 0 0016 6a4 4 0 00-4-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="8" r="1.2" fill="currentColor" opacity="0.7" />
      <circle cx="15" cy="8" r="1.2" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="13" r="1.2" fill="currentColor" opacity="0.7" />
      <path d="M7 20l2-3M17 20l-2-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 18v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  /* ---- Bell / Notification ---- */
  bell: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="4" r="1.5" fill="currentColor" opacity="0.8" />
    </svg>
  ),
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`} role="status">
      <div className="empty-state__icon" aria-hidden="true">
        {iconMap[icon]}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
    </div>
  );
};

export { EmptyState };
export type { EmptyStateProps, EmptyStateIcon };
export default EmptyState;
