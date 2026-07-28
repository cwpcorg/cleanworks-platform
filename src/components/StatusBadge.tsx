import type { JobStatus } from '@/lib/types';

const STAMP_MAP: Record<JobStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'stamp-progress' },
  in_progress: { label: 'In Progress', className: 'stamp-progress' },
  completed: { label: 'Clean', className: 'stamp-clean' },
  needs_attention: { label: 'Needs Attention', className: 'stamp-attention' },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const { label, className } = STAMP_MAP[status];
  return <span className={`stamp ${className}`}>{label}</span>;
}
