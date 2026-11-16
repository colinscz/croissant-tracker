import { eq } from 'drizzle-orm'
import { croissantEntries } from '../../db/schema'

// Mark an entry delivered. Team membership is the RLS update policy; "not your
// own debt" is the prevent_self_delivery trigger, whose message reaches the UI.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid entry id' })
  }

  const body = await readBody<{ delivered?: unknown }>(event)
  if (body?.delivered !== true) {
    throw createError({ statusCode: 400, message: 'Only `{ "delivered": true }` is supported' })
  }

  const [entry] = await withUser(event, tx =>
    tx
      .update(croissantEntries)
      .set({ delivered: true, deliveredDate: new Date().toISOString().slice(0, 10) })
      .where(eq(croissantEntries.id, id))
      .returning(),
  )

  if (!entry) {
    throw createError({ statusCode: 404, message: 'That entry doesn\'t exist or isn\'t on one of your teams.' })
  }
  return entry
})
