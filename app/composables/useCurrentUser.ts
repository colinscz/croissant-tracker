export interface CurrentUser {
  /** Hanko user id — the same value as this user's `profileId`. */
  id: string
  email: string | null
}

/**
 * The signed-in user as the server sees them (GET /api/me, which verifies the
 * Hanko session cookie). `null` when signed out.
 *
 * Asking the server rather than decoding the cookie keeps one source of truth:
 * the id here is exactly what RLS compares against.
 */
export const useCurrentUser = () => {
  const user = useState<CurrentUser | null>('current-user', () => null)

  const fetchCurrentUser = async () => {
    try {
      user.value = await $fetch<CurrentUser>('/api/me')
    }
    catch {
      user.value = null
    }
    return user.value
  }

  /** Sign out of Hanko and drop every piece of per-user state. */
  const signOut = async () => {
    await useHanko()?.logout().catch(() => {})
    user.value = null
    // Leave the page first, then reset to empty values (not clearNuxtState,
    // which sets them to undefined under any page still rendering them), so the
    // next person to sign in on this tab starts clean.
    await navigateTo('/login')
    useState('teams').value = []
    useState('team-members').value = {}
    useState('active-team-id').value = null
    useState('croissant-entries').value = []
  }

  return { user, fetchCurrentUser, signOut }
}
