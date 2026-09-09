import { toError } from './errors'

import { fetchAllPages } from './pagination'

import { supabase } from './supabaseClient'

import type { CrmActivity } from '../types/crm.types'

interface ActivityRow {
  project_id: string
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

export async function getActivities(projectId: string): Promise<
  CrmActivity[]
> {
  const rows =
    await fetchAllPages<ActivityRow>(
      (from, to) =>
        supabase
          .from('activities')
          .select('*')
          .eq('project_id', projectId)
          .order(
            'activity_date',
            {
              ascending: false,
            },
          )
          .range(from, to),
    )

  return rows.map(fromRow)
}

export async function saveActivity(
  projectId: string,
  activity: CrmActivity,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .upsert({
      id: activity.id, project_id: projectId,
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
  projectId: string,
  activityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('project_id', projectId)
    .eq('id', activityId)

  if (error) {
    throw toError(error)
  }
}
