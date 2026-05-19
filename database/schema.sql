-- =============================================
-- Veneris HRIS — Enterprise Database Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Master employee table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nik TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  division TEXT,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance import batch tracking
CREATE TABLE IF NOT EXISTS attendance_import_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  uploaded_by TEXT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_records INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed'))
);

-- Raw fingerprint attendance data
CREATE TABLE IF NOT EXISTS attendance_raw (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_nik TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  batch_id UUID REFERENCES attendance_import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Processed attendance summary: source of truth for payroll and reports
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

-- Attendance overrides created from approved leave requests
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  affect_attendance BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_nik TEXT NOT NULL,
  employee_name TEXT,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_nik TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll tables
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Processing', 'Approved', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_nik TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  attendance_deduction NUMERIC NOT NULL DEFAULT 0,
  overtime_pay NUMERIC NOT NULL DEFAULT 0,
  bpjs NUMERIC NOT NULL DEFAULT 0,
  tax_pph21 NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RBAC tables
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legacy table for compatibility with current UI
CREATE TABLE IF NOT EXISTS absensi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departemen TEXT,
  nama TEXT NOT NULL,
  no_id TEXT,
  tanggal DATE NOT NULL,
  jam_masuk TIMESTAMPTZ,
  jam_keluar TIMESTAMPTZ,
  jam_masuk_str TEXT,
  jam_keluar_str TEXT,
  durasi_jam NUMERIC,
  shift TEXT,
  menit_terlambat INTEGER DEFAULT 0,
  jml_tap INTEGER DEFAULT 1,
  status TEXT,
  periode TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_raw_nik ON attendance_raw(employee_nik);
CREATE INDEX IF NOT EXISTS idx_attendance_raw_date ON attendance_raw(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_nik ON attendance_summary(employee_nik);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_date ON attendance_summary(attendance_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_nik ON leave_requests(employee_nik);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_month_year ON payroll_periods(month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_details_period ON payroll_details(period_id);
CREATE INDEX IF NOT EXISTS idx_permissions_role_module ON permissions(role_id, module_id);
