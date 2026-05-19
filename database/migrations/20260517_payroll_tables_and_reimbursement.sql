-- =============================================
-- PAYROLL & REIMBURSEMENT MIGRATION
-- Fixes: "Could not find the table 'public.payroll_periods' in the schema cache"
-- =============================================

-- 1. Create reimbursements table
CREATE TABLE IF NOT EXISTS reimbursements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_nik TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all reimbursements" ON reimbursements FOR ALL USING (true) WITH CHECK (true);

-- 2. Ensure payroll_periods exists
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Processing', 'Approved', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all payroll_periods" ON payroll_periods FOR ALL USING (true) WITH CHECK (true);

-- 3. Ensure payroll_details exists and add reimbursement column
CREATE TABLE IF NOT EXISTS payroll_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_nik TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  attendance_deduction NUMERIC NOT NULL DEFAULT 0,
  overtime_pay NUMERIC NOT NULL DEFAULT 0,
  reimbursement NUMERIC NOT NULL DEFAULT 0,
  bpjs NUMERIC NOT NULL DEFAULT 0,
  tax_pph21 NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, employee_nik)
);

-- In case payroll_details already exists without reimbursement, add it safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payroll_details' AND column_name='reimbursement') THEN
        ALTER TABLE payroll_details ADD COLUMN reimbursement NUMERIC NOT NULL DEFAULT 0;
    END IF;
END $$;

ALTER TABLE payroll_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all payroll_details" ON payroll_details FOR ALL USING (true) WITH CHECK (true);

-- 4. Ensure master data columns exist on employees table safely
DO $$
BEGIN
    -- level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='level') THEN
        ALTER TABLE employees ADD COLUMN level TEXT;
    END IF;
    
    -- gaji_pokok
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='gaji_pokok') THEN
        ALTER TABLE employees ADD COLUMN gaji_pokok NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    -- asuransi_kesehatan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='asuransi_kesehatan') THEN
        ALTER TABLE employees ADD COLUMN asuransi_kesehatan NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    -- uang_makan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='uang_makan') THEN
        ALTER TABLE employees ADD COLUMN uang_makan NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    -- uang_pulsa
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='uang_pulsa') THEN
        ALTER TABLE employees ADD COLUMN uang_pulsa NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    -- tunjangan_transportasi
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='tunjangan_transportasi') THEN
        ALTER TABLE employees ADD COLUMN tunjangan_transportasi NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    -- total_tunjangan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='total_tunjangan') THEN
        ALTER TABLE employees ADD COLUMN total_tunjangan NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    -- total_gaji
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='total_gaji') THEN
        ALTER TABLE employees ADD COLUMN total_gaji NUMERIC NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 5. Reload PostgREST schema cache to fix the error
NOTIFY pgrst, 'reload schema';
