-- Create warehouse_inventories table
CREATE TABLE IF NOT EXISTS warehouse_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT valid_status CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled'))
);

-- Create warehouse_inventory_items table
CREATE TABLE IF NOT EXISTS warehouse_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES warehouse_inventories(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES warehouse_items(id),
  location_id UUID REFERENCES warehouse_locations(id),
  expected_quantity NUMERIC NOT NULL DEFAULT 0,
  actual_quantity NUMERIC,
  difference NUMERIC GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
  scanned_at TIMESTAMP WITH TIME ZONE,
  scanned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(inventory_id, item_id, location_id)
);

-- Enable RLS
ALTER TABLE warehouse_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warehouse_inventories
CREATE POLICY "Active users can view inventories"
  ON warehouse_inventories FOR SELECT
  USING (is_active_user());

CREATE POLICY "Users with permission can manage inventories"
  ON warehouse_inventories FOR ALL
  USING (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()));

-- RLS Policies for warehouse_inventory_items
CREATE POLICY "Active users can view inventory items"
  ON warehouse_inventory_items FOR SELECT
  USING (is_active_user());

CREATE POLICY "Users with permission can manage inventory items"
  ON warehouse_inventory_items FOR ALL
  USING (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()))
  WITH CHECK (has_permission('warehouse.manage_items') OR is_admin_user(auth.uid()));

-- Create indexes
CREATE INDEX idx_warehouse_inventories_status ON warehouse_inventories(status);
CREATE INDEX idx_warehouse_inventories_created_by ON warehouse_inventories(created_by);
CREATE INDEX idx_warehouse_inventory_items_inventory_id ON warehouse_inventory_items(inventory_id);
CREATE INDEX idx_warehouse_inventory_items_item_id ON warehouse_inventory_items(item_id);

-- Create trigger for updated_at
CREATE TRIGGER update_warehouse_inventories_updated_at
  BEFORE UPDATE ON warehouse_inventories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_inventory_items_updated_at
  BEFORE UPDATE ON warehouse_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();