/* eslint-disable require-yield */
import {
  ConflictError,
  Forbidden,
  InternalError,
  NotFound,
  Unauthorized,
  ValidationError
} from "@/shared/errors/ApiErrors.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

describe("API Errors", () => {
  describe("Unauthorized", () => {
    it.effect("should create with default message", () =>
      Effect.gen(function*() {
        const error = new Unauthorized({})
        expect(error.message).toBe("Authentication required")
        expect(error._tag).toBe("Unauthorized")
      }))

    it.effect("should create with custom message", () =>
      Effect.gen(function*() {
        const error = new Unauthorized({ message: "Token expired" })
        expect(error.message).toBe("Token expired")
      }))

    it.effect("should decode from schema with _tag", () =>
      Effect.gen(function*() {
        // TaggedError requires _tag in encoded form
        const decoded = yield* Schema.decode(Unauthorized)({
          _tag: "Unauthorized"
        })
        expect(decoded.message).toBe("Authentication required")
      }))
  })

  describe("Forbidden", () => {
    it.effect("should create with default message", () =>
      Effect.gen(function*() {
        const error = new Forbidden({})
        expect(error.message).toBe("Access denied")
        expect(error._tag).toBe("Forbidden")
      }))

    it.effect("should create with custom message", () =>
      Effect.gen(function*() {
        const error = new Forbidden({
          message: "Admin access required"
        })
        expect(error.message).toBe("Admin access required")
      }))
  })

  describe("NotFound", () => {
    it.effect("should create with resource info", () =>
      Effect.gen(function*() {
        const error = new NotFound({ resource: "Product", id: "123" })
        expect(error.resource).toBe("Product")
        expect(error.id).toBe("123")
        expect(error._tag).toBe("NotFound")
      }))

    it.effect("should create with default id", () =>
      Effect.gen(function*() {
        const error = new NotFound({ resource: "Category" })
        expect(error.resource).toBe("Category")
        expect(error.id).toBe("")
      }))

    it.effect("should decode from schema with _tag", () =>
      Effect.gen(function*() {
        // TaggedError requires _tag in encoded form
        const decoded = yield* Schema.decode(NotFound)({
          _tag: "NotFound",
          resource: "Order",
          id: "order-456"
        })
        expect(decoded.resource).toBe("Order")
        expect(decoded.id).toBe("order-456")
      }))
  })

  describe("ValidationError", () => {
    it.effect("should create with message", () =>
      Effect.gen(function*() {
        const error = new ValidationError({ message: "Invalid input" })
        expect(error.message).toBe("Invalid input")
        expect(error.errors).toEqual([])
        expect(error._tag).toBe("ValidationError")
      }))

    it.effect("should create with error list", () =>
      Effect.gen(function*() {
        const error = new ValidationError({
          message: "Validation failed",
          errors: ["Name is required", "Price must be positive"]
        })
        expect(error.errors).toHaveLength(2)
        expect(error.errors).toContain("Name is required")
      }))
  })

  describe("ConflictError", () => {
    it.effect("should create with message", () =>
      Effect.gen(function*() {
        const error = new ConflictError({
          message: "Email already exists"
        })
        expect(error.message).toBe("Email already exists")
        expect(error._tag).toBe("ConflictError")
      }))
  })

  describe("InternalError", () => {
    it.effect("should create with default message", () =>
      Effect.gen(function*() {
        const error = new InternalError({})
        expect(error.message).toBe("Internal server error")
        expect(error._tag).toBe("InternalError")
      }))

    it.effect("should create with custom message", () =>
      Effect.gen(function*() {
        const error = new InternalError({
          message: "Database connection failed"
        })
        expect(error.message).toBe("Database connection failed")
      }))
  })

  describe("Error as Effect failures", () => {
    it.effect("should work as Effect failures", () =>
      Effect.gen(function*() {
        const program = Effect.fail(
          new NotFound({ resource: "Product", id: "test-id" })
        )

        const result = yield* program.pipe(Effect.either)

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("NotFound")
        }
      }))

    it.effect("should be catchable by tag", () =>
      Effect.gen(function*() {
        const program = Effect.fail(
          new NotFound({ resource: "Product" })
        ).pipe(
          Effect.catchTag("NotFound", (error) => Effect.succeed(`Caught: ${error.resource}`))
        )

        const result = yield* program
        expect(result).toBe("Caught: Product")
      }))

    it.effect("should be matchable", () =>
      Effect.gen(function*() {
        const error = new Unauthorized({})

        const result = yield* Effect.fail(error).pipe(
          Effect.catchAll((e) => {
            switch (e._tag) {
              case "Unauthorized":
                return Effect.succeed("unauthorized")
              default:
                return Effect.succeed("other")
            }
          })
        )

        expect(result).toBe("unauthorized")
      }))
  })
})
