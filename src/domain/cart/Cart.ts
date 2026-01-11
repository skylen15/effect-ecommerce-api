import { Schema } from "effect"

// Cart entity
export class Cart extends Schema.Class<Cart>("Cart")({
  id: Schema.UUID,
  userId: Schema.UUID,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Cart item entity
export class CartItem extends Schema.Class<CartItem>("CartItem")({
  id: Schema.UUID,
  cartId: Schema.UUID,
  productId: Schema.UUID,
  productVariantId: Schema.NullOr(Schema.UUID),
  quantity: Schema.Int.pipe(Schema.positive()),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Cart item with product info for display
export class CartItemWithProduct extends Schema.Class<CartItemWithProduct>("CartItemWithProduct")({
  id: Schema.UUID,
  cartId: Schema.UUID,
  productId: Schema.UUID,
  productName: Schema.String,
  productPrice: Schema.BigDecimal,
  productVariantId: Schema.NullOr(Schema.UUID),
  variantName: Schema.NullOr(Schema.String),
  quantity: Schema.Int,
  subtotal: Schema.BigDecimal,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Cart with items
export class CartWithItems extends Schema.Class<CartWithItems>("CartWithItems")({
  id: Schema.UUID,
  userId: Schema.UUID,
  items: Schema.Array(CartItemWithProduct),
  total: Schema.BigDecimal,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Add item to cart DTO
export class AddCartItem extends Schema.Class<AddCartItem>("AddCartItem")({
  productId: Schema.UUID,
  productVariantId: Schema.optionalWith(Schema.UUID, { nullable: true }),
  quantity: Schema.Int.pipe(Schema.positive())
}) {}

// Update cart item DTO
export class UpdateCartItem extends Schema.Class<UpdateCartItem>("UpdateCartItem")({
  quantity: Schema.Int.pipe(Schema.positive())
}) {}
