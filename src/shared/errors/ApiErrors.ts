import { HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

// 401 Unauthorized
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {
    message: Schema.optionalWith(Schema.String, {
      default: () => "Authentication required"
    })
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

// 403 Forbidden
export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  {
    message: Schema.optionalWith(Schema.String, {
      default: () => "Access denied"
    })
  },
  HttpApiSchema.annotations({ status: 403 })
) {}

// 404 Not Found
export class NotFound extends Schema.TaggedError<NotFound>()(
  "NotFound",
  {
    resource: Schema.String,
    id: Schema.optionalWith(Schema.String, { default: () => "" })
  },
  HttpApiSchema.annotations({ status: 404 })
) {}

// 400 Validation Error
export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
    errors: Schema.optionalWith(Schema.Array(Schema.String), {
      default: () => []
    })
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

// 409 Conflict
export class ConflictError extends Schema.TaggedError<ConflictError>()(
  "ConflictError",
  {
    message: Schema.String
  },
  HttpApiSchema.annotations({ status: 409 })
) {}

// 500 Internal Error
export class InternalError extends Schema.TaggedError<InternalError>()(
  "InternalError",
  {
    message: Schema.optionalWith(Schema.String, {
      default: () => "Internal server error"
    })
  },
  HttpApiSchema.annotations({ status: 500 })
) {}
