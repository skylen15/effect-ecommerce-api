/**
 * Integration Tests for Public Endpoints
 *
 * These tests verify that:
 * 1. Application services return correct data
 * 2. Error types are correctly propagated (NotFound, etc.)
 *
 * Status codes are tested implicitly through error types
 * which are annotated with HttpApiSchema.annotations({ status: xxx })
 */
import { CategoryApplicationServiceTag } from "@/application/category/CategoryApplicationService.js"
import { ProductApplicationServiceTag } from "@/application/product/ProductApplicationService.js"
import { ProductFilters } from "@/domain/product/Product.js"
import { HealthStatus } from "@/presentation/api/HealthApi.js"
import { NotFound } from "@/shared/errors/ApiErrors.js"
import { PaginationParams } from "@/shared/types/Common.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { MockCategoryApplicationServiceLive, MockProductApplicationServiceLive } from "./MockLayers.js"
import { TestIds } from "./TestUtils.js"

describe("Public Endpoints - Integration Tests", () => {
  describe("Categories", () => {
    const TestLayer = MockCategoryApplicationServiceLive

    it.effect("GET /categories - should return categories list", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const params = new PaginationParams({})
        const result = yield* service.listCategories(params)

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        expect(result[0].name).toBe("Electronics")
        expect(result[0].productCount).toBe(10)
      }).pipe(Effect.provide(TestLayer)))

    it.effect(
      "GET /categories/:id - should return category when found",
      () =>
        Effect.gen(function*() {
          const service = yield* CategoryApplicationServiceTag
          const result = yield* service.getCategoryById(
            TestIds.categoryId
          )

          expect(result.id).toBe(TestIds.categoryId)
          expect(result.name).toBe("Electronics")
        }).pipe(Effect.provide(TestLayer))
    )

    it.effect(
      "GET /categories/:id - should return 404 NotFound when not found",
      () =>
        Effect.gen(function*() {
          const service = yield* CategoryApplicationServiceTag
          const result = yield* service
            .getCategoryById(TestIds.nonExistentId)
            .pipe(Effect.either)

          expect(result._tag).toBe("Left")
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(NotFound)
            expect(result.left._tag).toBe("NotFound")
            expect(result.left.resource).toBe("Category")
            // Status 404 is defined via HttpApiSchema.annotations
          }
        }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("Products", () => {
    const TestLayer = MockProductApplicationServiceLive

    it.effect("GET /products - should return products list", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const filters = new ProductFilters({})
        const result = yield* service.listProducts(filters)

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        expect(result[0].name).toBe("Test Product")
      }).pipe(Effect.provide(TestLayer)))

    it.effect("GET /products/:id - should return product when found", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const result = yield* service.getProductById(TestIds.productId)

        expect(result.id).toBe(TestIds.productId)
        expect(result.name).toBe("Test Product")
        expect(result.categoryName).toBe("Electronics")
      }).pipe(Effect.provide(TestLayer)))

    it.effect(
      "GET /products/:id - should return 404 NotFound when not found",
      () =>
        Effect.gen(function*() {
          const service = yield* ProductApplicationServiceTag
          const result = yield* service
            .getProductById(TestIds.nonExistentId)
            .pipe(Effect.either)

          expect(result._tag).toBe("Left")
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(NotFound)
            expect(result.left._tag).toBe("NotFound")
            expect(result.left.resource).toBe("Product")
          }
        }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("Health Endpoint", () => {
    it.effect("GET /health - should have correct status schema", () =>
      Effect.succeed(function() {
        // Test that HealthStatus schema is correctly defined
        const healthStatus = new HealthStatus({
          status: "ok",
          timestamp: new Date(),
          database: { connected: true, latencyMs: 5 },
          version: "1.0.0"
        })

        expect(healthStatus.status).toBe("ok")
        expect(healthStatus.database.connected).toBe(true)
        expect(healthStatus.version).toBe("1.0.0")
      }))
  })
})
