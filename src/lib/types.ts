export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'needs_attention';

export interface Property {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  ical_url: string | null;
  host_name: string | null;
  host_email: string | null;
  report_frequency: 'weekly' | 'biweekly' | 'monthly' | null;
  checklist_template_id: string | null;
  active: boolean;
}

export interface Job {
  id: string;
  company_id: string;
  property_id: string;
  checkout_date: string;
  scheduled_date: string;
  status: JobStatus;
  checklist_template_id: string | null;
  notes: string | null;
  properties?: Property;
}

export interface ChecklistItem {
  id: string;
  template_id: string;
  label: string;
  sort_order: number;
}

export interface JobChecklistResponse {
  id: string;
  job_id: string;
  checklist_item_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}
