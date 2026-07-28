import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';

const FREQUENCY_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: properties } = await supabase.from('properties').select('*').eq('active', true);
  let sent = 0;

  for (const property of properties ?? []) {
    if (!property.report_frequency || !property.host_email) continue;

    const { data: lastReport } = await supabase
      .from('report_log')
      .select('sent_at')
      .eq('property_id', property.id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const since = lastReport ? new Date(lastReport.sent_at) : new Date(0);
    const dueDays = FREQUENCY_DAYS[property.report_frequency];
    const daysSince = (Date.now() - since.getTime()) / 86_400_000;
    if (daysSince < dueDays) continue;

    const { data: completedJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('property_id', property.id)
      .eq('status', 'completed')
      .gt('scheduled_date', since.toISOString().slice(0, 10));

    if (!completedJobs || completedJobs.length === 0) continue;

    const html = buildReportHtml(property.name, property.host_name, completedJobs);
    const recipients = [process.env.OWNER_EMAIL!, property.host_email].filter(Boolean);

    await resend.emails.send({
      from: 'CleanWorks Pro <reports@cleanworksprocleaning.com>',
      to: recipients,
      subject: `CleanWorks Pro Report: ${property.name}`,
      html,
    });

    await supabase.from('report_log').insert({ property_id: property.id });
    sent += 1;
  }

  return NextResponse.json({ sent });
}

function buildReportHtml(propertyName: string, hostName: string | null, jobs: any[]): string {
  const rows = jobs
    .map((j) => `<tr><td style="padding:8px 0;border-top:1px solid #DEDDD3;">${j.scheduled_date}</td></tr>`)
    .join('');

  return `
    <div style="font-family: sans-serif; color: #1C1E1B;">
      <h2>Cleaning Report: ${propertyName}</h2>
      <p>Hi ${hostName ?? ''}, here's a summary of cleans completed since your last report.</p>
      <table style="width:100%; border-collapse:collapse;">${rows}</table>
    </div>
  `;
}
