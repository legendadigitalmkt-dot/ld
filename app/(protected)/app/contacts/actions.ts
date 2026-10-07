'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { requireWorkspace } from '@/lib/workspace'

export async function createContact(formData: FormData) {
  const [user, workspace] = await Promise.all([requireUser(), requireWorkspace()])
  const name = String(formData.get('name') || '').trim().slice(0, 120)
  const phone = String(formData.get('phone') || '').trim().slice(0, 40) || null
  const source = String(formData.get('source') || 'Manual').trim().slice(0, 80)
  if (name.length < 2) return

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').insert({
    workspace_id: workspace.id,
    name,
    phone,
    source,
    owner_user_id: user.id,
    last_interaction_at: new Date().toISOString(),
  })
  if (error) throw new Error(`Failed to create contact: ${error.message}`)
  revalidatePath('/app/contacts')
  revalidatePath('/app')
}
