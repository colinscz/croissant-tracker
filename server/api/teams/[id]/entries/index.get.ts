import { desc, eq } from 'drizzle-orm'
import { croissantEntries } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
  const teamId = uuidParam(event, 'id')

  return withUser(event, tx =>
    tx
      .select()
      .from(croissantEntries)
      .where(eq(croissantEntries.teamId, teamId))
      .orderBy(desc(croissantEntries.date), desc(croissantEntries.id)),
  )
})
