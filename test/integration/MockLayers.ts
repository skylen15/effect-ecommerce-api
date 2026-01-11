import { CategoryApplicationServiceTag } from "@/application/category/CategoryApplicationService.js"
import { ProductApplicationServiceTag } from "@/application/product/ProductApplicationService.js"
import { Category, CategoryWithCount } from "@/domain/category/Category.js"
import { Product, ProductWithCategory } from "@/domain/product/Product.js"
import { User } from "@/domain/user/User.js"
import { JwksVerifierTag } from "@/infrastructure/auth/JwksVerifier.js"
import { RequireAdmin, RequireAuth } from "@/presentation/middleware/Authentication.js"
import { BigDecimal, Effect, Layer, Option, Redacted } from "effect"
import { TestIds, TestTokens } from "./TestUtils.js"

const now = new Date()

// Mock Products
const mockProduct = new Product({
  id: TestIds.productId,
  categoryId: TestIds.categoryId,
  name: "Test Product",
  description: "A test product",
  price: BigDecimal.unsafeFromNumber(99.99),
  stock: 100,
  isActive: true,
  createdAt: now,
  updatedAt: now
})

const mockProductWithCategory = new ProductWithCategory({
  id: TestIds.productId,
  categoryId: TestIds.categoryId,
  categoryName: "Electronics",
  name: "Test Product",
  description: "A test product",
  price: BigDecimal.unsafeFromNumber(99.99),
  stock: 100,
  isActive: true,
  createdAt: now,
  updatedAt: now
})

// Mock Categories
const mockCategory = new Category({
  id: TestIds.categoryId,
  name: "Electronics",
  parentId: null,
  image: null,
  slug: "electronics",
  createdAt: now,
  updatedAt: now
})

const mockCategoryWithCount = new CategoryWithCount({
  id: TestIds.categoryId,
  name: "Electronics",
  parentId: null,
  image: null,
  slug: "electronics",
  productCount: 10,
  createdAt: now,
  updatedAt: now
})

// Mock Users
const mockUser = new User({
  id: TestIds.userId,
  email: "user@test.com",
  name: "Test User",
  role: "user"
})

const mockAdmin = new User({
  id: TestIds.adminId,
  email: "admin@test.com",
  name: "Test Admin",
  role: "admin"
})

/**
 * Mock JWKS Verifier - recognizes test tokens
 */
export const MockJwksVerifierLive = Layer.succeed(JwksVerifierTag, {
  verify: (token: string) => {
    if (token === TestTokens.validUser) {
      return Effect.succeed(Option.some(mockUser))
    }
    if (token === TestTokens.validAdmin) {
      return Effect.succeed(Option.some(mockAdmin))
    }
    return Effect.succeed(Option.none())
  }
})

/**
 * Mock RequireAuth middleware
 */
export const MockRequireAuthLive = Layer.effect(
  RequireAuth,
  Effect.gen(function*() {
    const verifier = yield* JwksVerifierTag

    return {
      bearer: (token: Redacted.Redacted<string>) =>
        Effect.gen(function*() {
          const tokenValue = Redacted.value(token)
          const userOption = yield* verifier.verify(tokenValue)

          if (Option.isNone(userOption)) {
            const { Unauthorized } = yield* Effect.promise(
              () => import("@/shared/errors/ApiErrors.js")
            )
            return yield* new Unauthorized({
              message: "Invalid or expired token"
            })
          }

          return userOption.value
        })
    }
  })
).pipe(Layer.provide(MockJwksVerifierLive))

/**
 * Mock RequireAdmin middleware
 */
