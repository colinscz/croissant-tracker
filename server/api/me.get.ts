// The signed-in user as the server sees them (verified Hanko session).
// The client uses `id` to recognise its own rows — e.g. hiding the Delivered
// button on your own debts.
export default defineEventHandler((event) => {
  const user = requireUser(event)
  return { id: user.id, email: user.email }
})
