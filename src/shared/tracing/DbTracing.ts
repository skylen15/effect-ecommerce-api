import { Effect } from "effect"

/**
 * Creates a tracing span wrapper for database operations.
 *
 * @param entity - The entity name (e.g., "product", "category", "cart", "order")
 * @returns A function that wraps effects with database tracing spans
 *
 * @example
 * ```typescript
 * const withDbSpan = createDbSpan("product")
 *
 * findById: (id: string) =>
 *   withDbSpan(
 *     "findById",
 *     sql`SELECT * FROM product WHERE id = ${id}`.pipe(
 *       Effect.tap(() => Effect.annotateCurrentSpan("db.productId", id)),
 *       // ... rest of the pipeline
 *     )
 *   )
 * ```
 */
export const createDbSpan = (entity: string) => <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.tap(() => Effect.annotateCurrentSpan("db.system", "postgresql")),
    Effect.tap(() => Effect.annotateCurrentSpan("db.entity", entity)),
    Effect.withSpan(`db.${entity}.${name}`)
  )

/**
 * Pre-configured database span helpers for each entity.
 * Use these directly in repository implementations.
 */
export const DbSpan = {
  product: createDbSpan("product"),
  category: createDbSpan("category"),
  cart: createDbSpan("cart"),
  order: createDbSpan("order")
} as const

/**
 * Annotate current span with common database attributes
 */
export const annotateDbOperation = (operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE") =>
  Effect.annotateCurrentSpan("db.operation", operation)
