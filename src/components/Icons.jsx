export function CheckIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor">
      <polygon points="2,1 9,5 2,9" />
    </svg>
  );
}

export function PlusIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  );
}

export function ChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3,5 7,9 11,5" />
    </svg>
  );
}

export function ChevronUp({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3,9 7,5 11,9" />
    </svg>
  );
}

export function ChevronLeft({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9,3 5,7 9,11" />
    </svg>
  );
}

export function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <polyline points="2,3.5 12,3.5" />
      <path d="M5,3.5V2.5a.5.5,0,0,1,.5-.5h3a.5.5,0,0,1,.5.5v1" />
      <path d="M3,3.5l.7,8a.5.5,0,0,0,.5.5h5.6a.5.5,0,0,0,.5-.5l.7-8" />
    </svg>
  );
}

export function EditIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5,2.5l2,2L5,11H3V9Z" />
      <line x1="8" y1="4" x2="10" y2="6" />
    </svg>
  );
}

export function EyeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M1,7 C2.5,4 5,2.5 7,2.5 C9,2.5 11.5,4 13,7 C11.5,10 9,11.5 7,11.5 C5,11.5 2.5,10 1,7Z" />
      <circle cx="7" cy="7" r="2" />
    </svg>
  );
}

export function CopyIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="5" y="5" width="7" height="7" rx="1.5" />
      <path d="M2,9V2.5A.5.5,0,0,1,2.5,2H9" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3,9 7,5 11,9" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3,5 7,9 11,5" />
    </svg>
  );
}

export function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="3" x2="11" y2="11" />
      <line x1="11" y1="3" x2="3" y2="11" />
    </svg>
  );
}

export function GymIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1" y="6" width="3" height="4" rx="1" />
      <rect x="12" y="6" width="3" height="4" rx="1" />
      <rect x="4" y="4" width="2" height="8" rx="1" />
      <rect x="10" y="4" width="2" height="8" rx="1" />
      <line x1="6" y1="8" x2="10" y2="8" />
    </svg>
  );
}

export function CalendarIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1" y="2" width="12" height="11" rx="1.5" />
      <line x1="1" y1="5.5" x2="13" y2="5.5" />
      <line x1="4" y1="1" x2="4" y2="3.5" />
      <line x1="10" y1="1" x2="10" y2="3.5" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="7" />
      <polyline points="4.5,8.5 6.5,10.5 11.5,5.5" />
    </svg>
  );
}

export function FireIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7,13 C4.5,13 2.5,11 2.5,8.5 C2.5,6 4,4.5 4,4.5 C4,6 5,7 5,7 C5,5 6,2 8.5,1 C8.5,2.5 9.5,3.5 10,5 C10.5,6 10.5,7 10,8 C11,7 11,5 11,5 C12,6.5 11.5,9 11,10.5 C10.5,12 9,13 7,13Z" />
    </svg>
  );
}

export function BodyIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="2.5" r="1.5" />
      <line x1="7" y1="4" x2="7" y2="8.5" />
      <polyline points="4,6 7,7.5 10,6" />
      <line x1="7" y1="8.5" x2="5" y2="13" />
      <line x1="7" y1="8.5" x2="9" y2="13" />
    </svg>
  );
}

export function BallIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="6" />
      <path d="M7,1 L7,13" />
      <path d="M4,2.5 C5,5 5,9 4,11.5" />
      <path d="M10,2.5 C9,5 9,9 10,11.5" />
      <line x1="1.5" y1="5" x2="12.5" y2="5" />
      <line x1="1.5" y1="9" x2="12.5" y2="9" />
    </svg>
  );
}

export function StarIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7,1.5 8.5,5.5 13,5.5 9.5,8.5 11,12.5 7,9.5 3,12.5 4.5,8.5 1,5.5 5.5,5.5" />
    </svg>
  );
}
