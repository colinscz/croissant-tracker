import { isError } from 'h3'

interface PgError {
  code?: string
  message?: string
}

// Drizzle wraps driver errors (DrizzleQueryError) and keeps the original in
// `cause`; postgres.js puts the SQLSTATE in `code`.
const findPgError = (error: unknown): PgError | undefined => {
  let current: unknown = error
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as PgError & { cause?: unknown }
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return candidate
    }
    current = candidate.cause
  }
  return undefined
}

/**
 * Map a database error to an HTTP error.
 *
 * `raise exception` in our functions/triggers (SQLSTATE P0001) is written for
 * people — "A team must have at least one owner" — so it is passed through as a
 * 400 with the message intact. Other client-caused failures keep a generic
 * message; anything unexpected becomes a 500 without leaking SQL details.
 */
export const toHttpError = (error: unknown) => {
  if (isError(error)) return error

  const pg = findPgError(error)
  switch (pg?.code) {
    case 'P0001':
      return createError({ statusCode: 400, message: pg.message })
    case '42501': // insufficient_privilege, incl. RLS "new row violates row-level security policy"
      return createError({ statusCode: 403, message: 'You don\'t have access to that team.' })
    case '23503': // foreign_key_violation
      return createError({ statusCode: 400, message: 'That team member or team doesn\'t exist.' })
    case '23505': // unique_violation
      return createError({ statusCode: 409, message: 'That already exists.' })
    case '23514': // check_violation
    case '22P02': // invalid_text_representation (e.g. malformed uuid)
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return createError({ statusCode: 400, message: 'Some of the submitted values are invalid.' })
  }

  console.error(error)
  return createError({ statusCode: 500, message: 'Something went wrong talking to the database.' })
}
