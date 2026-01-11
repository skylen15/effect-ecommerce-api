import { OrderApplicationServiceTag } from "@/application/order/OrderApplicationService.js"
import type { OrderStatus } from "@/domain/order/Order.js"
import { CreateOrder, OrderFilters, ShippingAddress, UpdateOrderStatus } from "@/domain/order/Order.js"
import type { User } from "@/domain/user/User.js"
import { CurrentUserContext } from "@/domain/user/User.js"
import { EcommerceApi } from "@/presentation/api/EcommerceApi.js"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"

export const OrdersHandler = HttpApiBuilder.group(
  EcommerceApi,
  "orders",
  (handlers) =>
    handlers
      .handle("createOrder", ({ payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan(
            "http.route",
            "POST /orders"
          )
          yield* Effect.annotateCurrentSpan(
            "shipping.city",
            payload.shippingAddress.city
          )
          yield* Effect.annotateCurrentSpan(
            "shipping.country",
            payload.shippingAddress.country
          )

          const service = yield* OrderApplicationServiceTag
          const user = yield* CurrentUserContext

          const data = new CreateOrder({
            shippingAddress: new ShippingAddress({
              name: payload.shippingAddress.name,
              addressLine1: payload.shippingAddress.addressLine1,
              addressLine2: payload.shippingAddress.addressLine2,
              city: payload.shippingAddress.city,
              state: payload.shippingAddress.state,
              postalCode: payload.shippingAddress.postalCode,
              country: payload.shippingAddress.country,
              phoneNumber: payload.shippingAddress.phoneNumber
            }),
            couponCode: payload.couponCode
          })

          // user is guaranteed non-null by RequireAuth middleware
          const order = yield* service.createOrder(
            user as User,
            data
          )
          yield* Effect.annotateCurrentSpan("order.id", order.id)
          return order
        }).pipe(Effect.withSpan("HTTP.createOrder")))
      .handle("listOrders", ({ urlParams }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan(
            "http.route",
            "GET /orders"
          )
          if (urlParams.status) {
            yield* Effect.annotateCurrentSpan(
              "filter.status",
              urlParams.status
            )
          }

          const service = yield* OrderApplicationServiceTag
          const user = yield* CurrentUserContext

          const filters = new OrderFilters({
            status: urlParams.status as
              | typeof OrderStatus.Type
              | undefined,
            limit: urlParams.limit,
            offset: urlParams.offset
          })

          const orders = yield* service.listOrders(
            user as User,
            filters
          )
          yield* Effect.annotateCurrentSpan(
            "result.count",
            orders.length
          )
          return orders
        }).pipe(Effect.withSpan("HTTP.listOrders")))
      .handle("getOrderById", ({ path }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan(
            "http.route",
            "GET /orders/:id"
          )
          yield* Effect.annotateCurrentSpan("order.id", path.id)

          const service = yield* OrderApplicationServiceTag
          const user = yield* CurrentUserContext
          return yield* service.getOrderById(user as User, path.id)
        }).pipe(Effect.withSpan("HTTP.getOrderById")))
      .handle("updateOrderStatus", ({ path, payload }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan(
            "http.route",
            "PUT /orders/:id/status"
          )
          yield* Effect.annotateCurrentSpan("order.id", path.id)
          yield* Effect.annotateCurrentSpan(
            "order.newStatus",
            payload.status
          )

          const service = yield* OrderApplicationServiceTag
          const data = new UpdateOrderStatus({
            status: payload.status
          })
          return yield* service.updateOrderStatus(path.id, data)
        }).pipe(Effect.withSpan("HTTP.updateOrderStatus")))
      .handle("listAllOrders", ({ urlParams }) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan(
            "http.route",
            "GET /admin/orders"
          )
          if (urlParams.status) {
            yield* Effect.annotateCurrentSpan(
              "filter.status",
              urlParams.status
            )
          }

          const service = yield* OrderApplicationServiceTag
          const filters = new OrderFilters({
            status: urlParams.status as
              | typeof OrderStatus.Type
              | undefined,
            limit: urlParams.limit,
            offset: urlParams.offset
          })
          const orders = yield* service.listAllOrders(filters)
          yield* Effect.annotateCurrentSpan(
            "result.count",
            orders.length
          )
          return orders
        }).pipe(Effect.withSpan("HTTP.listAllOrders")))
)
