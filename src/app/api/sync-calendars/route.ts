import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server-admin';
import { parseICS } from '@/lib/ical';

export const dynamic = 'force-dynamic';

// Vercel Cron hits this on a schedule (see vercel.json). Protect it with a
// shared secret so it can't be triggered by anyone who finds the URL.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .eq('active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let created = 0;
  const failures: string[] = [];

  for (const property of properties ?? []) {
    if (!property.ical_url) continue;

    try {
      const res = await fetch(property.ical_url);
      const icsText = await res.text();
      const events = parseICS(icsText);

      for (const ev of events) {
        const { error: insertError } = await supabase
          .from('jobs')
          .upsert(
            {
              company_id: property.company_id,
              property_id: property.id,
              checkout_date: ev.end,
              scheduled_date: ev.end,
              status: 'scheduled',
              checklist_template_id: property.checklist_template_id,
            },
            { onConflict: 'property_id,checkout_date', ignoreDuplicates: true }
          );
        if (!insertError) created += 1;
      }
    } catch (e) {
      failures.push(`${property.name}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ created, failures });
}
