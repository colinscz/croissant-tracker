import { createRemoteJWKSet, jwtVerify  } from 'jose'
import type {JWTPayload} from 'jose';
import { getCookie, getHeader  } from 'h3'
import type {H3Event} from 'h3';

export interface SessionUser {
  /** Hanko user id — also the `profiles.id` of this user. */
  id: string
  email: string | null
}

/** Hanko session JWT claims we rely on (backend/session/session.go). */
interface HankoClaims extends JWTPayload {
  email?: { address?: string, is_primary?: boolean, is_verified?: boolean }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

// The signing keys are fetched from Hanko over the internal Docker network
// (NUXT_HANKO_INTERNAL_URL, e.g. http://hanko:8000) when that's configured —
// the public URL only resolves from browsers. jose caches the key set and
// refetches when it sees an unknown `kid`, so Hanko key rotation just works.
const useJwks = () => {
  if (!jwks) {
    const config = useRuntimeConfig()
    const base = config.hankoInternalUrl || config.public.hanko.apiURL
    if (!base) {
      throw createError({ statusCode: 500, message: 'Hanko API URL is not configured' })
    }
    jwks = createRemoteJWKSet(new URL('/.well-known/jwks.json', base))
  }
  return jwks
}

/**
 * Verify the Hanko session token on a request. The token arrives as the
 * `hanko` cookie (set by hanko-elements on the app's domain) or as a Bearer
 * token. Returns undefined for anonymous or invalid sessions.
 */
export const verifyHankoSession = async (event: H3Event): Promise<SessionUser | undefined> => {
  const config = useRuntimeConfig()
  const token = getHeader(event, 'authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    || getCookie(event, config.public.hanko.cookieName || 'hanko')
  if (!token) return undefined

  try {
    const { payload } = await jwtVerify<HankoClaims>(token, useJwks())
    if (!payload.sub) return undefined
    return { id: payload.sub, email: payload.email?.address ?? null }
  }
  catch {
    return undefined
  }
}

/** The signed-in user, or a 401. Populated by server/middleware/01.auth.ts. */
export const requireUser = (event: H3Event): SessionUser => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'You need to sign in.' })
  }
  return user
}

declare module 'h3' {
  interface H3EventContext {
    user?: SessionUser
  }
}
