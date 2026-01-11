import { CartRepositoryTag } from "@/domain/cart/CartRepository.js"
import type { CreateOrder, Order, OrderFilters, OrderWithItems, UpdateOrderStatus } from "@/domain/order/Order.js"
import { OrderItem } from "@/domain/order/Order.js"
import { OrderRepositoryTag } from "@/domain/order/OrderRepository.js"
import type { User } from "@/domain/user/User.js"
import { Forbidden, NotFound, ValidationError } from "@/shared/errors/ApiErrors.js"
import { BigDecimal, Context, Effect, Layer, Option } from "effect"

export interface OrderApplicationService {
  readonly listOrders: (
    user: User,
    filters: OrderFilters
  ) => Effect.Effect<ReadonlyArray<Order>, never>
  readonly getOrderById: (
    user: User,
    id: string
  ) => Effect.Effect<OrderWithItems, NotFound | Forbidden>
  readonly createOrder: (
    user: User,
    data: CreateOrder
  ) => Effect.Effect<Order, ValidationError>
  readonly updateOrderStatus: (
    id: string,
    data: UpdateOrderStatus
  ) => Effect.Effect<Order, NotFound>
  readonly listAllOrders: (
    filters: OrderFilters
  ) => Effect.Effect<ReadonlyArray<Order>, never>
}

export class OrderApplicationServiceTag extends Context.Tag(
  "OrderApplicationService"
)<OrderApplicationServiceTag, OrderApplicationService>() {}

export const OrderApplicationServiceLive = Layer.effect(
  OrderApplicationServiceTag,
  Effect.gen(function*() {
    const orderRepo = yield* OrderRepositoryTag
    const cartRepo = yield* CartRepositoryTag

    return {
      listOrders: (user, filters) =>
        orderRepo.findByUserId(user.id, filters).pipe(
          Effect.orDie,
          Effect.withSpan("OrderService.listOrders", {
            attributes: { userId: user.id }
          })
        ),

      getOrderById: (user, id) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("order.id", id)
          yield* Effect.annotateCurrentSpan("user.id", user.id)
          yield* Effect.annotateCurrentSpan("user.role", user.role)

          const orderOpt = yield* orderRepo
            .findByIdWithItems(id)
            .pipe(Effect.orDie)

          if (Option.isNone(orderOpt)) {
            return yield* new NotFound({ resource: "Order", id })
          }

          const order = orderOpt.value
          yield* Effect.annotateCurrentSpan("order.status", order.status)
          yield* Effect.annotateCurrentSpan("order.itemCount", order.items.length)

          // Non-admin can only view own orders
          if (user.role !== "admin" && order.userId !== user.id) {
            yield* Effect.annotateCurrentSpan("access.denied", true)
            return yield* new Forbidden({
              message: "Cannot access other users' orders"
            })
          }

          return order
        }).pipe(Effect.withSpan("OrderService.getOrderById")),

      createOrder: (user, data) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan("user.id", user.id)

          // Get user's cart
          const cartOpt = yield* cartRepo
            .findWithItems(user.id)
            .pipe(Effect.orDie)

          if (
            Option.isNone(cartOpt) ||
            cartOpt.value.items.length === 0
          ) {
            yield* Effect.annotateCurrentSpan("cart.empty", true)
            return yield* new ValidationError({
              message: "Cart is empty"
            })
          }

          const cart = cartOpt.value
          yield* Effect.annotateCurrentSpan("cart.id", cart.id)
          yield* Effect.annotateCurrentSpan("cart.itemCount", cart.items.length)

          // Convert cart items to order items
          const orderItems: Array<OrderItem> = cart.items.map(
            (item) =>
              new OrderItem({
                id: crypto.randomUUID(),
                orderId: "", // Will be set by repo
                productId: item.productId,
                productVariantId: item.productVariantId ?? item.productId, // Fallback to product ID
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                price: item.productPrice,
                createdAt: new Date(),
                updatedAt: new Date()
              })
          )

          // Calculate total
          const totalBigDecimal = cart.items.reduce(
            (acc, item) => BigDecimal.sum(acc, item.subtotal),
            BigDecimal.unsafeFromNumber(0)
          )
          const total = BigInt(
            Math.round(
              BigDecimal.unsafeToNumber(totalBigDecimal) * 100
            )
          ) / 100n

          // Create order
          const order = yield* orderRepo
            .create(user.id, data, orderItems, total)
            .pipe(Effect.orDie)

          yield* Effect.annotateCurrentSpan("order.id", order.id)
          yield* Effect.annotateCurrentSpan("order.total", Number(total))

          // Clear cart after successful order
          yield* cartRepo.clearCart(cart.id).pipe(Effect.orDie)

          return order
        }).pipe(Effect.withSpan("OrderService.createOrder")),

      updateOrderStatus: (id, data) =>
        orderRepo.updateStatus(id, data).pipe(
          Effect.orDie,
          Effect.flatMap((opt) =>
            Option.isSome(opt)
              ? Effect.succeed(opt.value)
              : new NotFound({ resource: "Order", id })
          ),
          Effect.withSpan("OrderService.updateOrderStatus", {
            attributes: { orderId: id, newStatus: data.status }
          })
        ),

      listAllOrders: (filters) =>
        orderRepo.findAll(filters).pipe(
          Effect.orDie,
          Effect.withSpan("OrderService.listAllOrders")
        )
    }
  })
)
