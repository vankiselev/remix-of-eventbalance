-- Create financial_reports table
CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  total_planned_income NUMERIC DEFAULT 0,
  total_planned_expense NUMERIC DEFAULT 0,
  total_actual_income NUMERIC DEFAULT 0,
  total_actual_expense NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create financial_report_items table
CREATE TABLE IF NOT EXISTS public.financial_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES financial_reports(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  planned_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  is_matched BOOLEAN DEFAULT false,
  matched_transaction_ids UUID[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_report_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_reports
CREATE POLICY "Admins and financiers can view financial reports"
ON public.financial_reports
FOR SELECT
USING (
  is_admin_user(auth.uid()) OR 
  has_permission('transactions.view_all'::text) OR
  has_permission('transactions.review'::text)
);

CREATE POLICY "Admins and financiers can create financial reports"
ON public.financial_reports
FOR INSERT
WITH CHECK (
  is_admin_user(auth.uid()) OR 
  has_permission('transactions.view_all'::text) OR
  has_permission('transactions.review'::text)
);

CREATE POLICY "Admins and financiers can update financial reports"
ON public.financial_reports
FOR UPDATE
USING (
  is_admin_user(auth.uid()) OR 
  has_permission('transactions.view_all'::text) OR
  has_permission('transactions.review'::text)
);

CREATE POLICY "Only admins can delete financial reports"
ON public.financial_reports
FOR DELETE
USING (is_admin_user(auth.uid()));

-- RLS policies for financial_report_items
CREATE POLICY "Admins and financiers can view report items"
ON public.financial_report_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM financial_reports fr
    WHERE fr.id = financial_report_items.report_id
    AND (
      is_admin_user(auth.uid()) OR 
      has_permission('transactions.view_all'::text) OR
      has_permission('transactions.review'::text)
    )
  )
);

CREATE POLICY "Admins and financiers can create report items"
ON public.financial_report_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM financial_reports fr
    WHERE fr.id = financial_report_items.report_id
    AND (
      is_admin_user(auth.uid()) OR 
      has_permission('transactions.view_all'::text) OR
      has_permission('transactions.review'::text)
    )
  )
);

CREATE POLICY "Admins and financiers can update report items"
ON public.financial_report_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM financial_reports fr
    WHERE fr.id = financial_report_items.report_id
    AND (
      is_admin_user(auth.uid()) OR 
      has_permission('transactions.view_all'::text) OR
      has_permission('transactions.review'::text)
    )
  )
);

CREATE POLICY "Admins and financiers can delete report items"
ON public.financial_report_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM financial_reports fr
    WHERE fr.id = financial_report_items.report_id
    AND (
      is_admin_user(auth.uid()) OR 
      has_permission('transactions.view_all'::text) OR
      has_permission('transactions.review'::text)
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_financial_reports_created_by ON public.financial_reports(created_by);
CREATE INDEX idx_financial_reports_event_id ON public.financial_reports(event_id);
CREATE INDEX idx_financial_reports_status ON public.financial_reports(status);
CREATE INDEX idx_financial_report_items_report_id ON public.financial_report_items(report_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_report_items;