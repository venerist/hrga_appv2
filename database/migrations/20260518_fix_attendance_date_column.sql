-- =============================================
-- FIX: REBUILD ATTENDANCE_SUMMARY AS PHYSICAL TABLE & FIX COLUMN NAME
-- Resolves: "cannot create index on relation 'attendance_summary' because it is a view"
-- Resolves: "column attendance_summary.attendance_date does not exist"
-- =============================================

-- 1. Drop old/broken view attendance_summary if it exists as a view
DROP VIEW IF EXISTS attendance_summary CASCADE;

-- 2. Create actual physical attendance_summary table with correct columns
CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_nik TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Absent',
  late_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  work_hours NUMERIC NOT NULL DEFAULT 0,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_nik, attendance_date)
);

-- 3. Recreate index on the new physical table
CREATE INDEX IF NOT EXISTS idx_attendance_summary_date ON attendance_summary(attendance_date);

-- 4. Enable Row Level Security and allow all access (consistent with other tables)
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all attendance_summary" ON attendance_summary FOR ALL USING (true) WITH CHECK (true);

-- 5. Fix attendance_overrides: rename "date" -> "attendance_date" safely if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='attendance_overrides' AND column_name='date')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='attendance_overrides' AND column_name='attendance_date')
    THEN
        ALTER TABLE attendance_overrides RENAME COLUMN "date" TO attendance_date;
    END IF;
END $$;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
