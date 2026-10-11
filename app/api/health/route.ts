import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true, service: 'ld-growth-os', foundation: 'production', release: 'control-foundation-p0-v1', time: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } })
}
