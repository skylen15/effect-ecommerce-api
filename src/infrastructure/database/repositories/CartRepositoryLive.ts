import type { AddCartItem, UpdateCartItem } from "@/domain/cart/Cart.js"
import { Cart, CartItem, CartItemWithProduct, CartWithItems } from "@/domain/cart/Cart.js"
import { CartRepositoryTag } from "@/domain/cart/CartRepository.js"
import { DbSpan } from "@/shared/tracing/DbTracing.js"
import { SqlClient } from "@effect/sql"
import { BigDecimal, Effect, Layer, Option, Schema } from "effect"

const withDbSpan = DbSpan.cart

export const CartRepositoryLive = Layer.effect(
  CartRepositoryTag,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    // Use DateFromSelf because PostgreSQL returns Date objects directly
    const CartFromRow = Schema.Struct({
      id: Schema.String,
      userId: Schema.String,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const CartItemFromRow = Schema.Struct({
      id: Schema.String,
      cartId: Schema.String,
      productId: Schema.String,
      productVariantId: Schema.NullOr(Schema.String),
      quantity: Schema.Number,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const CartItemWithProductFromRow = Schema.Struct({
      id: Schema.String,
      cartId: Schema.String,
      productId: Schema.String,
      productName: Schema.String,
      productPrice: Schema.String,
      productVariantId: Schema.NullOr(Schema.String),
      variantName: Schema.NullOr(Schema.String),
      quantity: Schema.Number,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const toCart = (r: typeof CartFromRow.Type): Cart =>
      new Cart({
        id: r.id,
        userId: r.userId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })

    const toCartItem = (r: typeof CartItemFromRow.Type): CartItem =>
      new CartItem({
        id: r.id,
        cartId: r.cartId,
        productId: r.productId,
        productVariantId: r.productVariantId,
        quantity: r.quantity,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })

    const toCartItemWithProduct = (
      r: typeof CartItemWithProductFromRow.Type
    ): CartItemWithProduct => {
      const price = BigDecimal.unsafeFromNumber(
        parseFloat(r.productPrice)
      )
      const subtotal = BigDecimal.multiply(
        price,
        BigDecimal.unsafeFromNumber(r.quantity)
      )
      return new CartItemWithProduct({
        id: r.id,
        cartId: r.cartId,
        productId: r.productId,
        productName: r.productName,
        productPrice: price,
        productVariantId: r.productVariantId,
        variantName: r.variantName,
        quantity: r.quantity,
        subtotal,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })
    }

    return {
      findByUserId: (userId: string) =>
        withDbSpan(
          "findByUserId",
          sql`
            SELECT id, user_id, created_at, updated_at
            FROM cart
            WHERE user_id = ${userId}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.userId", userId)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CartFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(toCart(rows[0]))
                : Option.none()
            )
          )
        ),

      findOrCreate: (userId: string) =>
        withDbSpan(
          "findOrCreate",
          sql`
            INSERT INTO cart (user_id)
            VALUES (${userId})
            ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
            RETURNING id, user_id, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.userId", userId)),
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "UPSERT")),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CartFromRow))
            ),
            Effect.map((rows) => toCart(rows[0]))
          )
        ),

      findWithItems: (userId: string) =>
        withDbSpan(
          "findWithItems",
          Effect.gen(function*() {
            yield* Effect.annotateCurrentSpan("db.userId", userId)

            const carts = yield* sql`
              SELECT id, user_id, created_at, updated_at
              FROM cart
              WHERE user_id = ${userId}
            `.pipe(
              Effect.flatMap(
                Schema.decodeUnknown(Schema.Array(CartFromRow))
              )
            )

            if (carts.length === 0) {
              return Option.none()
            }

            const cart = toCart(carts[0])
            yield* Effect.annotateCurrentSpan("db.cartId", cart.id)

            const itemRows = yield* sql`
              SELECT ci.id, ci.cart_id, ci.product_id, p.name as product_name, p.price as product_price,
                     ci.product_variant_id, pv.name as variant_name, ci.quantity,
                     ci.created_at, ci.updated_at
              FROM cart_item ci
              JOIN product p ON p.id = ci.product_id
              LEFT JOIN product_variant pv ON pv.id = ci.product_variant_id
              WHERE ci.cart_id = ${cart.id}
              ORDER BY ci.created_at ASC
            `.pipe(
              Effect.flatMap(
                Schema.decodeUnknown(
                  Schema.Array(CartItemWithProductFromRow)
                )
              )
            )

            const items = itemRows.map(toCartItemWithProduct)
            yield* Effect.annotateCurrentSpan(
              "db.itemCount",
              items.length
            )

            const total = items.reduce(
              (acc, item) => BigDecimal.sum(acc, item.subtotal),
              BigDecimal.unsafeFromNumber(0)
            )

            return Option.some(
              new CartWithItems({
                id: cart.id,
                userId: cart.userId,
                items,
                total,
                createdAt: cart.createdAt,
                updatedAt: cart.updatedAt
              })
            )
          })
        ),

      addItem: (cartId: string, data: AddCartItem) =>
        withDbSpan(
          "addItem",
          sql`
            INSERT INTO cart_item (cart_id, product_id, product_variant_id, quantity)
            VALUES (${cartId}, ${data.productId}, ${data.productVariantId ?? null}, ${data.quantity})
            ON CONFLICT (cart_id, product_id, product_variant_id) 
            DO UPDATE SET quantity = cart_item.quantity + ${data.quantity}
            RETURNING id, cart_id, product_id, product_variant_id, quantity, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.cartId", cartId)),
            Effect.tap(() =>
              Effect.annotateCurrentSpan(
                "db.productId",
                data.productId
              )
            ),
            Effect.tap(() =>
              Effect.annotateCurrentSpan(
                "db.quantity",
                data.quantity
              )
            ),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CartItemFromRow))
            ),
            Effect.map((rows) => toCartItem(rows[0]))
          )
        ),

      updateItem: (itemId: string, data: UpdateCartItem) =>
        withDbSpan(
          "updateItem",
          sql`
            UPDATE cart_item
            SET quantity = ${data.quantity}
            WHERE id = ${itemId}
            RETURNING id, cart_id, product_id, product_variant_id, quantity, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "UPDATE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.itemId", itemId)),
            Effect.tap(() =>
              Effect.annotateCurrentSpan(
                "db.quantity",
                data.quantity
              )
            ),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(CartItemFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(toCartItem(rows[0]))
                : Option.none()
            )
          )
        ),

      removeItem: (itemId: string) =>
        withDbSpan(
          "removeItem",
          sql`DELETE FROM cart_item WHERE id = ${itemId}`.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "DELETE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.itemId", itemId)),
            Effect.map((result) => result.length > 0)
          )
        ),

      clearCart: (cartId: string) =>
        withDbSpan(
          "clearCart",
          sql`DELETE FROM cart_item WHERE cart_id = ${cartId}`.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "DELETE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.cartId", cartId)),
            Effect.asVoid
          )
        ),

      getCartItems: (cartId: string) =>
        withDbSpan(
          "getCartItems",
          sql`
            SELECT ci.id, ci.cart_id, ci.product_id, p.name as product_name, p.price as product_price,
                   ci.product_variant_id, pv.name as variant_name, ci.quantity,
                   ci.created_at, ci.updated_at
            FROM cart_item ci
            JOIN product p ON p.id = ci.product_id
            LEFT JOIN product_variant pv ON pv.id = ci.product_variant_id
            WHERE ci.cart_id = ${cartId}
            ORDER BY ci.created_at ASC
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.cartId", cartId)),
            Effect.flatMap(
              Schema.decodeUnknown(
                Schema.Array(CartItemWithProductFromRow)
              )
            ),
            Effect.map((rows) => rows.map(toCartItemWithProduct))
          )
        )
    }
  })
)
