import type { Category, CategoryWithCount, CreateCategory, UpdateCategory } from "@/domain/category/Category.js"
import { CategoryRepositoryTag } from "@/domain/category/CategoryRepository.js"
import type { ConflictError } from "@/shared/errors/ApiErrors.js"
import { NotFound } from "@/shared/errors/ApiErrors.js"
import type { PaginationParams } from "@/shared/types/Common.js"
import { Context, Effect, Layer, Option } from "effect"

export interface CategoryApplicationService {
  readonly listCategories: (
    params: PaginationParams
  ) => Effect.Effect<ReadonlyArray<CategoryWithCount>, never>
  readonly getCategoryById: (id: string) => Effect.Effect<Category, NotFound>
  readonly getCategoryBySlug: (
    slug: string
  ) => Effect.Effect<Category, NotFound>
  readonly createCategory: (
    data: CreateCategory
  ) => Effect.Effect<Category, ConflictError>
  readonly updateCategory: (
    id: string,
    data: UpdateCategory
  ) => Effect.Effect<Category, NotFound | ConflictError>
  readonly deleteCategory: (id: string) => Effect.Effect<void, NotFound>
}

export class CategoryApplicationServiceTag extends Context.Tag(
  "CategoryApplicationService"
)<CategoryApplicationServiceTag, CategoryApplicationService>() {}

export const CategoryApplicationServiceLive = Layer.effect(
  CategoryApplicationServiceTag,
  Effect.gen(function*() {
    const repo = yield* CategoryRepositoryTag

    return {
      listCategories: (params) =>
        repo.findAllWithCount(params).pipe(
          Effect.orDie,
          Effect.withSpan("CategoryService.listCategories")
        ),

      getCategoryById: (id) =>
        repo.findById(id).pipe(
          Effect.orDie,
          Effect.flatMap((opt) =>
            Option.isSome(opt)
              ? Effect.succeed(opt.value)
              : new NotFound({ resource: "Category", id })
          ),
          Effect.withSpan("CategoryService.getCategoryById", {
            attributes: { categoryId: id }
          })
        ),

      getCategoryBySlug: (slug) =>
        repo.findBySlug(slug).pipe(
          Effect.orDie,
          Effect.flatMap((opt) =>
            Option.isSome(opt)
              ? Effect.succeed(opt.value)
              : new NotFound({ resource: "Category", id: slug })
          ),
          Effect.withSpan("CategoryService.getCategoryBySlug", {
            attributes: { slug }
          })
        ),

      createCategory: (data) =>
        repo.create(data).pipe(
          Effect.catchTag("ConflictError", (e) => Effect.fail(e)),
          Effect.orDie,
          Effect.withSpan("CategoryService.createCategory", {
            attributes: { name: data.name, slug: data.slug ?? undefined }
          })
        ),

      updateCategory: (id, data) =>
        repo.update(id, data).pipe(
          Effect.catchTag("ConflictError", (e) => Effect.fail(e)),
          Effect.orDie,
          Effect.flatMap((opt) =>
            Option.isSome(opt)
              ? Effect.succeed(opt.value)
              : new NotFound({ resource: "Category", id })
          ),
          Effect.withSpan("CategoryService.updateCategory", {
            attributes: { categoryId: id }
          })
        ),

      deleteCategory: (id) =>
        repo.delete(id).pipe(
          Effect.orDie,
          Effect.flatMap((deleted) =>
            deleted
              ? Effect.void
              : new NotFound({ resource: "Category", id })
          ),
          Effect.withSpan("CategoryService.deleteCategory", {
            attributes: { categoryId: id }
          })
        )
    }
  })
)
