'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { ChecklistTemplate } from '@/lib/types';

export default function ChecklistTemplatesPage() {
  const [templates, setTemplates] = useState<(ChecklistTemplate & { item_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('checklist_templates')
      .select('*, checklist_items(count)')
      .order('name')
      .then(({ data }) => {
        const rows = (data ?? []).map((t: any) => ({
          ...t,
          item_count: t.checklist_items?.[0]?.count ?? 0,
        }));
        setTemplates(rows);
        setLoading(false);
      });
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-tag text-xs text-graphite uppercase tracking-wider">Field Ops</p>
          <h1 className="text-3xl font-bold">Checklist Templates</h1>
        </div>
        <Link href="/checklist-templates/new" className="btn-primary">+ New Template</Link>
      </header>

      {loading && <p className="text-graphite">Loading…</p>}

      <div className="space-y-4">
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/checklist-templates/${t.id}`}
            className="tag-card flex items-center justify-between hover:-translate-y-0.5 transition block"
          >
            <div>
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="text-sm text-graphite">{t.item_count} item{t.item_count === 1 ? '' : 's'}</p>
            </div>
            <span className="text-graphite">Edit →</span>
          </Link>
        ))}
        {!loading && templates.length === 0 && (
          <p className="text-graphite italic">No checklist templates yet — create your first one.</p>
        )}
      </div>
    </main>
  );
}
