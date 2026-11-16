import { croissantEntries } from '../../../../db/schema'

// Log a late arrival. RLS rejects teams the caller isn't on; new entries always
// start undelivered, so prevent_self_delivery has nothing to object to here.
export default defineEventHandler(async (event) => {
  const teamId = uuidParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)

  const values = {
    teamId,
    debtorProfileId: requireUuid(body?.debtorProfileId, 'Team member'),
    name: requireString(body?.name, 'Name', { max: 200 }),
    date: requireDate(body?.date, 'Date'),
    reason: optionalString(body?.reason, 'Reason'),
    delivered: false,
    deliveredDate: null,
  }

  const [entry] = await withUser(event, tx =>
    tx.insert(croissantEntries).values(values).returning(),
  )
  return entry
})
