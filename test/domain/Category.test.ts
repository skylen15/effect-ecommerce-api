import { Category, CategoryWithCount, CreateCategory, UpdateCategory } from "@/domain/category/Category.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

describe("Category Domain", () => {
  describe("Category Schema", () => {
    // Encoded format (strings for Date)
    const validCategoryEncoded = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Electronics",
      parentId: null,
      image: "https://example.com/image.jpg",
      slug: "electronics",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    }

    it.effect("should decode valid category", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(Category)(validCategoryEncoded)
        expect(decoded.name).toBe("Electronics")
        expect(decoded.slug).toBe("electronics")
      }))

    it.effect("should decode category with parent", () =>
      Effect.gen(function*() {
        const categoryWithParent = {
          ...validCategoryEncoded,
          parentId: "550e8400-e29b-41d4-a716-446655440001"
        }
        const decoded = yield* Schema.decode(Category)(categoryWithParent)
        expect(decoded.parentId).toBe("550e8400-e29b-41d4-a716-446655440001")
      }))

    it.effect("should decode category with null optional fields", () =>
      Effect.gen(function*() {
        const categoryWithNulls = {
          ...validCategoryEncoded,
          image: null,
          slug: null
        }
        const decoded = yield* Schema.decode(Category)(categoryWithNulls)
        expect(decoded.image).toBeNull()
        expect(decoded.slug).toBeNull()
      }))
  })

  describe("CreateCategory Schema", () => {
    it.effect("should decode valid create category data", () =>
      Effect.gen(function*() {
        const createData = {
          name: "New Category"
        }
        const decoded = yield* Schema.decode(CreateCategory)(createData)
        expect(decoded.name).toBe("New Category")
        expect(decoded.parentId).toBeUndefined()
      }))

    it.effect("should decode create data with all optional fields", () =>
      Effect.gen(function*() {
        const createData = {
          name: "Subcategory",
          parentId: "550e8400-e29b-41d4-a716-446655440000",
          image: "https://example.com/img.jpg",
          slug: "subcategory"
        }
        const decoded = yield* Schema.decode(CreateCategory)(createData)
        expect(decoded.slug).toBe("subcategory")
        expect(decoded.parentId).toBe("550e8400-e29b-41d4-a716-446655440000")
      }))

    it.effect("should fail with empty name", () =>
      Effect.gen(function*() {
        const invalidData = { name: "" }
        const result = yield* Schema.decode(CreateCategory)(invalidData).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with name exceeding max length", () =>
      Effect.gen(function*() {
        const invalidData = { name: "a".repeat(256) }
        const result = yield* Schema.decode(CreateCategory)(invalidData).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }))
  })

  describe("UpdateCategory Schema", () => {
    it.effect("should decode partial update", () =>
      Effect.gen(function*() {
        const updateData = { name: "Updated Name" }
        const decoded = yield* Schema.decode(UpdateCategory)(updateData)
        expect(decoded.name).toBe("Updated Name")
        expect(decoded.slug).toBeUndefined()
      }))

    it.effect("should decode empty update", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(UpdateCategory)({})
        expect(decoded.name).toBeUndefined()
      }))

    it.effect("should accept null values in update", () =>
      Effect.gen(function*() {
        // With optionalWith + nullable, null is a valid input value
        // The decoded result may be undefined or null depending on schema behavior
        const updateData = { parentId: null, image: null }
        const result = yield* Schema.decode(UpdateCategory)(updateData).pipe(Effect.either)
        // Should successfully decode (not fail)
        expect(result._tag).toBe("Right")
      }))
  })

  describe("CategoryWithCount Schema", () => {
    it.effect("should decode category with product count", () =>
      Effect.gen(function*() {
        const categoryWithCountEncoded = {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "Electronics",
          parentId: null,
          image: null,
          slug: "electronics",
          productCount: 42,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
        const decoded = yield* Schema.decode(CategoryWithCount)(categoryWithCountEncoded)
        expect(decoded.productCount).toBe(42)
      }))
  })
})
