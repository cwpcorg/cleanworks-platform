import Link from 'next/link';
import StatusBadge from './StatusBadge';
import type { Job } from '@/lib/types';

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`} className="tag-card block hover:-translate-y-0.5 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-tag text-xs text-graphite">#{job.id.slice(0, 8)}</p>
          <h3 className="text-lg font-semibold mt-0.5">{job.properties?.name ?? 'Property'}</h3>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-graphite">
        <span>Checkout {job.checkout_date}</span>
        <span>Clean {job.scheduled_date}</span>
      </div>
    </Link>
  );
}
