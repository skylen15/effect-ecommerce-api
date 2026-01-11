import { Schema } from "effect"

// Order status enum
export const OrderStatus = Schema.Literal("pending", "processing", "shipped", "delivered", "cancelled")
export type OrderStatus = typeof OrderStatus.Type

// Order entity
export class Order extends Schema.Class<Order>("Order")({
  id: Schema.UUID,
  userId: Schema.UUID,
  addressName: Schema.String,
  addressLine1: Schema.String,
  addressLine2: Schema.NullOr(Schema.String),
  city: Schema.String,
  state: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  country: Schema.String,
  phoneNumber: Schema.String,
  status: OrderStatus,
  total: Schema.BigDecimal,
  couponCode: Schema.NullOr(Schema.String),
  discountAmount: Schema.BigDecimal,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Order item entity
export class OrderItem extends Schema.Class<OrderItem>("OrderItem")({
  id: Schema.UUID,
  orderId: Schema.UUID,
  productId: Schema.UUID,
  productVariantId: Schema.UUID,
  productName: Schema.String,
  variantName: Schema.NullOr(Schema.String),
  quantity: Schema.Int.pipe(Schema.positive()),
  price: Schema.BigDecimal,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Order with items
export class OrderWithItems extends Schema.Class<OrderWithItems>("OrderWithItems")({
  id: Schema.UUID,
  userId: Schema.UUID,
  addressName: Schema.String,
  addressLine1: Schema.String,
  addressLine2: Schema.NullOr(Schema.String),
  city: Schema.String,
  state: Schema.NullOr(Schema.String),
  postalCode: Schema.NullOr(Schema.String),
  country: Schema.String,
  phoneNumber: Schema.String,
  status: OrderStatus,
  total: Schema.BigDecimal,
  couponCode: Schema.NullOr(Schema.String),
  discountAmount: Schema.BigDecimal,
  items: Schema.Array(OrderItem),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Shipping address for checkout
export class ShippingAddress extends Schema.Class<ShippingAddress>("ShippingAddress")({
  name: Schema.String.pipe(Schema.minLength(1)),
  addressLine1: Schema.String.pipe(Schema.minLength(1)),
  addressLine2: Schema.optionalWith(Schema.String, { nullable: true }),
  city: Schema.String.pipe(Schema.minLength(1)),
  state: Schema.optionalWith(Schema.String, { nullable: true }),
  postalCode: Schema.optionalWith(Schema.String, { nullable: true }),
  country: Schema.String.pipe(Schema.minLength(1)),
  phoneNumber: Schema.String.pipe(Schema.minLength(1))
}) {}

// Create order (checkout) DTO
export class CreateOrder extends Schema.Class<CreateOrder>("CreateOrder")({
  shippingAddress: ShippingAddress,
  couponCode: Schema.optionalWith(Schema.String, { nullable: true })
}) {}

// Update order status DTO (admin only)
export class UpdateOrderStatus extends Schema.Class<UpdateOrderStatus>("UpdateOrderStatus")({
  status: OrderStatus
}) {}

// Order filter params
export class OrderFilters extends Schema.Class<OrderFilters>("OrderFilters")({
  status: Schema.optionalWith(OrderStatus, { nullable: true }),
  limit: Schema.optionalWith(Schema.Int.pipe(Schema.positive(), Schema.lessThanOrEqualTo(100)), {
    default: () => 20
  }),
  offset: Schema.optionalWith(Schema.Int.pipe(Schema.nonNegative()), { default: () => 0 })
}) {}
