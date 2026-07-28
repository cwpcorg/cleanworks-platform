'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { ChecklistTemplate, Property } from '@/lib/types';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('properties').select('*').order('name'),
      supabase.from('checklist_templates').select('*').order('name'),
    ]).then(([propertiesRes, templatesRes]) => {
      setProperties((propertiesRes.data as Property[]) ?? []);
      setTemplates((templatesRes.data as ChecklistTemplate[]) ?? []);
      setLoading(false);
    });
  }, []);

  async function assignTemplate(propertyId: string, templateId: string) {
    const supabase = createClient();
    setProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, checklist_template_id: templateId || null } : p))
    );
    await supabase
      .from('properties')
      .update({ checklist_template_id: templateId || null })
      .eq('id', propertyId);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-tag text-xs text-graphite uppercase tracking-wider">Roster</p>
          <h1 className="text-3xl font-bold">Properties</h1>
        </div>
        <Link href="/properties/new" className="btn-primary">+ Add Property</Link>
      </header>

      {loading && <p className="text-graphite">Loading…</p>}

      <div className="space-y-4">
        {properties.map((p) => (
          <div key={p.id} className="tag-card flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="text-sm text-graphite">{p.address}</p>
              {p.host_email && (
                <p className="text-sm text-graphite mt-1">Reports to: {p.host_email} · {p.report_frequency}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={p.checklist_template_id ?? ''}
                onChange={(e) => assignTemplate(p.id, e.target.value)}
                className="text-sm border border-line rounded-tag px-2 py-1.5 bg-white"
              >
                <option value="">No checklist</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <span className={`stamp ${p.active ? 'stamp-clean' : 'stamp-attention'}`}>
                {p.active ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        ))}
        {!loading && properties.length === 0 && (
          <p className="text-graphite italic">No properties yet — add your first one.</p>
        )}
      </div>
    </main>
  );
}
