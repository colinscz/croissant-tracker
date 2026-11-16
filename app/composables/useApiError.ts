/**
 * Turn a $fetch failure into the string the pages show in a UAlert.
 *
 * Server routes answer with `createError({ message })`; for database rule
 * violations that message is the Postgres `raise exception` text, e.g. "You
 * can't mark your own croissant debt as delivered — …".
 */
export const apiErrorMessage = (error: unknown): string => {
  const fetchError = error as { data?: { message?: string }, statusMessage?: string, message?: string }
  return fetchError?.data?.message
    || fetchError?.statusMessage
    || fetchError?.message
    || 'Something went wrong.'
}
