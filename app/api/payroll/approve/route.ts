import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/payroll/approve — approve a payroll period
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { period_id } = body

    if (!period_id) {
      return NextResponse.json(
        { success: false, error: 'period_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('payroll_periods')
      .update({ status: 'Approved' })
      .eq('id', period_id)

    if (error) {
      console.error('[POST /api/payroll/approve] error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[POST /api/payroll/approve] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
