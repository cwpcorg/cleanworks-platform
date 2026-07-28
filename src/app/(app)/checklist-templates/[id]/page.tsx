'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ChecklistItem, ChecklistTemplate } from '@/lib/types';

export default function ChecklistTemplateEditorPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const supabase = createClient();

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [name, setName] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('checklist_templates').select('*').eq('id', id).single();
      const { data: i } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('template_id', id)
        .order('sort_order');
      setTemplate(t);
      setName(t?.name ?? '');
      setItems((i as ChecklistItem[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function saveName() {
    if (!template || name === template.name) return;
    const { error: updateError } = await supabase
      .from('checklist_templates')
      .update({ name })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTemplate({ ...template, name });
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    const label = newItemLabel.trim();
    if (!label) return;

    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data, error: insertError } = await supabase
      .from('checklist_items')
      .insert({ template_id: id, label, sort_order: nextOrder })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add item.');
      return;
    }
    setItems([...items, data as ChecklistItem]);
    setNewItemLabel('');
  }

  async function deleteItem(itemId: string) {
    const { error: deleteError } = await supabase.from('checklist_items').delete().eq('id', itemId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems(items.filter((i) => i.id !== itemId));
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    const a = reordered[index];
    const b = reordered[targetIndex];
    const [aOrder, bOrder] = [a.sort_order, b.sort_order];

    setItems(reordered);
    await Promise.all([
      supabase.from('checklist_items').update({ sort_order: bOrder }).eq('id', a.id),
      supabase.from('checklist_items').update({ sort_order: aOrder }).eq('id', b.id),
    ]);
  }

  async function deleteTemplate() {
    if (!confirm('Delete this checklist template? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('checklist_templates').delete().eq('id', id);
    if (deleteError) {
      setError('Could not delete — this template is still assigned to one or more properties. Reassign those first.');
      return;
    }
    router.push('/checklist-templates');
  }

  if (loading) return <main className="max-w-2xl mx-auto px-6 py-10 text-graphite">Loading…</main>;
  if (!template) return <main className="max-w-2xl mx-auto px-6 py-10">Template not found.</main>;

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <p className="font-tag text-xs text-graphite uppercase tracking-wider mb-1">Checklist Template</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        className="text-3xl font-bold w-full bg-transparent border-b-2 border-transparent focus:border-line outline-none mb-8 -ml-0.5 px-0.5"
      />

      {error && <p className="text-attention text-sm mb-4">{error}</p>}

      <section className="tag-card mb-6">
        <h2 className="font-semibold mb-3">Items</h2>
        <ul className="space-y-2 mb-4">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2 border border-line rounded-tag px-3 py-2 bg-white">
              <div className="flex flex-col -my-1 mr-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="text-graphite disabled:opacity-30 leading-none text-xs px-1"
                  aria-label="Move up"
                >▲</button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="text-graphite disabled:opacity-30 leading-none text-xs px-1"
                  aria-label="Move down"
                >▼</button>
              </div>
              <span className="flex-1 text-sm">{item.label}</span>
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                className="text-attention text-sm px-2"
                aria-label={`Delete ${item.label}`}
              >Remove</button>
            </li>
          ))}
          {items.length === 0 && (
            <p className="text-graphite italic text-sm">No items yet — add the first one below.</p>
          )}
        </ul>

        <form onSubmit={addItem} className="flex gap-2">
          <input
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            placeholder="e.g. Wipe down all counters"
            className="flex-1 border border-line rounded-tag px-3 py-2 bg-white text-sm"
          />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </section>

      <button onClick={deleteTemplate} className="text-attention text-sm">
        Delete this template
      </button>
    </main>
  );
}
