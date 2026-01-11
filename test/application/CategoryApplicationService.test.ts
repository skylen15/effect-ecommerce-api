import {
  CategoryApplicationServiceLive,
  CategoryApplicationServiceTag
} from "@/application/category/CategoryApplicationService.js"
import { Category, CategoryWithCount, CreateCategory, UpdateCategory } from "@/domain/category/Category.js"
import type { CategoryRepository } from "@/domain/category/CategoryRepository.js"
import { CategoryRepositoryTag } from "@/domain/category/CategoryRepository.js"
import { NotFound } from "@/shared/errors/ApiErrors.js"
import { PaginationParams } from "@/shared/types/Common.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"

// Test fixtures
const testCategoryId = "550e8400-e29b-41d4-a716-446655440000"
const newCategoryId = "550e8400-e29b-41d4-a716-446655440001"
const now = new Date()

const testCategory = new Category({
  id: testCategoryId,
  name: "Electronics",
  parentId: null,
  image: "https://example.com/electronics.jpg",
  slug: "electronics",
  createdAt: now,
  updatedAt: now
})

const testCategoryWithCount = new CategoryWithCount({
  id: testCategoryId,
  name: "Electronics",
  parentId: null,
  image: "https://example.com/electronics.jpg",
  slug: "electronics",
  productCount: 42,
  createdAt: now,
  updatedAt: now
})

// Mock repository factory
const createMockRepository = (overrides: Partial<CategoryRepository> = {}): CategoryRepository => ({
  findAll: () => Effect.succeed([testCategory]),
  findAllWithCount: () => Effect.succeed([testCategoryWithCount]),
  findById: (id) => Effect.succeed(id === testCategoryId ? Option.some(testCategory) : Option.none()),
  findBySlug: (slug) => Effect.succeed(slug === "electronics" ? Option.some(testCategory) : Option.none()),
  create: (data) =>
    Effect.succeed(
      new Category({
        id: newCategoryId,
        name: data.name,
        parentId: data.parentId ?? null,
        image: data.image ?? null,
        slug: data.slug ?? null,
        createdAt: now,
        updatedAt: now
      })
    ),
  update: (id, data) =>
    Effect.succeed(
      id === testCategoryId
        ? Option.some(
          new Category({
            ...testCategory,
            name: data.name ?? testCategory.name,
            updatedAt: now
          })
        )
        : Option.none()
    ),
  delete: (id) => Effect.succeed(id === testCategoryId),
  count: () => Effect.succeed(1),
  ...overrides
})

// Create test layer with mock repository
const createTestLayer = (mockRepo: CategoryRepository) =>
  CategoryApplicationServiceLive.pipe(
    Layer.provide(Layer.succeed(CategoryRepositoryTag, mockRepo))
  )

describe("CategoryApplicationService", () => {
  describe("listCategories", () => {
    it.effect("should return categories with product count", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const params = new PaginationParams({})
        const categories = yield* service.listCategories(params)

        expect(categories).toHaveLength(1)
        expect(categories[0].name).toBe("Electronics")
        expect(categories[0].productCount).toBe(42)
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should return empty array when no categories", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const params = new PaginationParams({})
        const categories = yield* service.listCategories(params)

        expect(categories).toHaveLength(0)
      }).pipe(
        Effect.provide(
          createTestLayer(
            createMockRepository({
              findAllWithCount: () => Effect.succeed([])
            })
          )
        )
      ))
  })

  describe("getCategoryById", () => {
    it.effect("should return category when found", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const category = yield* service.getCategoryById(testCategoryId)

        expect(category.id).toBe(testCategoryId)
        expect(category.name).toBe("Electronics")
        expect(category.slug).toBe("electronics")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should fail with NotFound when category doesn't exist", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const result = yield* service
          .getCategoryById("non-existent-id")
          .pipe(Effect.either)

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFound)
          expect(result.left.resource).toBe("Category")
        }
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))
  })

  describe("getCategoryBySlug", () => {
    it.effect("should return category when found by slug", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const category = yield* service.getCategoryBySlug("electronics")

        expect(category.slug).toBe("electronics")
        expect(category.name).toBe("Electronics")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should fail with NotFound when slug doesn't exist", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const result = yield* service
          .getCategoryBySlug("non-existent-slug")
          .pipe(Effect.either)

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFound)
        }
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))
  })

  describe("createCategory", () => {
    it.effect("should create category successfully", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const createData = new CreateCategory({
          name: "New Category"
        })
        const category = yield* service.createCategory(createData)

        expect(category.name).toBe("New Category")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should create subcategory with parent", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const createData = new CreateCategory({
          name: "Subcategory",
          parentId: testCategoryId,
          slug: "subcategory"
        })
        const category = yield* service.createCategory(createData)

        expect(category.parentId).toBe(testCategoryId)
        expect(category.slug).toBe("subcategory")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))
  })

  describe("updateCategory", () => {
    it.effect("should update category successfully", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const updateData = new UpdateCategory({
          name: "Updated Electronics"
        })
        const category = yield* service.updateCategory(testCategoryId, updateData)

        expect(category.name).toBe("Updated Electronics")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should fail with NotFound when updating non-existent category", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const updateData = new UpdateCategory({ name: "Updated" })
        const result = yield* service
          .updateCategory("non-existent-id", updateData)
          .pipe(Effect.either)

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFound)
        }
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))
  })

  describe("deleteCategory", () => {
    it.effect("should delete category successfully", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const result = yield* service.deleteCategory(testCategoryId).pipe(Effect.either)

        expect(result._tag).toBe("Right")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should fail with NotFound when deleting non-existent category", () =>
      Effect.gen(function*() {
        const service = yield* CategoryApplicationServiceTag
        const result = yield* service
          .deleteCategory("non-existent-id")
          .pipe(Effect.either)

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFound)
        }
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))
  })
})
