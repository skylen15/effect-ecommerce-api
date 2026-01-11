import { EcommerceApi } from "@/presentation/api/EcommerceApi.js"
import { HealthStatus } from "@/presentation/api/HealthApi.js"
import { HttpApiBuilder } from "@effect/platform"
import { SqlClient } from "@effect/sql"
import { Effect } from "effect"

const API_VERSION = "1.0.0"

export const HealthHandler = HttpApiBuilder.group(
  EcommerceApi,
  "health",
  (handlers) =>
    handlers.handle("healthCheck", () =>
      Effect.gen(function*() {
        yield* Effect.annotateCurrentSpan("http.route", "GET /health")

        const sql = yield* SqlClient.SqlClient

        // Check database connectivity with timing
        const dbCheck = yield* Effect.gen(function*() {
          const start = Date.now()
          yield* sql`SELECT 1`
          const latencyMs = Date.now() - start
          yield* Effect.annotateCurrentSpan("db.latencyMs", latencyMs)
          return { connected: true, latencyMs }
        }).pipe(
          Effect.catchAll(() => {
            return Effect.gen(function*() {
              yield* Effect.annotateCurrentSpan("db.connected", false)
              return {
                connected: false,
                latencyMs: undefined as number | undefined
              }
            })
          }),
          Effect.withSpan("health.checkDatabase")
        )

        const status = dbCheck.connected ? "ok" : "degraded"
        yield* Effect.annotateCurrentSpan("health.status", status)
        yield* Effect.annotateCurrentSpan("health.dbConnected", dbCheck.connected)

        return new HealthStatus({
          status,
          timestamp: new Date(),
          database: {
            connected: dbCheck.connected,
            latencyMs: dbCheck.latencyMs
          },
          version: API_VERSION
        })
      }).pipe(Effect.withSpan("HTTP.healthCheck")))
)
