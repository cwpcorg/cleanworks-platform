import { createClient } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';
import type { Job, ChecklistItem, JobChecklistResponse, JobPhoto } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('*, properties(*)')
    .eq('id', params.id)
    .single();

  const { data: items } = job?.checklist_template_id
    ? await supabase
        .from('checklist_items')
        .select('*')
        .eq('template_id', job.checklist_template_id)
        .order('sort_order')
    : { data: [] as ChecklistItem[] };

  const { data: responses } = await supabase
    .from('job_checklist_responses')
    .select('*')
    .eq('job_id', params.id);

  const { data: photos } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', params.id)
    .order('created_at', { ascending: false });

  // job-photos is a private bucket, so display requires short-lived signed
  // URLs rather than public ones.
  let photoUrls: { id: string; url: string; caption: string | null }[] = [];
  if (photos && photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from('job-photos')
      .createSignedUrls(
        (photos as JobPhoto[]).map((p) => p.storage_path),
        3600
      );
    photoUrls = (photos as JobPhoto[]).map((p, i) => ({
      id: p.id,
      url: signed?.[i]?.signedUrl ?? '',
      caption: p.caption,
    })).filter((p) => p.url);
  }

  const responseMap = new Map(
    ((responses as JobChecklistResponse[]) ?? []).map((r) => [r.checklist_item_id, r.completed])
  );

  if (!job) {
    return <main className="max-w-2xl mx-auto px-6 py-10">Job not found.</main>;
  }

  const typedJob = job as Job;

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-tag text-xs text-graphite">#{typedJob.id.slice(0, 8)}</p>
          <h1 className="text-3xl font-bold">{typedJob.properties?.name}</h1>
          <p className="text-graphite mt-1">Checkout {typedJob.checkout_date} · Clean {typedJob.scheduled_date}</p>
        </div>
        <StatusBadge status={typedJob.status} />
      </div>

      <a href={`/checklist/${typedJob.id}`} className="btn-primary inline-block mb-8">
        Open Field Checklist →
      </a>

      <section className="tag-card mb-6">
        <h2 className="font-semibold mb-3">Checklist</h2>
        <ul className="space-y-2">
          {((items as ChecklistItem[]) ?? []).map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className={responseMap.get(item.id) ? 'text-clean' : 'text-graphite'}>
                {responseMap.get(item.id) ? '✓' : '○'}
              </span>
              {item.label}
            </li>
          ))}
          {(!items || items.length === 0) && (
            <p className="text-graphite italic text-sm">No checklist template assigned yet.</p>
          )}
        </ul>
      </section>

      {photoUrls.length > 0 && (
        <section className="tag-card">
          <h2 className="font-semibold mb-3">Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {photoUrls.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed URLs from a private bucket aren't a fit for next/image's domain allowlist
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-tag overflow-hidden bg-line">
                <img src={p.url} alt={p.caption ?? 'Job photo'} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
