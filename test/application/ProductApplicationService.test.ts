import {
  ProductApplicationServiceLive,
  ProductApplicationServiceTag
} from "@/application/product/ProductApplicationService.js"
import { CreateProduct, Product, ProductFilters, ProductWithCategory, UpdateProduct } from "@/domain/product/Product.js"
import type { ProductRepository } from "@/domain/product/ProductRepository.js"
import { ProductRepositoryTag } from "@/domain/product/ProductRepository.js"
import { NotFound } from "@/shared/errors/ApiErrors.js"
import { describe, expect, it } from "@effect/vitest"
import { BigDecimal, Effect, Layer, Option } from "effect"

// Test fixtures
const testProductId = "550e8400-e29b-41d4-a716-446655440000"
const testCategoryId = "550e8400-e29b-41d4-a716-446655440001"
const newProductId = "550e8400-e29b-41d4-a716-446655440002"
const now = new Date()

const testProduct = new Product({
  id: testProductId,
  categoryId: testCategoryId,
  name: "Test Product",
  description: "A test product",
  price: BigDecimal.unsafeFromNumber(99.99),
  stock: 100,
  isActive: true,
  createdAt: now,
  updatedAt: now
})

const testProductWithCategory = new ProductWithCategory({
  id: testProductId,
  categoryId: testCategoryId,
  categoryName: "Electronics",
  name: "Test Product",
  description: "A test product",
  price: BigDecimal.unsafeFromNumber(99.99),
  stock: 100,
  isActive: true,
  createdAt: now,
  updatedAt: now
})

// Mock repository factory
const createMockRepository = (
  overrides: Partial<ProductRepository> = {}
): ProductRepository => ({
  findAll: () => Effect.succeed([testProduct]),
  findAllWithCategory: () => Effect.succeed([testProductWithCategory]),
  findById: (id) =>
    Effect.succeed(
      id === testProductId ? Option.some(testProduct) : Option.none()
    ),
  findByIdWithCategory: (id) =>
    Effect.succeed(
      id === testProductId
        ? Option.some(testProductWithCategory)
        : Option.none()
    ),
  findByCategoryId: () => Effect.succeed([testProduct]),
  create: (data) =>
    Effect.succeed(
      new Product({
        id: newProductId,
        categoryId: data.categoryId ?? null,
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now
      })
    ),
  update: (id, data) =>
    Effect.succeed(
      id === testProductId
        ? Option.some(
          new Product({
            ...testProduct,
            name: data.name ?? testProduct.name,
            description: data.description ?? testProduct.description,
            updatedAt: now
          })
        )
        : Option.none()
    ),
  delete: (id) => Effect.succeed(id === testProductId),
  count: () => Effect.succeed(1),
  ...overrides
})

// Create test layer with mock repository
const createTestLayer = (mockRepo: ProductRepository) =>
  ProductApplicationServiceLive.pipe(
    Layer.provide(Layer.succeed(ProductRepositoryTag, mockRepo))
  )

describe("ProductApplicationService", () => {
  describe("listProducts", () => {
    it.effect("should return products list", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const filters = new ProductFilters({})
        const products = yield* service.listProducts(filters)

        expect(products).toHaveLength(1)
        expect(products[0].name).toBe("Test Product")
        expect(products[0].categoryName).toBe("Electronics")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should return empty array when no products", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const filters = new ProductFilters({})
        const products = yield* service.listProducts(filters)

        expect(products).toHaveLength(0)
      }).pipe(
        Effect.provide(
          createTestLayer(
            createMockRepository({
              findAllWithCategory: () => Effect.succeed([])
            })
          )
        )
      ))
  })

  describe("getProductById", () => {
    it.effect("should return product when found", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const product = yield* service.getProductById(testProductId)

        expect(product.id).toBe(testProductId)
        expect(product.name).toBe("Test Product")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should fail with NotFound when product doesn't exist", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const result = yield* service
          .getProductById("non-existent-id")
          .pipe(Effect.either)

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFound)
          expect(result.left.resource).toBe("Product")
        }
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))
  })

  describe("createProduct", () => {
    it.effect("should create product successfully", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const createData = new CreateProduct({
          name: "New Product",
          description: "New product description",
          price: BigDecimal.unsafeFromNumber(49.99),
          stock: 50
        })
        const product = yield* service.createProduct(createData)

        expect(product.name).toBe("New Product")
        expect(product.stock).toBe(50)
        expect(product.isActive).toBe(true)
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect("should create product with category", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const createData = new CreateProduct({
          categoryId: testCategoryId,
          name: "Categorized Product",
          description: "Has category",
          price: BigDecimal.unsafeFromNumber(29.99),
          stock: 25
        })
        const product = yield* service.createProduct(createData)

        expect(product.categoryId).toBe(testCategoryId)
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))
  })

  describe("updateProduct", () => {
    it.effect("should update product successfully", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const updateData = new UpdateProduct({
          name: "Updated Product Name"
        })
        const product = yield* service.updateProduct(
          testProductId,
          updateData
        )

        expect(product.name).toBe("Updated Product Name")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect(
      "should fail with NotFound when updating non-existent product",
      () =>
        Effect.gen(function*() {
          const service = yield* ProductApplicationServiceTag
          const updateData = new UpdateProduct({ name: "Updated" })
          const result = yield* service
            .updateProduct("non-existent-id", updateData)
            .pipe(Effect.either)

          expect(result._tag).toBe("Left")
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(NotFound)
          }
        }).pipe(Effect.provide(createTestLayer(createMockRepository())))
    )
  })

  describe("deleteProduct", () => {
    it.effect("should delete product successfully", () =>
      Effect.gen(function*() {
        const service = yield* ProductApplicationServiceTag
        const result = yield* service
          .deleteProduct(testProductId)
          .pipe(Effect.either)

        expect(result._tag).toBe("Right")
      }).pipe(Effect.provide(createTestLayer(createMockRepository()))))

    it.effect(
      "should fail with NotFound when deleting non-existent product",
      () =>
        Effect.gen(function*() {
          const service = yield* ProductApplicationServiceTag
          const result = yield* service
            .deleteProduct("non-existent-id")
            .pipe(Effect.either)

          expect(result._tag).toBe("Left")
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(NotFound)
          }
        }).pipe(Effect.provide(createTestLayer(createMockRepository())))
    )
  })
})
