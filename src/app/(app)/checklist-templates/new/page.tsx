'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewChecklistTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { data: profile } = await supabase.from('profiles').select('company_id').single();

    const { data, error: insertError } = await supabase
      .from('checklist_templates')
      .insert({ company_id: profile?.company_id, name: form.get('name') })
      .select()
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Something went wrong.');
      return;
    }
    router.push(`/checklist-templates/${data.id}`);
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <p className="font-tag text-xs text-graphite uppercase tracking-wider">New Entry</p>
      <h1 className="text-3xl font-bold mb-8">New Checklist Template</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Template name</label>
          <input
            name="name"
            required
            placeholder="e.g. Standard Turnover Clean"
            className="w-full border border-line rounded-tag px-3 py-2 bg-white"
          />
        </div>

        {error && <p className="text-attention text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Creating…' : 'Create & Add Items →'}
        </button>
      </form>
    </main>
  );
}
