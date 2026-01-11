import type {
  CreateProduct,
  Product,
  ProductFilters,
  ProductWithCategory,
  UpdateProduct
} from "@/domain/product/Product.js"
import { ProductRepositoryTag } from "@/domain/product/ProductRepository.js"
import { type ConflictError, NotFound } from "@/shared/errors/ApiErrors.js"

import { Context, Effect, Layer, Option } from "effect"

export interface ProductApplicationService {
  readonly listProducts: (
    filters: ProductFilters
  ) => Effect.Effect<ReadonlyArray<ProductWithCategory>, never>
  readonly getProductById: (
    id: string
  ) => Effect.Effect<ProductWithCategory, NotFound>
  readonly createProduct: (
    data: CreateProduct
  ) => Effect.Effect<Product, ConflictError>
  readonly updateProduct: (
    id: string,
    data: UpdateProduct
  ) => Effect.Effect<Product, NotFound | ConflictError>
  readonly deleteProduct: (id: string) => Effect.Effect<void, NotFound>
}

export class ProductApplicationServiceTag extends Context.Tag(
  "ProductApplicationService"
)<ProductApplicationServiceTag, ProductApplicationService>() {}

export const ProductApplicationServiceLive = Layer.effect(
  ProductApplicationServiceTag,
  Effect.gen(function*() {
    const repo = yield* ProductRepositoryTag

    return {
      listProducts: (filters) =>
        repo.findAllWithCategory(filters).pipe(
          Effect.orDie,
          Effect.withSpan("ProductService.listProducts", {
            attributes: {
              categoryId: filters.categoryId ?? undefined
            }
          })
        ),

      getProductById: (id) =>
        repo.findByIdWithCategory(id).pipe(
          Effect.orDie,
          Effect.flatMap((opt) =>
            Option.isSome(opt)
              ? Effect.succeed(opt.value)
              : new NotFound({ resource: "Product", id })
          ),
          Effect.withSpan("ProductService.getProductById", {
            attributes: { productId: id }
          })
        ),

      createProduct: (data) =>
        repo.create(data).pipe(
          Effect.catchTag("ConflictError", (e) => Effect.fail(e)),
          Effect.orDie,
          Effect.withSpan("ProductService.createProduct", {
            attributes: { name: data.name }
          })
        ),

      updateProduct: (id, data) =>
        repo.update(id, data).pipe(
          Effect.catchTag("ConflictError", (e) => Effect.fail(e)),
          Effect.orDie,
          Effect.flatMap((opt) =>
            Option.isSome(opt)
              ? Effect.succeed(opt.value)
              : new NotFound({ resource: "Product", id })
          ),
          Effect.withSpan("ProductService.updateProduct", {
            attributes: { productId: id }
          })
        ),

      deleteProduct: (id) =>
        repo.delete(id).pipe(
          Effect.orDie,
          Effect.flatMap((deleted) =>
            deleted
              ? Effect.void
              : new NotFound({ resource: "Product", id })
          ),
          Effect.withSpan("ProductService.deleteProduct", {
            attributes: { productId: id }
          })
        )
    }
  })
)
