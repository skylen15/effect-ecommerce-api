import { AddCartItem, CartItem, CartWithItems, UpdateCartItem } from "@/domain/cart/Cart.js"
import { RequireAuth } from "@/presentation/middleware/Authentication.js"
import { NotFound } from "@/shared/errors/ApiErrors.js"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"

// Get cart (requires auth)
// Note: Unauthorized error is automatically included via RequireAuth middleware
const getCart = HttpApiEndpoint.get("getCart", "/cart")
  .addSuccess(CartWithItems)
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "Get cart")
  .annotate(
    OpenApi.Description,
    "Returns the current user's cart with items"
  )

// Add item to cart
const addCartItem = HttpApiEndpoint.post("addCartItem", "/cart/items")
  .addSuccess(CartItem)
  .setPayload(AddCartItem)
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "Add item to cart")
  .annotate(
    OpenApi.Description,
    "Adds a product to the cart or increases quantity if already present"
  )

// Update cart item quantity
const updateCartItem = HttpApiEndpoint.patch(
  "updateCartItem",
  "/cart/items/:id"
)
  .addSuccess(CartItem)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .setPayload(UpdateCartItem)
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "Update cart item")
  .annotate(OpenApi.Description, "Updates the quantity of a cart item")

// Remove cart item
const removeCartItem = HttpApiEndpoint.del("removeCartItem", "/cart/items/:id")
  .addSuccess(Schema.Void)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "Remove cart item")
  .annotate(OpenApi.Description, "Removes an item from the cart")

// Clear cart
const clearCart = HttpApiEndpoint.del("clearCart", "/cart")
  .addSuccess(Schema.Void)
  .middleware(RequireAuth)
  .annotate(OpenApi.Summary, "Clear cart")
  .annotate(OpenApi.Description, "Removes all items from the cart")

export class CartApi extends HttpApiGroup.make("cart")
  .add(getCart)
  .add(addCartItem)
  .add(updateCartItem)
  .add(removeCartItem)
  .add(clearCart)
  .annotate(OpenApi.Title, "Cart")
  .annotate(OpenApi.Description, "Shopping cart management")
{}
