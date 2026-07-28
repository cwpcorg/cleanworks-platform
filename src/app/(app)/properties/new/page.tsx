'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ChecklistTemplate } from '@/lib/types';

export default function NewPropertyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('checklist_templates').select('*').order('name').then(({ data }) => {
      setTemplates((data as ChecklistTemplate[]) ?? []);
    });
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    // company_id is resolved server-side from the logged-in user's profile
    // via the profiles table + RLS — see README for the auth setup step.
    const { data: profile } = await supabase.from('profiles').select('company_id').single();

    const templateId = form.get('checklist_template_id');

    const { error: insertError } = await supabase.from('properties').insert({
      company_id: profile?.company_id,
      name: form.get('name'),
      address: form.get('address'),
      ical_url: form.get('ical_url'),
      host_name: form.get('host_name'),
      host_email: form.get('host_email'),
      report_frequency: form.get('report_frequency'),
      checklist_template_id: templateId ? templateId : null,
      active: true,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push('/properties');
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <p className="font-tag text-xs text-graphite uppercase tracking-wider">New Entry</p>
      <h1 className="text-3xl font-bold mb-8">Add Property</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Property name" name="name" required />
        <Field label="Address" name="address" />
        <Field
          label="iCal URL"
          name="ical_url"
          placeholder="https://www.airbnb.com/calendar/ical/..."
          hint="Airbnb: Calendar → Availability → Export Calendar. VRBO: Calendar → Import/Export."
        />
        <Field label="Host name" name="host_name" />
        <Field label="Host email" name="host_email" type="email" />

        <div>
          <label className="block text-sm font-medium mb-1">Report frequency</label>
          <select name="report_frequency" className="w-full border border-line rounded-tag px-3 py-2 bg-white">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Checklist template</label>
          <select name="checklist_template_id" className="w-full border border-line rounded-tag px-3 py-2 bg-white">
            <option value="">None yet</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {templates.length === 0 && (
            <p className="text-xs text-graphite mt-1">
              No templates yet — <a href="/checklist-templates/new" className="underline">create one</a> first if you want cleans on this property to use a checklist.
            </p>
          )}
        </div>

        {error && <p className="text-attention text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Add Property'}
        </button>
      </form>
    </main>
  );
}

function Field({
  label, name, type = 'text', required = false, placeholder, hint,
}: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full border border-line rounded-tag px-3 py-2 bg-white"
      />
      {hint && <p className="text-xs text-graphite mt-1">{hint}</p>}
    </div>
  );
}
