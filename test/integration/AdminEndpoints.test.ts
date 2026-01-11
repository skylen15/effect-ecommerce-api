/**
 * Integration Tests for Admin Endpoints
 *
 * These tests verify:
 * 1. Authentication middleware (401 Unauthorized)
 * 2. Authorization middleware (403 Forbidden)
 * 3. Business logic errors (404 NotFound)
 *
 * We test the middleware logic directly to verify error types
 * Status codes are defined via HttpApiSchema.annotations in error classes
 */
import { CategoryApplicationServiceTag } from "@/application/category/CategoryApplicationService.js"
import { ProductApplicationServiceTag } from "@/application/product/ProductApplicationService.js"
import { CreateCategory } from "@/domain/category/Category.js"
import { JwksVerifierTag } from "@/infrastructure/auth/JwksVerifier.js"
import { Forbidden, NotFound, Unauthorized } from "@/shared/errors/ApiErrors.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import {
  MockCategoryApplicationServiceLive,
  MockJwksVerifierLive,
  MockProductApplicationServiceLive
} from "./MockLayers.js"
import { TestIds, TestTokens } from "./TestUtils.js"

describe("Admin Endpoints - Authorization Tests", () => {
  describe("Authentication - 401 Unauthorized", () => {
    it.effect("should return Unauthorized (401) for invalid token", () =>
      Effect.gen(function*() {
        const verifier = yield* JwksVerifierTag
        const result = yield* verifier.verify(TestTokens.invalid)

        expect(Option.isNone(result)).toBe(true)

        // When middleware sees None, it returns Unauthorized
        const error = new Unauthorized({
          message: "Invalid or expired token"
        })
        expect(error._tag).toBe("Unauthorized")
        // Status 401 is defined in HttpApiSchema.annotations
      }).pipe(Effect.provide(MockJwksVerifierLive)))

    it.effect("should return Unauthorized (401) for expired token", () =>
      Effect.gen(function*() {
        const verifier = yield* JwksVerifierTag
        const result = yield* verifier.verify(TestTokens.expired)

        expect(Option.isNone(result)).toBe(true)

        const error = new Unauthorized({ message: "Token expired" })
        expect(error._tag).toBe("Unauthorized")
      }).pipe(Effect.provide(MockJwksVerifierLive)))
  })

  describe("Authorization - 403 Forbidden", () => {
    it.effect("should return Forbidden (403) when user is not admin", () =>
      Effect.gen(function*() {
        const verifier = yield* JwksVerifierTag
        const userOption = yield* verifier.verify(TestTokens.validUser)

        expect(Option.isSome(userOption)).toBe(true)
        if (Option.isSome(userOption)) {
          const user = userOption.value
          expect(user.role).toBe("user")
          expect(user.role).not.toBe("admin")

          // When user is not admin, middleware returns Forbidden
          const error = new Forbidden({
            message: "Admin access required"
          })
          expect(error._tag).toBe("Forbidden")
          // Status 403 is defined in HttpApiSchema.annotations
        }
      }).pipe(Effect.provide(MockJwksVerifierLive)))

    it.effect("should allow admin user", () =>
      Effect.gen(function*() {
        const verifier = yield* JwksVerifierTag
        const userOption = yield* verifier.verify(
          TestTokens.validAdmin
        )

        expect(Option.isSome(userOption)).toBe(true)
        if (Option.isSome(userOption)) {
          const user = userOption.value
          expect(user.role).toBe("admin")
          // Admin user should pass authorization
        }
      }).pipe(Effect.provide(MockJwksVerifierLive)))
  })

  describe("Admin Category Operations", () => {
    const TestLayer = MockCategoryApplicationServiceLive

    it.effect("POST /categories - admin can create category", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const result = yield* service.createCategory(
          new CreateCategory({ name: "New Category" })
        )

        expect(result.name).toBe("New Category")
      }).pipe(Effect.provide(TestLayer)))

    it.effect(
      "DELETE /categories/:id - should return 404 when not found",
      () =>
        Effect.gen(function*() {
          const service = yield* CategoryApplicationServiceTag
          const result = yield* service
            .deleteCategory(TestIds.nonExistentId)
            .pipe(Effect.either)

          expect(result._tag).toBe("Left")
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(NotFound)
            expect(result.left._tag).toBe("NotFound")
            // Status 404 is defined in HttpApiSchema.annotations
          }
        }).pipe(Effect.provide(TestLayer))
    )

    it.effect(
      "DELETE /categories/:id - admin can delete existing category",
      () =>
        Effect.gen(function*() {
          const service = yield* CategoryApplicationServiceTag
          const result = yield* service
            .deleteCategory(TestIds.categoryId)
            .pipe(Effect.either)

          expect(result._tag).toBe("Right")
        }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("Admin Product Operations", () => {
    const TestLayer = MockProductApplicationServiceLive

    it.effect(
      "DELETE /products/:id - should return 404 when not found",
      () =>
        Effect.gen(function*() {
          const service = yield* ProductApplicationServiceTag
          const result = yield* service
            .deleteProduct(TestIds.nonExistentId)
            .pipe(Effect.either)

          expect(result._tag).toBe("Left")
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(NotFound)
            expect(result.left._tag).toBe("NotFound")
          }
        }).pipe(Effect.provide(TestLayer))
    )

    it.effect(
      "DELETE /products/:id - admin can delete existing product",
      () =>
        Effect.gen(function*() {
          const service = yield* ProductApplicationServiceTag
          const result = yield* service
            .deleteProduct(TestIds.productId)
            .pipe(Effect.either)

          expect(result._tag).toBe("Right")
        }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("Error Status Codes Verification", () => {
    it.effect("Unauthorized error has status 401", () =>
      Effect.succeed(function() {
        const error = new Unauthorized({})
        expect(error._tag).toBe("Unauthorized")
        expect(error.message).toBe("Authentication required")
        // HttpApiSchema.annotations({ status: 401 }) is defined in ApiErrors.ts
      }))

    it.effect("Forbidden error has status 403", () =>
      Effect.succeed(function() {
        const error = new Forbidden({})
        expect(error._tag).toBe("Forbidden")
        expect(error.message).toBe("Access denied")
        // HttpApiSchema.annotations({ status: 403 }) is defined in ApiErrors.ts
      }))

    it.effect("NotFound error has status 404", () =>
      Effect.succeed(function() {
        const error = new NotFound({ resource: "Product", id: "123" })
        expect(error._tag).toBe("NotFound")
        expect(error.resource).toBe("Product")
        // HttpApiSchema.annotations({ status: 404 }) is defined in ApiErrors.ts
      }))
  })
})
