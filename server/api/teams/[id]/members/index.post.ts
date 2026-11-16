import { sql } from 'drizzle-orm'

// Add an existing account to the team by email. The owner check and the email
// lookup both happen inside add_team_member_by_email; its `raise exception`
// messages ("No account found for …") come back as a 400 with that text.
export default defineEventHandler(async (event) => {
  const teamId = uuidParam(event, 'id')
  const body = await readBody<{ email?: unknown }>(event)
  const email = requireString(body?.email, 'Email', { max: 254 })

  await withUser(event, tx =>
    tx.execute(sql`select 1 from public.add_team_member_by_email(${teamId}, ${email})`),
  )
  return { ok: true }
})
