import type { CreateCategory, UpdateCategory } from "@/domain/category/Category.js"
import { Category, CategoryWithCount } from "@/domain/category/Category.js"
import { CategoryRepositoryTag } from "@/domain/category/CategoryRepository.js"
import { ConflictError } from "@/shared/errors/ApiErrors.js"
import { DbSpan } from "@/shared/tracing/DbTracing.js"
import type { PaginationParams } from "@/shared/types/Common.js"
import { SqlClient, SqlError } from "@effect/sql"
import { Effect, Layer, Option, Schema } from "effect"

const withDbSpan = DbSpan.category

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof SqlError.SqlError &&
  error.cause instanceof Error &&
  "code" in error.cause &&
  error.cause.code === "23505"

export const CategoryRepositoryLive = Layer.effect(
  CategoryRepositoryTag,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    // Use DateFromSelf because PostgreSQL returns Date objects directly
    const CategoryFromRow = Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      parentId: Schema.NullOr(Schema.String),
      image: Schema.NullOr(Schema.String),
      slug: Schema.NullOr(Schema.String),
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const CategoryWithCountFromRow = Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      parentId: Schema.NullOr(Schema.String),
      image: Schema.NullOr(Schema.String),
      slug: Schema.NullOr(Schema.String),
      productCount: Schema.NumberFromString,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    return {
      findAll: (params: PaginationParams) =>
        withDbSpan(
          "findAll",
          sql`
            SELECT id, name, parent_id, image, slug, created_at, updated_at
            FROM category
            ORDER BY name ASC
            LIMIT ${params.limit} OFFSET ${params.offset}
          `.pipe(
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CategoryFromRow))
            ),
            Effect.map((rows) =>
              rows.map(
                (r) =>
                  new Category({
                    id: r.id,
                    name: r.name,
                    parentId: r.parentId,
                    image: r.image,
                    slug: r.slug,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt
                  })
              )
            )
          )
        ),

      findAllWithCount: (params: PaginationParams) =>
        withDbSpan(
          "findAllWithCount",
          sql`
            SELECT c.id, c.name, c.parent_id, c.image, c.slug, 
                   COUNT(p.id)::text as product_count,
                   c.created_at, c.updated_at
            FROM category c
            LEFT JOIN product p ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY c.name ASC
            LIMIT ${params.limit} OFFSET ${params.offset}
          `.pipe(
            Effect.flatMap(
              Schema.decodeUnknown(
                Schema.Array(CategoryWithCountFromRow)
              )
            ),
            Effect.map((rows) =>
              rows.map(
                (r) =>
                  new CategoryWithCount({
                    id: r.id,
                    name: r.name,
                    parentId: r.parentId,
                    image: r.image,
                    slug: r.slug,
                    productCount: r.productCount,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt
                  })
              )
            )
          )
        ),

      findById: (id: string) =>
        withDbSpan(
          "findById",
          sql`
            SELECT id, name, parent_id, image, slug, created_at, updated_at
            FROM category
            WHERE id = ${id}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.categoryId", id)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CategoryFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(
                  new Category({
                    id: rows[0].id,
                    name: rows[0].name,
                    parentId: rows[0].parentId,
                    image: rows[0].image,
                    slug: rows[0].slug,
                    createdAt: rows[0].createdAt,
                    updatedAt: rows[0].updatedAt
                  })
                )
                : Option.none()
            )
          )
        ),

      findBySlug: (slug: string) =>
        withDbSpan(
          "findBySlug",
          sql`
            SELECT id, name, parent_id, image, slug, created_at, updated_at
            FROM category
            WHERE slug = ${slug}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.slug", slug)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CategoryFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(
                  new Category({
                    id: rows[0].id,
                    name: rows[0].name,
                    parentId: rows[0].parentId,
                    image: rows[0].image,
                    slug: rows[0].slug,
                    createdAt: rows[0].createdAt,
                    updatedAt: rows[0].updatedAt
                  })
                )
                : Option.none()
            )
          )
        ),

      create: (data: CreateCategory) =>
        withDbSpan(
          "create",
          sql`
            INSERT INTO category (name, parent_id, image, slug)
            VALUES (${data.name}, ${data.parentId ?? null}, ${data.image ?? null}, ${data.slug ?? null})
            RETURNING id, name, parent_id, image, slug, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "INSERT")),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CategoryFromRow))
            ),
            Effect.map(
              (rows) =>
                new Category({
                  id: rows[0].id,
                  name: rows[0].name,
                  parentId: rows[0].parentId,
                  image: rows[0].image,
                  slug: rows[0].slug,
                  createdAt: rows[0].createdAt,
                  updatedAt: rows[0].updatedAt
                })
            ),
            Effect.catchIf(
              isUniqueViolation,
              () =>
                new ConflictError({
                  message: `Category with slug "${data.slug}" already exists`
                })
            )
          )
        ),

      update: (id: string, data: UpdateCategory) =>
        withDbSpan(
          "update",
          sql`
            UPDATE category
            SET 
              name = COALESCE(${data.name ?? null}, name),
              parent_id = COALESCE(${data.parentId ?? null}, parent_id),
              image = COALESCE(${data.image ?? null}, image),
              slug = COALESCE(${data.slug ?? null}, slug)
            WHERE id = ${id}
            RETURNING id, name, parent_id, image, slug, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "UPDATE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.categoryId", id)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CategoryFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(
                  new Category({
                    id: rows[0].id,
                    name: rows[0].name,
                    parentId: rows[0].parentId,
                    image: rows[0].image,
                    slug: rows[0].slug,
                    createdAt: rows[0].createdAt,
                    updatedAt: rows[0].updatedAt
                  })
                )
                : Option.none()
            ),
            Effect.catchIf(
              isUniqueViolation,
              () =>
                new ConflictError({
                  message: `Category with slug "${data.slug}" already exists`
                })
            )
          )
        ),

      delete: (id: string) =>
        withDbSpan(
          "delete",
          sql`
            DELETE FROM category WHERE id = ${id}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "DELETE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.categoryId", id)),
            Effect.map((result) => result.length > 0)
          )
        ),

      count: () =>
        withDbSpan(
          "count",
          sql`SELECT COUNT(*)::text as count FROM category`.pipe(
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
