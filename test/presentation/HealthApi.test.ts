import { HealthStatus } from "@/presentation/api/HealthApi.js"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

describe("HealthApi", () => {
  describe("HealthStatus Schema", () => {
    it.effect("should decode valid health status - ok", () =>
      Effect.gen(function*() {
        // Encoded format (string for Date)
        const healthDataEncoded = {
          status: "ok" as const,
          timestamp: "2024-01-01T00:00:00.000Z",
          database: {
            connected: true,
            latencyMs: 5
          },
          version: "1.0.0"
        }
        const decoded = yield* Schema.decode(HealthStatus)(
          healthDataEncoded
        )

        expect(decoded.status).toBe("ok")
        expect(decoded.database.connected).toBe(true)
        expect(decoded.database.latencyMs).toBe(5)
        expect(decoded.version).toBe("1.0.0")
      }))

    it.effect("should decode health status - degraded", () =>
      Effect.gen(function*() {
        const healthDataEncoded = {
          status: "degraded" as const,
          timestamp: "2024-01-01T00:00:00.000Z",
          database: {
            connected: false
          },
          version: "1.0.0"
        }
        const decoded = yield* Schema.decode(HealthStatus)(
          healthDataEncoded
        )

        expect(decoded.status).toBe("degraded")
        expect(decoded.database.connected).toBe(false)
        expect(decoded.database.latencyMs).toBeUndefined()
      }))

    it.effect("should decode health status - error", () =>
      Effect.gen(function*() {
        const healthDataEncoded = {
          status: "error" as const,
          timestamp: "2024-01-01T00:00:00.000Z",
          database: {
            connected: false
          },
          version: "1.0.0"
        }
        const decoded = yield* Schema.decode(HealthStatus)(
          healthDataEncoded
        )

        expect(decoded.status).toBe("error")
      }))

    it.effect("should fail with invalid status", () =>
      Effect.gen(function*() {
        const invalidData = {
          status: "unknown",
          timestamp: "2024-01-01T00:00:00.000Z",
          database: { connected: true },
          version: "1.0.0"
        }
        const result = yield* Schema.decode(HealthStatus)(
          invalidData as any
        ).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))

    it.effect("should fail without required fields", () =>
      Effect.gen(function*() {
        const invalidData = {
          status: "ok" as const
          // missing other required fields
        }
        const result = yield* Schema.decode(HealthStatus)(
          invalidData as any
        ).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))
  })
})
