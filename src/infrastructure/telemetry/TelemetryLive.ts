import { NodeSdk } from "@effect/opentelemetry"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"
import { Config, Effect, Layer } from "effect"

/**
 * OpenTelemetry configuration for the E-commerce API
 *
 * Supports two exporters:
 * - "console" (default): Logs traces to console
 * - "otlp": Sends traces to OTLP endpoint (Jaeger, Zipkin, etc.)
 *
 * Environment variables:
 * - OTEL_ENABLED: Enable/disable tracing (default: true)
 * - OTEL_SERVICE_NAME: Service name (default: ecommerce-api)
 * - OTEL_SERVICE_VERSION: Service version (default: 1.0.0)
 * - OTEL_EXPORTER: "console" or "otlp" (default: console)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint (default: http://localhost:4318/v1/traces)
 */
export const TelemetryLive = Layer.unwrapEffect(
  Effect.gen(function*() {
    const serviceName = yield* Config.string("OTEL_SERVICE_NAME").pipe(
      Config.withDefault("ecommerce-api")
    )
    const serviceVersion = yield* Config.string("OTEL_SERVICE_VERSION").pipe(
      Config.withDefault("1.0.0")
    )
    const enabled = yield* Config.boolean("OTEL_ENABLED").pipe(
      Config.withDefault(true)
    )
    const exporterType = yield* Config.string("OTEL_EXPORTER").pipe(
      Config.withDefault("console")
    )
    const otlpEndpoint = yield* Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(
      Config.withDefault("http://localhost:4318/v1/traces")
    )

    if (!enabled) {
      return Layer.empty
    }

    // Create exporter based on configuration
    const exporter = exporterType === "otlp"
      ? new OTLPTraceExporter({ url: otlpEndpoint })
      : new ConsoleSpanExporter()

    return NodeSdk.layer(() => ({
      resource: {
        serviceName,
        serviceVersion
      },
      spanProcessor: new BatchSpanProcessor(exporter)
    }))
  })
)
