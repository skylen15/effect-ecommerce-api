import { CartApplicationServiceTag } from "@/application/cart/CartApplicationService.js"
import { AddCartItem, UpdateCartItem } from "@/domain/cart/Cart.js"
import { CurrentUserContext } from "@/domain/user/User.js"
import { EcommerceApi } from "@/presentation/api/EcommerceApi.js"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"

export const CartHandler = HttpApiBuilder.group(
  EcommerceApi,
  "cart",
  (handlers) =>
    handlers
      .handle("getCart", () =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "GET /cart")

          const service = yield* CartApplicationServiceTag
          const user = yield* CurrentUserContext
          const cart = yield* service.getCart(user)
          yield* Effect.annotateCurrentSpan("cart.itemCount", cart.items.length)
          return cart
        }).pipe(Effect.withSpan("HTTP.getCart")))
      .handle("addCartItem", ({ payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "POST /cart/items")
          yield* Effect.annotateCurrentSpan("product.id", payload.productId)
          yield* Effect.annotateCurrentSpan("quantity", payload.quantity)

          const service = yield* CartApplicationServiceTag
          const user = yield* CurrentUserContext
          const data = new AddCartItem({
            productId: payload.productId,
            productVariantId: payload.productVariantId,
            quantity: payload.quantity
          })
          return yield* service.addItem(user, data)
        }).pipe(Effect.withSpan("HTTP.addCartItem")))
      .handle("updateCartItem", ({ path, payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "PUT /cart/items/:id")
          yield* Effect.annotateCurrentSpan("item.id", path.id)
          yield* Effect.annotateCurrentSpan("quantity", payload.quantity)

          const service = yield* CartApplicationServiceTag
          const user = yield* CurrentUserContext
          const data = new UpdateCartItem({
            quantity: payload.quantity
          })
          return yield* service.updateItem(user, path.id, data)
        }).pipe(Effect.withSpan("HTTP.updateCartItem")))
      .handle("removeCartItem", ({ path }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "DELETE /cart/items/:id")
          yield* Effect.annotateCurrentSpan("item.id", path.id)

          const service = yield* CartApplicationServiceTag
          const user = yield* CurrentUserContext
          yield* service.removeItem(user, path.id)
        }).pipe(Effect.withSpan("HTTP.removeCartItem")))
      .handle("clearCart", () =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("http.route", "DELETE /cart")

          const service = yield* CartApplicationServiceTag
          const user = yield* CurrentUserContext
          yield* service.clearCart(user)
        }).pipe(Effect.withSpan("HTTP.clearCart")))
)
