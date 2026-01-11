import { CategoryApplicationServiceTag } from "@/application/category/CategoryApplicationService.js"
import { CreateCategory, UpdateCategory } from "@/domain/category/Category.js"
import { EcommerceApi } from "@/presentation/api/EcommerceApi.js"
import { PaginationParams } from "@/shared/types/Common.js"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"

export const CategoriesHandler = HttpApiBuilder.group(
  EcommerceApi,
  "categories",
  (handlers) =>
    handlers
      .handle("listCategories", ({ urlParams }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "GET /categories")

          const service = yield* CategoryApplicationServiceTag
          const params = new PaginationParams({
            limit: urlParams.limit,
            offset: urlParams.offset
          })
          const categories = yield* service.listCategories(params)
          yield* Effect.annotateCurrentSpan("result.count", categories.length)
          return categories
        }).pipe(Effect.withSpan("HTTP.listCategories")))
      .handle("getCategoryById", ({ path }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "GET /categories/:id")
          yield* Effect.annotateCurrentSpan("category.id", path.id)

          const service = yield* CategoryApplicationServiceTag
          return yield* service.getCategoryById(path.id)
        }).pipe(Effect.withSpan("HTTP.getCategoryById")))
      .handle("createCategory", ({ payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "POST /categories")
          yield* Effect.annotateCurrentSpan("category.name", payload.name)
          if (payload.slug) {
            yield* Effect.annotateCurrentSpan("category.slug", payload.slug)
          }

          const service = yield* CategoryApplicationServiceTag
          const data = new CreateCategory({
            name: payload.name,
            parentId: payload.parentId,
            image: payload.image,
            slug: payload.slug
          })
          const category = yield* service.createCategory(data)
          yield* Effect.annotateCurrentSpan("category.id", category.id)
          return category
        }).pipe(Effect.withSpan("HTTP.createCategory")))
      .handle("updateCategory", ({ path, payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "PUT /categories/:id")
          yield* Effect.annotateCurrentSpan("category.id", path.id)

          const service = yield* CategoryApplicationServiceTag
          const data = new UpdateCategory({
            name: payload.name,
            parentId: payload.parentId,
            image: payload.image,
            slug: payload.slug
          })
          return yield* service.updateCategory(path.id, data)
        }).pipe(Effect.withSpan("HTTP.updateCategory")))
      .handle("deleteCategory", ({ path }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "DELETE /categories/:id")
          yield* Effect.annotateCurrentSpan("category.id", path.id)

          const service = yield* CategoryApplicationServiceTag
          yield* service.deleteCategory(path.id)
        }).pipe(Effect.withSpan("HTTP.deleteCategory")))
)
