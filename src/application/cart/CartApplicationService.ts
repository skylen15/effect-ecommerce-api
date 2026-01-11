import type { AddCartItem, CartItem, UpdateCartItem } from "@/domain/cart/Cart.js"
import { CartWithItems } from "@/domain/cart/Cart.js"
import { CartRepositoryTag } from "@/domain/cart/CartRepository.js"
import type { CurrentUser } from "@/domain/user/User.js"
import { NotFound, Unauthorized } from "@/shared/errors/ApiErrors.js"
import { BigDecimal, Context, Effect, Layer, Option } from "effect"

export interface CartApplicationService {
  readonly getCart: (
    user: CurrentUser
  ) => Effect.Effect<CartWithItems, Unauthorized>
  readonly addItem: (
    user: CurrentUser,
    data: AddCartItem
  ) => Effect.Effect<CartItem, Unauthorized>
  readonly updateItem: (
    user: CurrentUser,
    itemId: string,
    data: UpdateCartItem
  ) => Effect.Effect<CartItem, Unauthorized | NotFound>
  readonly removeItem: (
    user: CurrentUser,
    itemId: string
  ) => Effect.Effect<void, Unauthorized | NotFound>
  readonly clearCart: (
    user: CurrentUser
  ) => Effect.Effect<void, Unauthorized>
}

export class CartApplicationServiceTag extends Context.Tag(
  "CartApplicationService"
)<CartApplicationServiceTag, CartApplicationService>() {}

export const CartApplicationServiceLive = Layer.effect(
  CartApplicationServiceTag,
  Effect.gen(function*() {
    const repo = yield* CartRepositoryTag

    const requireUser = (user: CurrentUser) =>
      user
        ? Effect.succeed(user)
        : Effect.fail(
          new Unauthorized({
            message: "Must be logged in to access cart"
          })
        )

    return {
      getCart: (user) =>
        Effect.gen(function*() {
          const validUser = yield* requireUser(user)
          yield* Effect.annotateCurrentSpan("user.id", validUser.id)

          const cartOpt = yield* repo
            .findWithItems(validUser.id)
            .pipe(Effect.orDie)

          if (Option.isSome(cartOpt)) {
            yield* Effect.annotateCurrentSpan("cart.itemCount", cartOpt.value.items.length)
            return cartOpt.value
          }

          // Create empty cart
          const cart = yield* repo
            .findOrCreate(validUser.id)
            .pipe(Effect.orDie)

          yield* Effect.annotateCurrentSpan("cart.id", cart.id)
          yield* Effect.annotateCurrentSpan("cart.created", true)

          return new CartWithItems({
            id: cart.id,
            userId: cart.userId,
            items: [],
            total: BigDecimal.unsafeFromNumber(0),
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt
          })
        }).pipe(Effect.withSpan("CartService.getCart")),

      addItem: (user, data) =>
        Effect.gen(function*() {
          const validUser = yield* requireUser(user)
          yield* Effect.annotateCurrentSpan("user.id", validUser.id)
          yield* Effect.annotateCurrentSpan("product.id", data.productId)
          yield* Effect.annotateCurrentSpan("quantity", data.quantity)

          const cart = yield* repo
            .findOrCreate(validUser.id)
            .pipe(Effect.orDie)
          yield* Effect.annotateCurrentSpan("cart.id", cart.id)

          return yield* repo
            .addItem(cart.id, data)
            .pipe(Effect.orDie)
        }).pipe(Effect.withSpan("CartService.addItem")),

      updateItem: (user, itemId, data) =>
        Effect.gen(function*() {
          yield* requireUser(user)
          yield* Effect.annotateCurrentSpan("item.id", itemId)
          yield* Effect.annotateCurrentSpan("quantity", data.quantity)

          const result = yield* repo
            .updateItem(itemId, data)
            .pipe(Effect.orDie)

          if (Option.isNone(result)) {
            return yield* new NotFound({
              resource: "CartItem",
              id: itemId
            })
          }

          return result.value
        }).pipe(Effect.withSpan("CartService.updateItem")),

      removeItem: (user, itemId) =>
        Effect.gen(function*() {
          yield* requireUser(user)
          yield* Effect.annotateCurrentSpan("item.id", itemId)

          const deleted = yield* repo
            .removeItem(itemId)
            .pipe(Effect.orDie)

          if (!deleted) {
            return yield* new NotFound({
              resource: "CartItem",
              id: itemId
            })
          }
        }).pipe(Effect.withSpan("CartService.removeItem")),

      clearCart: (user) =>
        Effect.gen(function*() {
          const validUser = yield* requireUser(user)
          yield* Effect.annotateCurrentSpan("user.id", validUser.id)

          const cartOpt = yield* repo
            .findByUserId(validUser.id)
            .pipe(Effect.orDie)

          if (Option.isSome(cartOpt)) {
            yield* Effect.annotateCurrentSpan("cart.id", cartOpt.value.id)
            yield* repo
              .clearCart(cartOpt.value.id)
              .pipe(Effect.orDie)
          }
        }).pipe(Effect.withSpan("CartService.clearCart"))
    }
  })
)
