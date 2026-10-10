import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true, service: 'ld-growth-os', foundation: 'production', release: 'plans-limits-v1', time: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } })
}
