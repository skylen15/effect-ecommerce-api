import type { CreateProduct, ProductFilters, UpdateProduct } from "@/domain/product/Product.js"
import { Product, ProductWithCategory } from "@/domain/product/Product.js"
import { ProductRepositoryTag } from "@/domain/product/ProductRepository.js"
import { ConflictError } from "@/shared/errors/ApiErrors.js"
import { DbSpan } from "@/shared/tracing/DbTracing.js"
import { SqlClient, SqlError } from "@effect/sql"
import { BigDecimal, Effect, Layer, Option, Schema } from "effect"

const withDbSpan = DbSpan.product

// Helper to check for unique constraint violation (PostgreSQL error code 23505)
const isUniqueViolation = (error: unknown): boolean =>
  error instanceof SqlError.SqlError &&
  error.cause instanceof Error &&
  "code" in error.cause &&
  error.cause.code === "23505"

export const ProductRepositoryLive = Layer.effect(
  ProductRepositoryTag,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    // Use DateFromSelf because PostgreSQL returns Date objects directly
    const ProductFromRow = Schema.Struct({
      id: Schema.String,
      categoryId: Schema.NullOr(Schema.String),
      name: Schema.String,
      description: Schema.String,
      price: Schema.String, // Numeric comes as string
      stock: Schema.Number,
      isActive: Schema.Boolean,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const ProductWithCategoryFromRow = Schema.Struct({
      id: Schema.String,
      categoryId: Schema.NullOr(Schema.String),
      categoryName: Schema.NullOr(Schema.String),
      name: Schema.String,
      description: Schema.String,
      price: Schema.String,
      stock: Schema.Number,
      isActive: Schema.Boolean,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const toProduct = (r: typeof ProductFromRow.Type): Product =>
      new Product({
        id: r.id,
        categoryId: r.categoryId,
        name: r.name,
        description: r.description,
        price: BigDecimal.unsafeFromNumber(parseFloat(r.price)),
        stock: r.stock,
        isActive: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })

    const toProductWithCategory = (
      r: typeof ProductWithCategoryFromRow.Type
    ): ProductWithCategory =>
      new ProductWithCategory({
        id: r.id,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        name: r.name,
        description: r.description,
        price: BigDecimal.unsafeFromNumber(parseFloat(r.price)),
        stock: r.stock,
        isActive: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })

    return {
      findAll: (filters: ProductFilters) =>
        withDbSpan(
          "findAll",
          sql`
            SELECT id, category_id, name, description, price, stock, is_active, created_at, updated_at
            FROM product
            WHERE 
              (${filters.categoryId ?? null}::uuid IS NULL OR category_id = ${filters.categoryId ?? null})
              AND (${filters.isActive ?? null}::boolean IS NULL OR is_active = ${filters.isActive ?? null})
              AND (${filters.search ?? null}::text IS NULL OR name ILIKE '%' || ${filters.search ?? ""} || '%')
            ORDER BY created_at DESC
            LIMIT ${filters.limit} OFFSET ${filters.offset}
          `.pipe(
            Effect.tap(() =>
              Effect.all([
                Effect.annotateCurrentSpan(
                  "db.limit",
                  filters.limit
                ),
                Effect.annotateCurrentSpan(
                  "db.offset",
                  filters.offset
                ),
                filters.categoryId
                  ? Effect.annotateCurrentSpan(
                    "db.categoryId",
                    filters.categoryId
                  )
                  : Effect.void,
                filters.search
                  ? Effect.annotateCurrentSpan(
                    "db.search",
                    filters.search
                  )
                  : Effect.void
              ])
            ),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(ProductFromRow))
            ),
            Effect.map((rows) => rows.map(toProduct))
          )
        ),

      findAllWithCategory: (filters: ProductFilters) =>
        withDbSpan(
          "findAllWithCategory",
          sql`
            SELECT p.id, p.category_id, c.name as category_name, p.name, p.description, 
                   p.price, p.stock, p.is_active, p.created_at, p.updated_at
            FROM product p
            LEFT JOIN category c ON c.id = p.category_id
            WHERE 
              (${filters.categoryId ?? null}::uuid IS NULL OR p.category_id = ${filters.categoryId ?? null})
              AND (${filters.isActive ?? null}::boolean IS NULL OR p.is_active = ${filters.isActive ?? null})
              AND (${filters.search ?? null}::text IS NULL OR p.name ILIKE '%' || ${filters.search ?? ""} || '%')
            ORDER BY p.created_at DESC
            LIMIT ${filters.limit} OFFSET ${filters.offset}
          `.pipe(
            Effect.tap(() =>
              Effect.all([
                Effect.annotateCurrentSpan(
                  "db.limit",
                  filters.limit
                ),
                Effect.annotateCurrentSpan(
                  "db.offset",
                  filters.offset
                ),
                filters.categoryId
                  ? Effect.annotateCurrentSpan(
                    "db.categoryId",
                    filters.categoryId
                  )
                  : Effect.void
              ])
            ),
            Effect.flatMap(
              Schema.decodeUnknown(
                Schema.Array(ProductWithCategoryFromRow)
              )
            ),
            Effect.map((rows) => rows.map(toProductWithCategory))
          )
        ),

      findById: (id: string) =>
        withDbSpan(
          "findById",
          sql`
            SELECT id, category_id, name, description, price, stock, is_active, created_at, updated_at
            FROM product
            WHERE id = ${id}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.productId", id)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(ProductFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(toProduct(rows[0]))
                : Option.none()
            )
          )
        ),

      findByIdWithCategory: (id: string) =>
        withDbSpan(
          "findByIdWithCategory",
          sql`
            SELECT p.id, p.category_id, c.name as category_name, p.name, p.description,
                   p.price, p.stock, p.is_active, p.created_at, p.updated_at
            FROM product p
            LEFT JOIN category c ON c.id = p.category_id
            WHERE p.id = ${id}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.productId", id)),
            Effect.flatMap(
              Schema.decodeUnknown(
                Schema.Array(ProductWithCategoryFromRow)
              )
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(toProductWithCategory(rows[0]))
                : Option.none()
            )
          )
        ),

      findByCategoryId: (categoryId: string, filters: ProductFilters) =>
        withDbSpan(
          "findByCategoryId",
          sql`
            SELECT id, category_id, name, description, price, stock, is_active, created_at, updated_at
            FROM product
            WHERE category_id = ${categoryId}
              AND (${filters.isActive ?? null}::boolean IS NULL OR is_active = ${filters.isActive ?? null})
            ORDER BY created_at DESC
            LIMIT ${filters.limit} OFFSET ${filters.offset}
          `.pipe(
            Effect.tap(() =>
              Effect.annotateCurrentSpan(
                "db.categoryId",
                categoryId
              )
            ),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(ProductFromRow))
            ),
            Effect.map((rows) => rows.map(toProduct))
          )
        ),

      create: (data: CreateProduct) => {
        const priceStr = BigDecimal.format(data.price)
        return withDbSpan(
          "create",
          sql`
            INSERT INTO product (category_id, name, description, price, stock, is_active)
            VALUES (${
            data.categoryId ?? null
          }, ${data.name}, ${data.description}, ${priceStr}, ${data.stock}, ${data.isActive})
            RETURNING id, category_id, name, description, price, stock, is_active, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "INSERT")),
            Effect.tap(() =>
              Effect.annotateCurrentSpan(
                "db.productName",
                data.name
              )
            ),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(ProductFromRow))
            ),
            Effect.map((rows) => toProduct(rows[0])),
            Effect.catchIf(
              isUniqueViolation,
              () =>
                new ConflictError({
                  message: `Product with this identifier already exists`
                })
            )
          )
        )
      },

      update: (id: string, data: UpdateProduct) => {
        const priceStr = data.price
          ? BigDecimal.format(data.price)
          : null
        return withDbSpan(
          "update",
          sql`
            UPDATE product
            SET 
              category_id = COALESCE(${data.categoryId ?? null}, category_id),
              name = COALESCE(${data.name ?? null}, name),
              description = COALESCE(${data.description ?? null}, description),
              price = COALESCE(${priceStr}, price),
              stock = COALESCE(${data.stock ?? null}, stock),
              is_active = COALESCE(${data.isActive ?? null}, is_active)
            WHERE id = ${id}
            RETURNING id, category_id, name, description, price, stock, is_active, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "UPDATE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.productId", id)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(ProductFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(toProduct(rows[0]))
                : Option.none()
            ),
            Effect.catchIf(
              isUniqueViolation,
              () =>
                new ConflictError({
                  message: `Product with this identifier already exists`
                })
            )
          )
        )
      },

      delete: (id: string) =>
        withDbSpan(
          "delete",
          sql`DELETE FROM product WHERE id = ${id}`.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "DELETE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.productId", id)),
            Effect.map((result) => result.length > 0)
          )
        ),

      count: (filters?: ProductFilters) =>
        withDbSpan(
          "count",
          sql`
            SELECT COUNT(*)::text as count 
            FROM product
            WHERE 
              (${filters?.categoryId ?? null}::uuid IS NULL OR category_id = ${filters?.categoryId ?? null})
              AND (${filters?.isActive ?? null}::boolean IS NULL OR is_active = ${filters?.isActive ?? null})
          `.pipe(
            Effect.flatMap(
              Schema.decodeUnknown(
                Schema.Array(
                  Schema.Struct({
                    count: Schema.NumberFromString
                  })
                )
              )
            ),
            Effect.map((rows) => rows[0]?.count ?? 0)
          )
        )
    }
  })
)
