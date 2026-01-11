import type { ConflictError } from "@/shared/errors/ApiErrors.js"
import type { SqlError } from "@effect/sql/SqlError"
import type { Effect, Option } from "effect"
import { Context } from "effect"
import type { ParseError } from "effect/ParseResult"
import type { CreateProduct, Product, ProductFilters, ProductWithCategory, UpdateProduct } from "./Product.js"

export type RepositoryError = SqlError | ParseError | ConflictError

export interface ProductRepository {
  readonly findAll: (filters: ProductFilters) => Effect.Effect<ReadonlyArray<Product>, RepositoryError>
  readonly findAllWithCategory: (
    filters: ProductFilters
  ) => Effect.Effect<ReadonlyArray<ProductWithCategory>, RepositoryError>
  readonly findById: (id: string) => Effect.Effect<Option.Option<Product>, RepositoryError>
  readonly findByIdWithCategory: (id: string) => Effect.Effect<Option.Option<ProductWithCategory>, RepositoryError>
  readonly findByCategoryId: (
    categoryId: string,
    filters: ProductFilters
  ) => Effect.Effect<ReadonlyArray<Product>, RepositoryError>
  readonly create: (data: CreateProduct) => Effect.Effect<Product, RepositoryError>
  readonly update: (id: string, data: UpdateProduct) => Effect.Effect<Option.Option<Product>, RepositoryError>
  readonly delete: (id: string) => Effect.Effect<boolean, RepositoryError>
  readonly count: (filters?: ProductFilters) => Effect.Effect<number, RepositoryError>
}

export class ProductRepositoryTag extends Context.Tag("ProductRepository")<
  ProductRepositoryTag,
  ProductRepository
>() {}
