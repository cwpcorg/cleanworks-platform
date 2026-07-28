import { createClient } from '@/lib/supabase/server';
import JobCard from '@/components/JobCard';
import type { Job, JobStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getJobs(): Promise<Job[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*, properties(*)')
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return data as Job[];
}

const COLUMNS: { status: JobStatus; title: string }[] = [
  { status: 'needs_attention', title: 'Needs Attention' },
  { status: 'scheduled', title: 'Scheduled' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'completed', title: 'Clean' },
];

export default async function DashboardPage() {
  const jobs = await getJobs();

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-tag text-xs text-graphite uppercase tracking-wider">Dispatch Board</p>
          <h1 className="text-3xl font-bold">CleanWorks Pro</h1>
        </div>
        <a href="/properties" className="btn-primary">Manage Properties</a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {COLUMNS.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col.status);
          return (
            <div key={col.status}>
              <h2 className="font-tag text-xs uppercase tracking-wider text-graphite mb-3">
                {col.title} · {colJobs.length}
              </h2>
              <div className="space-y-4">
                {colJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                {colJobs.length === 0 && (
                  <p className="text-sm text-graphite italic">Nothing here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
