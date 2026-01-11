import { PaginationParams } from "@/shared/types/Common.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

describe("Common Types", () => {
  describe("PaginationParams", () => {
    it.effect("should use default values", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(PaginationParams)({})

        expect(decoded.limit).toBe(20)
        expect(decoded.offset).toBe(0)
      }))

    it.effect("should accept custom limit and offset", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(PaginationParams)({
          limit: 50,
          offset: 100
        })

        expect(decoded.limit).toBe(50)
        expect(decoded.offset).toBe(100)
      }))

    it.effect("should accept minimum valid values", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(PaginationParams)({
          limit: 1,
          offset: 0
        })

        expect(decoded.limit).toBe(1)
        expect(decoded.offset).toBe(0)
      }))

    it.effect("should accept maximum limit of 100", () =>
      Effect.gen(function*() {
        const decoded = yield* Schema.decode(PaginationParams)({
          limit: 100
        })

        expect(decoded.limit).toBe(100)
      }))

    it.effect("should fail with limit exceeding 100", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decode(PaginationParams)({
          limit: 101
        }).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with limit of 0", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decode(PaginationParams)({
          limit: 0
        }).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with negative limit", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decode(PaginationParams)({
          limit: -10
        }).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with negative offset", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decode(PaginationParams)({
          offset: -5
        }).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with non-integer limit", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decode(PaginationParams)({
          limit: 10.5
        }).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail with non-integer offset", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decode(PaginationParams)({
          offset: 5.5
        }).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))
  })
})
