-- Add payment_due_day column to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS payment_due_day integer DEFAULT 10;

-- Add comment
COMMENT ON COLUMN public.contracts.payment_due_day IS 'Day of the month when the payment is due (1-31)';