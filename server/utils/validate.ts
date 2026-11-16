import { getRouterParam  } from 'h3'
import type {H3Event} from 'h3';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const badRequest = (message: string) => createError({ statusCode: 400, message })

/** A uuid route param, or 400 — keeps malformed ids out of SQL entirely. */
export const uuidParam = (event: H3Event, name: string): string => {
  const value = getRouterParam(event, name)
  if (!value || !UUID.test(value)) throw badRequest(`Invalid ${name}`)
  return value
}

export const requireString = (value: unknown, field: string, { max = 200 } = {}): string => {
  if (typeof value !== 'string' || !value.trim()) throw badRequest(`${field} is required`)
  if (value.length > max) throw badRequest(`${field} is too long`)
  return value.trim()
}

export const optionalString = (value: unknown, field: string, { max = 500 } = {}): string => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw badRequest(`${field} must be text`)
  if (value.length > max) throw badRequest(`${field} is too long`)
  return value.trim()
}

export const requireUuid = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !UUID.test(value)) throw badRequest(`${field} is invalid`)
  return value
}

export const requireDate = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) throw badRequest(`${field} must be a YYYY-MM-DD date`)
  return value
}
