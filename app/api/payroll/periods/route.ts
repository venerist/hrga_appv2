import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/payroll/periods — list all payroll periods
export async function GET() {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) {
      console.error('[GET /api/payroll/periods] Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error('[GET /api/payroll/periods] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/periods — create a new payroll period (or return existing)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const month = Number(body.month)
    const year = Number(body.year)

    if (!month || !year || month < 1 || month > 12 || year < 2000) {
      return NextResponse.json(
        { success: false, error: 'Invalid month or year' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Check if the period already exists
    const { data: existing } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, data: existing, existing: true })
    }

    // Create new period
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert({ month, year, status: 'Open' })
      .select('*')
      .single()

    if (error) {
      console.error('[POST /api/payroll/periods] Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[POST /api/payroll/periods] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