export const MockRequireAdminLive = Layer.effect(
  RequireAdmin,
  Effect.gen(function*() {
    const verifier = yield* JwksVerifierTag

    return {
      bearer: (token: Redacted.Redacted<string>) =>
        Effect.gen(function*() {
          const tokenValue = Redacted.value(token)
          const userOption = yield* verifier.verify(tokenValue)

          const { Forbidden, Unauthorized } = yield* Effect.promise(
            () => import("@/shared/errors/ApiErrors.js")
          )

          if (Option.isNone(userOption)) {
            return yield* new Unauthorized({
              message: "Invalid or expired token"
            })
          }

          const user = userOption.value
          if (user.role !== "admin") {
            return yield* new Forbidden({
              message: "Admin access required"
            })
          }

          return user
        })
    }
  })
).pipe(Layer.provide(MockJwksVerifierLive))

/**
 * Mock Product Application Service
 */
export const MockProductApplicationServiceLive = Layer.succeed(
  ProductApplicationServiceTag,
  {
    listProducts: () => Effect.succeed([mockProductWithCategory]),

    getProductById: (id) =>
      id === TestIds.productId
        ? Effect.succeed(mockProductWithCategory)
        : Effect.promise(
          () => import("@/shared/errors/ApiErrors.js")
        ).pipe(
          Effect.flatMap(
            ({ NotFound }) => new NotFound({ resource: "Product", id })
          )
        ),

    createProduct: (data) =>
      Effect.succeed(
        new Product({
          id: "550e8400-e29b-41d4-a716-446655440099",
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

    updateProduct: (id, data) =>
      id === TestIds.productId
        ? Effect.succeed(
          new Product({
            ...mockProduct,
            name: data.name ?? mockProduct.name,
            updatedAt: now
          })
        )
        : Effect.promise(
          () => import("@/shared/errors/ApiErrors.js")
        ).pipe(
          Effect.flatMap(
            ({ NotFound }) => new NotFound({ resource: "Product", id })
          )
        ),

    deleteProduct: (id) =>
      id === TestIds.productId
        ? Effect.void
        : Effect.promise(
          () => import("@/shared/errors/ApiErrors.js")
        ).pipe(
          Effect.flatMap(
            ({ NotFound }) => new NotFound({ resource: "Product", id })
          )
        )
  }
)

/**
 * Mock Category Application Service
 */
export const MockCategoryApplicationServiceLive = Layer.succeed(
  CategoryApplicationServiceTag,
  {
    listCategories: () => Effect.succeed([mockCategoryWithCount]),

    getCategoryById: (id) =>
      id === TestIds.categoryId
        ? Effect.succeed(mockCategory)
        : Effect.promise(
          () => import("@/shared/errors/ApiErrors.js")
        ).pipe(
          Effect.flatMap(
            ({ NotFound }) => new NotFound({ resource: "Category", id })
          )
        ),

    getCategoryBySlug: (slug) =>
      slug === "electronics"
        ? Effect.succeed(mockCategory)
        : Effect.promise(
          () => import("@/shared/errors/ApiErrors.js")
        ).pipe(
          Effect.flatMap(
            ({ NotFound }) => new NotFound({ resource: "Category", id: slug })
          )
        ),

    createCategory: (data) =>
      Effect.succeed(
        new Category({
          id: "550e8400-e29b-41d4-a716-446655440098",
          name: data.name,
          parentId: data.parentId ?? null,
          image: data.image ?? null,
          slug: data.slug ?? null,
          createdAt: now,
          updatedAt: now
        })
      ),

    updateCategory: (id, data) =>
      id === TestIds.categoryId
        ? Effect.succeed(
          new Category({
            ...mockCategory,
            name: data.name ?? mockCategory.name,
            updatedAt: now
          })
        )
        : Effect.promise(
          () => import("@/shared/errors/ApiErrors.js")
        ).pipe(
          Effect.flatMap(
            ({ NotFound }) => new NotFound({ resource: "Category", id })
          )
        ),

    deleteCategory: (id) =>
      id === TestIds.categoryId
        ? Effect.void
        : Effect.promise(
          () => import("@/shared/errors/ApiErrors.js")
        ).pipe(
          Effect.flatMap(
            ({ NotFound }) => new NotFound({ resource: "Category", id })
          )
        )
  }
)
