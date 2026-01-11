import { Schema } from "effect"

// UUID Brand type
export const UUID = Schema.UUID

// Pagination schemas
export class PaginationParams extends Schema.Class<PaginationParams>("PaginationParams")({
  limit: Schema.optionalWith(Schema.Int.pipe(Schema.positive(), Schema.lessThanOrEqualTo(100)), {
    default: () => 20
  }),
  offset: Schema.optionalWith(Schema.Int.pipe(Schema.nonNegative()), { default: () => 0 })
}) {}

// Currency/Price helper
export const Price = Schema.BigDecimal.pipe(Schema.nonNegativeBigDecimal())

// Positive quantity
export const Quantity = Schema.Int.pipe(Schema.positive())
