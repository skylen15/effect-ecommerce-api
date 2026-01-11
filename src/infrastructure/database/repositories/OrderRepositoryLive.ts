import type { CreateOrder, OrderFilters, OrderStatus, UpdateOrderStatus } from "@/domain/order/Order.js"
import { Order, OrderItem, OrderWithItems } from "@/domain/order/Order.js"
import { OrderRepositoryTag } from "@/domain/order/OrderRepository.js"
import { DbSpan } from "@/shared/tracing/DbTracing.js"
import { SqlClient } from "@effect/sql"
import { BigDecimal, Effect, Layer, Option, Schema } from "effect"

const withDbSpan = DbSpan.order

export const OrderRepositoryLive = Layer.effect(
  OrderRepositoryTag,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    // Use DateFromSelf because PostgreSQL returns Date objects directly
    const OrderFromRow = Schema.Struct({
      id: Schema.String,
      userId: Schema.String,
      addressName: Schema.String,
      addressLine1: Schema.String,
      addressLine2: Schema.NullOr(Schema.String),
      city: Schema.String,
      state: Schema.NullOr(Schema.String),
      postalCode: Schema.NullOr(Schema.String),
      country: Schema.String,
      phoneNumber: Schema.String,
      status: Schema.String,
      total: Schema.String,
      couponCode: Schema.NullOr(Schema.String),
      discountAmount: Schema.String,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const OrderItemFromRow = Schema.Struct({
      id: Schema.String,
      orderId: Schema.String,
      productId: Schema.String,
      productVariantId: Schema.String,
      productName: Schema.String,
      variantName: Schema.NullOr(Schema.String),
      quantity: Schema.Number,
      price: Schema.String,
      createdAt: Schema.DateFromSelf,
      updatedAt: Schema.DateFromSelf
    })

    const toOrder = (r: typeof OrderFromRow.Type): Order =>
      new Order({
        id: r.id,
        userId: r.userId,
        addressName: r.addressName,
        addressLine1: r.addressLine1,
        addressLine2: r.addressLine2,
        city: r.city,
        state: r.state,
        postalCode: r.postalCode,
        country: r.country,
        phoneNumber: r.phoneNumber,
        status: r.status as typeof OrderStatus.Type,
        total: BigDecimal.unsafeFromNumber(parseFloat(r.total)),
        couponCode: r.couponCode,
        discountAmount: BigDecimal.unsafeFromNumber(
          parseFloat(r.discountAmount)
        ),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })

    const toOrderItem = (r: typeof OrderItemFromRow.Type): OrderItem =>
      new OrderItem({
        id: r.id,
        orderId: r.orderId,
        productId: r.productId,
        productVariantId: r.productVariantId,
        productName: r.productName,
        variantName: r.variantName,
        quantity: r.quantity,
        price: BigDecimal.unsafeFromNumber(parseFloat(r.price)),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })

    return {
      findAll: (filters: OrderFilters) =>
        withDbSpan(
          "findAll",
          sql`
            SELECT id, user_id, address_name, address_line1, address_line2, city, state,
                   postal_code, country, phone_number, status, total, coupon_code, 
                   discount_amount, created_at, updated_at
            FROM "order"
            WHERE (${filters.status ?? null}::text IS NULL OR status = ${filters.status ?? null})
            ORDER BY created_at DESC
            LIMIT ${filters.limit} OFFSET ${filters.offset}
          `.pipe(
            Effect.tap(() =>
              Effect.all([
                Effect.annotateCurrentSpan(
                  "db.limit",
                  filters.limit
                ),
                Effect.annotateCurrentSpan(
                  "db.offset",
                  filters.offset
                ),
                filters.status
                  ? Effect.annotateCurrentSpan(
                    "db.status",
                    filters.status
                  )
                  : Effect.void
              ])
            ),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(OrderFromRow))
            ),
            Effect.map((rows) => rows.map(toOrder))
          )
        ),

      findByUserId: (userId: string, filters: OrderFilters) =>
        withDbSpan(
          "findByUserId",
          sql`
            SELECT id, user_id, address_name, address_line1, address_line2, city, state,
                   postal_code, country, phone_number, status, total, coupon_code,
                   discount_amount, created_at, updated_at
            FROM "order"
            WHERE user_id = ${userId}
              AND (${filters.status ?? null}::text IS NULL OR status = ${filters.status ?? null})
            ORDER BY created_at DESC
            LIMIT ${filters.limit} OFFSET ${filters.offset}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.userId", userId)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(OrderFromRow))
            ),
            Effect.map((rows) => rows.map(toOrder))
          )
        ),

      findById: (id: string) =>
        withDbSpan(
          "findById",
          sql`
            SELECT id, user_id, address_name, address_line1, address_line2, city, state,
                   postal_code, country, phone_number, status, total, coupon_code,
                   discount_amount, created_at, updated_at
            FROM "order"
            WHERE id = ${id}
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.orderId", id)),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(OrderFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(toOrder(rows[0]))
                : Option.none()
            )
          )
        ),

      findByIdWithItems: (id: string) =>
        withDbSpan(
          "findByIdWithItems",
          Effect.gen(function*() {
            yield* Effect.annotateCurrentSpan("db.orderId", id)

            const orders = yield* sql`
              SELECT id, user_id, address_name, address_line1, address_line2, city, state,
                     postal_code, country, phone_number, status, total, coupon_code,
                     discount_amount, created_at, updated_at
              FROM "order"
              WHERE id = ${id}
            `.pipe(
              Effect.flatMap(
                Schema.decodeUnknown(Schema.Array(OrderFromRow))
              )
            )

            if (orders.length === 0) {
              return Option.none()
            }

            const order = toOrder(orders[0])
            yield* Effect.annotateCurrentSpan(
              "db.orderStatus",
              order.status
            )

            const itemRows = yield* sql`
              SELECT id, order_id, product_id, product_variant_id, product_name, variant_name,
                     quantity, price, created_at, updated_at
              FROM order_item
              WHERE order_id = ${id}
            `.pipe(
              Effect.flatMap(
                Schema.decodeUnknown(
                  Schema.Array(OrderItemFromRow)
                )
              )
            )

            const items = itemRows.map(toOrderItem)
            yield* Effect.annotateCurrentSpan(
              "db.itemCount",
              items.length
            )

            return Option.some(
              new OrderWithItems({
                ...order,
                items
              })
            )
          })
        ),

      create: (
        userId: string,
        data: CreateOrder,
        items: ReadonlyArray<OrderItem>,
        total: bigint
      ) =>
        withDbSpan(
          "create",
          Effect.gen(function*() {
            yield* Effect.annotateCurrentSpan(
              "db.operation",
              "INSERT"
            )
            yield* Effect.annotateCurrentSpan("db.userId", userId)
            yield* Effect.annotateCurrentSpan(
              "db.itemCount",
              items.length
            )

            const addr = data.shippingAddress
            const totalStr = total.toString()
            const discountStr = "0"

            const orderRows = yield* sql`
              INSERT INTO "order" (user_id, address_name, address_line1, address_line2, city, state,
                                   postal_code, country, phone_number, total, coupon_code, discount_amount)
              VALUES (${userId}, ${addr.name}, ${addr.addressLine1}, ${addr.addressLine2 ?? null},
                      ${addr.city}, ${addr.state ?? null}, ${addr.postalCode ?? null}, ${addr.country},
                      ${addr.phoneNumber}, ${totalStr}, ${data.couponCode ?? null}, ${discountStr})
              RETURNING id, user_id, address_name, address_line1, address_line2, city, state,
                        postal_code, country, phone_number, status, total, coupon_code,
                        discount_amount, created_at, updated_at
            `.pipe(
              Effect.flatMap(
                Schema.decodeUnknown(Schema.Array(OrderFromRow))
              )
            )

            const order = toOrder(orderRows[0])
            yield* Effect.annotateCurrentSpan(
              "db.orderId",
              order.id
            )

            // Insert order items
            for (const item of items) {
              const priceStr = BigDecimal.format(item.price)
              yield* sql`
                INSERT INTO order_item (order_id, product_id, product_variant_id, product_name, variant_name, quantity, price)
                VALUES (${order.id}, ${item.productId}, ${item.productVariantId}, ${item.productName}, 
                        ${item.variantName ?? null}, ${item.quantity}, ${priceStr})
              `
            }

            return order
          })
        ),

      updateStatus: (id: string, data: UpdateOrderStatus) =>
        withDbSpan(
          "updateStatus",
          sql`
            UPDATE "order"
            SET status = ${data.status}
            WHERE id = ${id}
            RETURNING id, user_id, address_name, address_line1, address_line2, city, state,
                      postal_code, country, phone_number, status, total, coupon_code,
                      discount_amount, created_at, updated_at
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.operation", "UPDATE")),
            Effect.tap(() => Effect.annotateCurrentSpan("db.orderId", id)),
            Effect.tap(() =>
              Effect.annotateCurrentSpan(
                "db.newStatus",
                data.status
              )
            ),
            Effect.flatMap(
              Schema.decodeUnknown(Schema.Array(OrderFromRow))
            ),
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(toOrder(rows[0]))
                : Option.none()
            )
          )
        ),

      count: (filters?: OrderFilters) =>
        withDbSpan(
          "count",
          sql`
            SELECT COUNT(*)::text as count
            FROM "order"
            WHERE (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
          `.pipe(
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
        ),

      countByUserId: (userId: string, filters?: OrderFilters) =>
        withDbSpan(
          "countByUserId",
          sql`
            SELECT COUNT(*)::text as count
            FROM "order"
            WHERE user_id = ${userId}
              AND (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
          `.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.userId", userId)),
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
