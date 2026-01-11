import type { ConflictError } from "@/shared/errors/ApiErrors.js"
import type { PaginationParams } from "@/shared/types/Common.js"
import type { SqlError } from "@effect/sql/SqlError"
import type { Effect, Option } from "effect"
import { Context } from "effect"
import type { ParseError } from "effect/ParseResult"
import type { Category, CategoryWithCount, CreateCategory, UpdateCategory } from "./Category.js"

export type RepositoryError = SqlError | ParseError | ConflictError

export interface CategoryRepository {
  readonly findAll: (
    params: PaginationParams
  ) => Effect.Effect<ReadonlyArray<Category>, RepositoryError>
  readonly findAllWithCount: (
    params: PaginationParams
  ) => Effect.Effect<ReadonlyArray<CategoryWithCount>, RepositoryError>
  readonly findById: (
    id: string
  ) => Effect.Effect<Option.Option<Category>, RepositoryError>
  readonly findBySlug: (
    slug: string
  ) => Effect.Effect<Option.Option<Category>, RepositoryError>
  readonly create: (
    data: CreateCategory
  ) => Effect.Effect<Category, RepositoryError>
  readonly update: (
    id: string,
    data: UpdateCategory
  ) => Effect.Effect<Option.Option<Category>, RepositoryError>
  readonly delete: (id: string) => Effect.Effect<boolean, RepositoryError>
  readonly count: () => Effect.Effect<number, RepositoryError>
}

export class CategoryRepositoryTag extends Context.Tag("CategoryRepository")<
  CategoryRepositoryTag,
  CategoryRepository
>() {}
