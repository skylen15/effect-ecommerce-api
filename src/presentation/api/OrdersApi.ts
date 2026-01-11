import { CreateOrder, Order, OrderWithItems, UpdateOrderStatus } from "@/domain/order/Order.js"
import { RequireAdmin, RequireAuth } from "@/presentation/middleware/Authentication.js"
import { Forbidden, NotFound, ValidationError } from "@/shared/errors/ApiErrors.js"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"

// Order status for query params (as string)
const OrderStatusQuery = Schema.optional(Schema.String)

// Create order (checkout) - requires auth
// Note: Unauthorized error is automatically included via RequireAuth middleware
const createOrder = HttpApiEndpoint.post("createOrder", "/orders")
  .addSuccess(Order)
  .addError(ValidationError)
  .setPayload(CreateOrder)
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "Create order")
  .annotate(
    OpenApi.Description,
    "Creates a new order from the user's cart (checkout)"
  )

// List user's orders - requires auth
const listOrders = HttpApiEndpoint.get("listOrders", "/orders")
  .addSuccess(Schema.Array(Order))
  .setUrlParams(
    Schema.Struct({
      status: OrderStatusQuery,
      limit: Schema.optionalWith(
        Schema.NumberFromString.pipe(Schema.int(), Schema.positive()),
        { default: () => 20 }
      ),
      offset: Schema.optionalWith(
        Schema.NumberFromString.pipe(
          Schema.int(),
          Schema.nonNegative()
        ),
        {
          default: () => 0
        }
      )
    })
  )
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "List orders")
  .annotate(OpenApi.Description, "Returns the current user's orders")

// Get order by ID - requires auth (users can only see own orders)
// Note: Forbidden is a business logic error (viewing someone else's order), not from middleware
const getOrderById = HttpApiEndpoint.get("getOrderById", "/orders/:id")
  .addSuccess(OrderWithItems)
  .addError(Forbidden)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "Get order by ID")
  .annotate(
    OpenApi.Description,
    "Returns order details (users can only view their own orders, admins can view all)"
  )

// Update order status - admin only
const updateOrderStatus = HttpApiEndpoint.patch(
  "updateOrderStatus",
  "/orders/:id/status"
)
  .addSuccess(Order)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .setPayload(UpdateOrderStatus)
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "Update order status")
  .annotate(
    OpenApi.Description,
    "Updates the status of an order (admin only)"
  )

// List all orders - admin only
const listAllOrders = HttpApiEndpoint.get("listAllOrders", "/admin/orders")
  .addSuccess(Schema.Array(Order))
  .setUrlParams(
    Schema.Struct({
      status: OrderStatusQuery,
      limit: Schema.optionalWith(
        Schema.NumberFromString.pipe(Schema.int(), Schema.positive()),
        { default: () => 20 }
      ),
      offset: Schema.optionalWith(
        Schema.NumberFromString.pipe(
          Schema.int(),
          Schema.nonNegative()
        ),
        {
          default: () => 0
        }
      )
    })
  )
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "List all orders")
  .annotate(OpenApi.Description, "Returns all orders (admin only)")

export class OrdersApi extends HttpApiGroup.make("orders")
  .add(createOrder)
  .add(listOrders)
  .add(getOrderById)
  .add(updateOrderStatus)
  .add(listAllOrders)
  .annotate(OpenApi.Title, "Orders")
  .annotate(OpenApi.Description, "Order management endpoints")
{}
