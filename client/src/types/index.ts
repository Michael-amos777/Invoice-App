export interface SocialLinks {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  github?: string;
  website?: string;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  logo_url: string | null;
  show_name_with_logo?: boolean | number;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  social_links: string | SocialLinks;
  primary_color: string;
  secondary_color: string;
  preferred_font: string;
  default_currency: string;
  default_payment_terms: string;
  default_notes: string;
  default_tax_rate: number;
  default_tax_name: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_account_type: string;
  bank_routing_number: string;
  bank_swift_bic: string;
  bank_iban: string;
  bank_address?: string;
  other_payment_methods: string;
  invoice_prefix: string;
  next_invoice_number: number;
  selected_template: 'fauget' | 'studio';
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  company_name?: string;
  email?: string;
  billing_address?: string;
  phone?: string;
  notes?: string;
  total_invoices?: number;
  total_billed?: number;
  total_paid?: number;
  balance_due?: number;
  created_at?: string;
  updated_at?: string;
  invoices?: Invoice[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_type: 'fixed' | 'hourly';
  description: string;
  project?: string;
  rate: number;
  hours?: number;
  minutes?: number;
  quantity?: number;
  total: number;
  order_index?: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_note?: string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  client_id?: string;
  client_snapshot?: Client | null;
  business_snapshot?: Partial<BusinessProfile> | null;
  project_name?: string;
  description?: string;
  currency: string;
  purchase_order?: string;
  subtotal: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_name: string;
  tax_rate: number;
  tax_amount: number;
  total_due: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  terms?: string;
  template: 'fauget' | 'studio';
  created_at?: string;
  updated_at?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface DashboardStats {
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  statusBreakdown: {
    draft: number;
    sent: number;
    partially_paid: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  recentInvoices: Invoice[];
}
