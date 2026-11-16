import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Tables only. Row-level security, the security-definer functions and the
// triggers that enforce the app's rules live in the hand-written migration
// `migrations/0001_rls_functions.sql` — drizzle-kit doesn't model those, and
// they're easier to review as plain SQL anyway.

/**
 * One row per Hanko user. `id` is the Hanko user id (the JWT `sub`), and the
 * row is created/updated by `app.sync_own_profile()` on the user's first API
 * request — there is no `auth.users` table to hang a trigger off any more.
 *
 * `email` is nullable only so a stale profile can give its address up to a new
 * Hanko account that signed up with the same email (see sync_own_profile).
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  username: text('username'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  uniqueIndex('profiles_email_lower_idx').on(sql`lower(${t.email})`),
])

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdBy: uuid('created_by').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  check('teams_name_not_blank', sql`length(trim(${t.name})) > 0`),
])

export const teamMembers = pgTable('team_members', {
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.teamId, t.profileId] }),
  // "Which teams am I on?" is the hot path for every page load.
  index('team_members_profile_id_idx').on(t.profileId),
  check('team_members_role_check', sql`${t.role} in ('owner', 'member')`),
])

export const croissantEntries = pgTable('croissant_entries', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  /** Profile that owes the croissants — the one person who can't resolve it. */
  debtorProfileId: uuid('debtor_profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  /** Display snapshot of the debtor's label at logging time. */
  name: text('name').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  reason: text('reason').notNull().default(''),
  delivered: boolean('delivered').notNull().default(false),
  deliveredDate: date('delivered_date', { mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  index('croissant_entries_team_id_idx').on(t.teamId),
  index('croissant_entries_debtor_profile_id_idx').on(t.debtorProfileId),
])

export type EntryRow = typeof croissantEntries.$inferSelect
export type TeamRow = typeof teams.$inferSelect
