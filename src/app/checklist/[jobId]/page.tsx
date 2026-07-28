'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { queueAction, flushQueue } from '@/lib/offline-queue';
import type { ChecklistItem } from '@/lib/types';

const CACHE_KEY_PREFIX = 'cleanworks-checklist-cache-';

interface CachedChecklist {
  propertyName: string;
  items: ChecklistItem[];
  completed: Record<string, boolean>;
}

export default function FieldChecklistPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const [data, setData] = useState<CachedChecklist | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [note, setNote] = useState('');

  const supabase = createClient();

  // Load fresh if online, otherwise fall back to the last cached copy so the
  // checklist still opens with zero signal.
  useEffect(() => {
    setIsOnline(navigator.onLine);

    async function load() {
      try {
        const { data: job } = await supabase
          .from('jobs')
          .select('*, properties(name)')
          .eq('id', jobId)
          .single();

        const { data: items } = job?.checklist_template_id
          ? await supabase
              .from('checklist_items')
              .select('*')
              .eq('template_id', job.checklist_template_id)
              .order('sort_order')
          : { data: [] };

        const { data: responses } = await supabase
          .from('job_checklist_responses')
          .select('*')
          .eq('job_id', jobId);

        const completed: Record<string, boolean> = {};
        (responses ?? []).forEach((r: any) => { completed[r.checklist_item_id] = r.completed; });

        const cached: CachedChecklist = {
          propertyName: job?.properties?.name ?? 'Property',
          items: (items as ChecklistItem[]) ?? [],
          completed,
        };
        setData(cached);
        localStorage.setItem(CACHE_KEY_PREFIX + jobId, JSON.stringify(cached));
      } catch {
        const cached = localStorage.getItem(CACHE_KEY_PREFIX + jobId);
        if (cached) setData(JSON.parse(cached));
      }
    }
    load();
  }, [jobId]);

  const sync = useCallback(() => {
    flushQueue({
      'checklist-toggle': async (action) => {
        const { checklistItemId, completed } = action.payload as { checklistItemId: string; completed: boolean };
        await supabase.from('job_checklist_responses').upsert({
          job_id: action.jobId,
          checklist_item_id: checklistItemId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        }, { onConflict: 'job_id,checklist_item_id' });
      },
      'photo-upload': async (action) => {
        const { fileName, base64 } = action.payload as { fileName: string; base64: string };
        const blob = await (await fetch(base64)).blob();
        const path = `${action.jobId}/${Date.now()}-${fileName}`;
        await supabase.storage.from('job-photos').upload(path, blob);
        await supabase.from('job_photos').insert({ job_id: action.jobId, storage_path: path });
      },
      'job-note': async (action) => {
        const { text } = action.payload as { text: string };
        await supabase.from('jobs').update({ notes: text }).eq('id', action.jobId);
      },
    });
  }, [jobId]);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); sync(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [sync]);

  async function toggleItem(itemId: string) {
    if (!data) return;
    const newVal = !data.completed[itemId];
    const updated = { ...data, completed: { ...data.completed, [itemId]: newVal } };
    setData(updated);
    localStorage.setItem(CACHE_KEY_PREFIX + jobId, JSON.stringify(updated));

    await queueAction({
      type: 'checklist-toggle',
      jobId,
      payload: { checklistItemId: itemId, completed: newVal },
    });
    if (navigator.onLine) sync();
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await queueAction({
        type: 'photo-upload',
        jobId,
        payload: { fileName: file.name, base64: reader.result as string },
      });
      if (navigator.onLine) sync();
    };
    reader.readAsDataURL(file);
  }

  if (!data) return <main className="p-6 text-graphite">Loading checklist…</main>;

  const doneCount = Object.values(data.completed).filter(Boolean).length;

  return (
    <main className="max-w-lg mx-auto pb-32">
      <header className="sticky top-0 bg-paper border-b border-line px-5 py-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-tag text-xs text-graphite uppercase tracking-wider">Field Checklist</p>
            <h1 className="text-xl font-bold">{data.propertyName}</h1>
          </div>
          <span className={`stamp ${isOnline ? 'stamp-clean' : 'stamp-attention'}`}>
            {isOnline ? 'Online' : 'Offline — saving locally'}
          </span>
        </div>
        <p className="text-sm text-graphite mt-1">{doneCount}/{data.items.length} complete</p>
      </header>

      <div className="px-5 py-4 space-y-3">
        {data.items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`w-full text-left flex items-center gap-3 p-4 rounded-tag border-2 transition ${
              data.completed[item.id] ? 'border-clean bg-clean/5' : 'border-line bg-white'
            }`}
          >
            <span className={`w-6 h-6 shrink-0 rounded-tag border-2 flex items-center justify-center ${
              data.completed[item.id] ? 'border-clean bg-clean text-white' : 'border-line'
            }`}>
              {data.completed[item.id] ? '✓' : ''}
            </span>
            <span className="text-base">{item.label}</span>
          </button>
        ))}

        <div className="pt-4">
          <label className="block text-sm font-medium mb-2">Add photo proof</label>
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="text-sm" />
        </div>

        <div className="pt-4">
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={async () => {
              await queueAction({ type: 'job-note', jobId, payload: { text: note } });
              if (navigator.onLine) sync();
            }}
            className="w-full border border-line rounded-tag px-3 py-2 bg-white"
            rows={3}
            placeholder="Anything the host or owner should know…"
          />
        </div>
      </div>

      {/* Thumb-zone action bar — this is the field view, so the primary
          action lives where a hand holding a phone naturally rests. */}
      <div className="fixed bottom-0 inset-x-0 bg-paper border-t border-line p-4">
        <div className="max-w-lg mx-auto">
          <button
            className="btn-primary w-full"
            onClick={async () => {
              await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId);
              if (navigator.onLine) sync();
              alert('Job marked complete.');
            }}
          >
            Mark Job Complete
          </button>
        </div>
      </div>
    </main>
  );
}
