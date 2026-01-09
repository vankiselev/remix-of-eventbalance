-- Add import_row_order column to preserve row order from Excel imports
ALTER TABLE financial_transactions 
ADD COLUMN import_row_order INTEGER;

-- Create index for efficient sorting by operation_date and import order
CREATE INDEX idx_transactions_import_order 
ON financial_transactions(operation_date DESC, import_row_order ASC NULLS LAST);

-- Add comment explaining the column purpose
COMMENT ON COLUMN financial_transactions.import_row_order IS 'Row number from original import file to preserve import order';