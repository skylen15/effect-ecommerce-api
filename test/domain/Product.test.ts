import { CreateProduct, Product, ProductFilters, UpdateProduct } from "@/domain/product/Product.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

describe("Product Domain", () => {
  describe("Product Schema", () => {
    // Encoded format (strings for Date and BigDecimal)
    const validProductEncoded = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      categoryId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Product",
      description: "A test product description",
      price: "99.99",
      stock: 100,
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    }

    it.effect("should decode valid product", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(Product)(validProductEncoded)
        expect(decoded.name).toBe("Test Product")
        expect(decoded.stock).toBe(100)
        expect(decoded.isActive).toBe(true)
      }))

    it.effect("should decode product with null categoryId", () =>
      Effect.gen(function*() {
        const productWithNullCategory = { ...validProductEncoded, categoryId: null }
        const decoded = yield* Schema.decode(Product)(productWithNullCategory)
        expect(decoded.categoryId).toBeNull()
      }))

    it.effect("should fail to decode product with invalid UUID", () =>
      Effect.gen(function*() {
        const invalidProduct = { ...validProductEncoded, id: "invalid-uuid" }
        const result = yield* Schema.decode(Product)(invalidProduct).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))
  })

  describe("CreateProduct Schema", () => {
    it.effect("should decode valid create product data", () =>
      Effect.gen(function*() {
        const createData = {
          name: "New Product",
          description: "Product description",
          price: "49.99",
          stock: 50
        }
        const decoded = yield* Schema.decode(CreateProduct)(createData)
        expect(decoded.name).toBe("New Product")
        expect(decoded.isActive).toBe(true) // default value
      }))

    it.effect("should fail with empty name", () =>
      Effect.gen(function*() {
        const invalidData = {
          name: "",
          description: "Description",
          price: "10",
          stock: 10
        }
        const result = yield* Schema.decode(CreateProduct)(invalidData).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with name exceeding max length", () =>
      Effect.gen(function*() {
        const invalidData = {
          name: "a".repeat(256),
          description: "Description",
          price: "10",
          stock: 10
        }
        const result = yield* Schema.decode(CreateProduct)(invalidData).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with negative stock", () =>
      Effect.gen(function*() {
        const invalidData = {
          name: "Product",
          description: "Description",
          price: "10",
          stock: -5
        }
        const result = yield* Schema.decode(CreateProduct)(invalidData).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with negative price", () =>
      Effect.gen(function*() {
        const invalidData = {
          name: "Product",
          description: "Description",
          price: "-10",
          stock: 10
        }
        const result = yield* Schema.decode(CreateProduct)(invalidData).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))
  })

  describe("UpdateProduct Schema", () => {
    it.effect("should decode partial update data", () =>
      Effect.gen(function*() {
        const updateData = {
          name: "Updated Name"
        }
        const decoded = yield* Schema.decode(UpdateProduct)(updateData)
        expect(decoded.name).toBe("Updated Name")
        expect(decoded.description).toBeUndefined()
      }))

    it.effect("should decode empty update (no fields)", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(UpdateProduct)({})
        expect(decoded.name).toBeUndefined()
        expect(decoded.price).toBeUndefined()
      }))
  })

  describe("ProductFilters Schema", () => {
    it.effect("should use default pagination values", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(ProductFilters)({})
        expect(decoded.limit).toBe(20)
        expect(decoded.offset).toBe(0)
      }))

    it.effect("should decode custom filters", () =>
      Effect.gen(function*() {
        const filters = {
          categoryId: "550e8400-e29b-41d4-a716-446655440000",
          search: "test",
          isActive: true,
          limit: 50,
          offset: 10
        }
        const decoded = yield* Schema.decode(ProductFilters)(filters)
        expect(decoded.search).toBe("test")
        expect(decoded.limit).toBe(50)
        expect(decoded.offset).toBe(10)
      }))

    it.effect("should fail with limit exceeding 100", () =>
      Effect.gen(function*() {
        const filters = { limit: 150 }
        const result = yield* Schema.decode(ProductFilters)(filters).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with negative offset", () =>
      Effect.gen(function*() {
        const filters = { offset: -10 }
        const result = yield* Schema.decode(ProductFilters)(filters).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))
  })
})
