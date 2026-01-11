import { Effect } from "effect"

/**
 * Helper to make HTTP request and get response with status
 */
export const makeRequest = <A, E>(
  effect: Effect.Effect<A, E>
): Effect.Effect<
  { success: true; data: A } | { success: false; error: E },
  never
> =>
  effect.pipe(
    Effect.map((data) => ({ success: true as const, data })),
    Effect.catchAll((error) => Effect.succeed({ success: false as const, error }))
  )

/**
 * Test authentication tokens
 */
export const TestTokens = {
  // These would be real JWTs in a full setup
  // For now, we'll use mock tokens that the mock verifier will recognize
  validUser: "test-user-token",
  validAdmin: "test-admin-token",
  invalid: "invalid-token",
  expired: "expired-token"
} as const

/**
 * Test user IDs
 */
export const TestIds = {
  userId: "550e8400-e29b-41d4-a716-446655440000" as const,
  adminId: "550e8400-e29b-41d4-a716-446655440001" as const,
  productId: "550e8400-e29b-41d4-a716-446655440010" as const,
  categoryId: "550e8400-e29b-41d4-a716-446655440020" as const,
  orderId: "550e8400-e29b-41d4-a716-446655440030" as const,
  cartItemId: "550e8400-e29b-41d4-a716-446655440040" as const,
  nonExistentId: "550e8400-e29b-41d4-a716-446655440999" as const
}
