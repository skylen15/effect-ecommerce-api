import { ProductApplicationServiceTag } from "@/application/product/ProductApplicationService.js"
import { CreateProduct, ProductFilters, UpdateProduct } from "@/domain/product/Product.js"
import { EcommerceApi } from "@/presentation/api/EcommerceApi.js"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"

export const ProductsHandler = HttpApiBuilder.group(
  EcommerceApi,
  "products",
  (handlers) =>
    handlers
      .handle("listProducts", ({ urlParams }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "GET /products")
          if (urlParams.categoryId) {
            yield* Effect.annotateCurrentSpan("filter.categoryId", urlParams.categoryId)
          }
          if (urlParams.search) {
            yield* Effect.annotateCurrentSpan("filter.search", urlParams.search)
          }

          const service = yield* ProductApplicationServiceTag
          const filters = new ProductFilters({
            categoryId: urlParams.categoryId,
            search: urlParams.search,
            isActive: urlParams.isActive,
            limit: urlParams.limit,
            offset: urlParams.offset
          })
          const products = yield* service.listProducts(filters)
          yield* Effect.annotateCurrentSpan("result.count", products.length)
          return products
        }).pipe(Effect.withSpan("HTTP.listProducts")))
      .handle("getProductById", ({ path }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "GET /products/:id")
          yield* Effect.annotateCurrentSpan("product.id", path.id)

          const service = yield* ProductApplicationServiceTag
          return yield* service.getProductById(path.id)
        }).pipe(Effect.withSpan("HTTP.getProductById")))
      .handle("createProduct", ({ payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "POST /products")
          yield* Effect.annotateCurrentSpan("product.name", payload.name)

          const service = yield* ProductApplicationServiceTag
          const data = new CreateProduct({
            categoryId: payload.categoryId,
            name: payload.name,
            description: payload.description,
            price: payload.price,
            stock: payload.stock,
            isActive: payload.isActive
          })
          const product = yield* service.createProduct(data)
          yield* Effect.annotateCurrentSpan("product.id", product.id)
          return product
        }).pipe(Effect.withSpan("HTTP.createProduct")))
      .handle("updateProduct", ({ path, payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "PUT /products/:id")
          yield* Effect.annotateCurrentSpan("product.id", path.id)

          const service = yield* ProductApplicationServiceTag
          const data = new UpdateProduct({
            categoryId: payload.categoryId,
            name: payload.name,
            description: payload.description,
            price: payload.price,
            stock: payload.stock,
            isActive: payload.isActive
          })
          return yield* service.updateProduct(path.id, data)
        }).pipe(Effect.withSpan("HTTP.updateProduct")))
      .handle("deleteProduct", ({ path }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "DELETE /products/:id")
          yield* Effect.annotateCurrentSpan("product.id", path.id)

          const service = yield* ProductApplicationServiceTag
          yield* service.deleteProduct(path.id)
        }).pipe(Effect.withSpan("HTTP.deleteProduct")))
)
