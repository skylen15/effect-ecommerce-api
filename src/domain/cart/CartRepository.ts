import type { SqlError } from "@effect/sql/SqlError"
import type { Effect, Option } from "effect"
import { Context } from "effect"
import type { ParseError } from "effect/ParseResult"
import type { AddCartItem, Cart, CartItem, CartItemWithProduct, CartWithItems, UpdateCartItem } from "./Cart.js"

export type RepositoryError = SqlError | ParseError

export interface CartRepository {
  readonly findByUserId: (userId: string) => Effect.Effect<Option.Option<Cart>, RepositoryError>
  readonly findOrCreate: (userId: string) => Effect.Effect<Cart, RepositoryError>
  readonly findWithItems: (userId: string) => Effect.Effect<Option.Option<CartWithItems>, RepositoryError>
  readonly addItem: (cartId: string, data: AddCartItem) => Effect.Effect<CartItem, RepositoryError>
  readonly updateItem: (itemId: string, data: UpdateCartItem) => Effect.Effect<Option.Option<CartItem>, RepositoryError>
  readonly removeItem: (itemId: string) => Effect.Effect<boolean, RepositoryError>
  readonly clearCart: (cartId: string) => Effect.Effect<void, RepositoryError>
  readonly getCartItems: (cartId: string) => Effect.Effect<ReadonlyArray<CartItemWithProduct>, RepositoryError>
}

export class CartRepositoryTag extends Context.Tag("CartRepository")<
  CartRepositoryTag,
  CartRepository
>() {}
