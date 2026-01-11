import type { SqlError } from "@effect/sql/SqlError"
import type { Effect, Option } from "effect"
import { Context } from "effect"
import type { ParseError } from "effect/ParseResult"
import type { CreateOrder, Order, OrderFilters, OrderItem, OrderWithItems, UpdateOrderStatus } from "./Order.js"

export type RepositoryError = SqlError | ParseError

export interface OrderRepository {
  readonly findAll: (filters: OrderFilters) => Effect.Effect<ReadonlyArray<Order>, RepositoryError>
  readonly findByUserId: (userId: string, filters: OrderFilters) => Effect.Effect<ReadonlyArray<Order>, RepositoryError>
  readonly findById: (id: string) => Effect.Effect<Option.Option<Order>, RepositoryError>
  readonly findByIdWithItems: (id: string) => Effect.Effect<Option.Option<OrderWithItems>, RepositoryError>
  readonly create: (
    userId: string,
    data: CreateOrder,
    items: ReadonlyArray<OrderItem>,
    total: bigint
  ) => Effect.Effect<Order, RepositoryError>
  readonly updateStatus: (id: string, data: UpdateOrderStatus) => Effect.Effect<Option.Option<Order>, RepositoryError>
  readonly count: (filters?: OrderFilters) => Effect.Effect<number, RepositoryError>
  readonly countByUserId: (userId: string, filters?: OrderFilters) => Effect.Effect<number, RepositoryError>
}

export class OrderRepositoryTag extends Context.Tag("OrderRepository")<
  OrderRepositoryTag,
  OrderRepository
>() {}
