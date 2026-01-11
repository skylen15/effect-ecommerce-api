import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"

// Health check response schema
export class HealthStatus extends Schema.Class<HealthStatus>("HealthStatus")({
  status: Schema.Literal("ok", "degraded", "error"),
  timestamp: Schema.Date,
  database: Schema.Struct({
    connected: Schema.Boolean,
    latencyMs: Schema.optional(Schema.Number)
  }),
  version: Schema.String
}) {}

// Health check endpoint (public)
const healthCheck = HttpApiEndpoint.get("healthCheck", "/health")
  .addSuccess(HealthStatus)
  .annotate(OpenApi.Summary, "Health check")
  .annotate(
    OpenApi.Description,
    "Returns the health status of the API including database connectivity"
  )

export class HealthApi extends HttpApiGroup.make("health")
  .add(healthCheck)
  .annotate(OpenApi.Title, "Health")
  .annotate(OpenApi.Description, "Health check endpoints")
{}
