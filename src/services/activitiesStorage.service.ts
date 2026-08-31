import { toError } from './errors'

import { supabase } from './supabaseClient'

import type { CrmActivity } from '../types/crm.types'

interface ActivityRow {
  id: string
  client_id: string | null
  type: string
  description: string
  activity_date: string
  created_at: string
}

function fromRow(
  row: ActivityRow,
): CrmActivity {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    description: row.description,
    activityDate: row.activity_date,
    createdAt: row.created_at,
  }
}

export async function getActivities(): Promise<
  CrmActivity[]
> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('activity_date', {
      ascending: false,
    })

  if (error) {
    throw toError(error)
  }

  return (data as ActivityRow[]).map(
    fromRow,
  )
}

export async function saveActivity(
  activity: CrmActivity,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .upsert({
      id: activity.id,
      client_id:
        activity.clientId || null,
      type: activity.type,
      description:
        activity.description,
      activity_date:
        activity.activityDate,
      created_at:
        activity.createdAt,
    })

  if (error) {
    throw toError(error)
  }
}

export async function deleteActivity(
  activityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    throw toError(error)
  }
}
