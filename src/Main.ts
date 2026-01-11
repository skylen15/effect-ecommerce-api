import { HttpApiBuilder, HttpApiScalar, HttpMiddleware, HttpServer, PlatformConfigProvider } from "@effect/platform"
import { BunContext, BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Config, Effect, Layer } from "effect"

// Application Services
import { CartApplicationServiceLive } from "@/application/cart/CartApplicationService.js"
import { CategoryApplicationServiceLive } from "@/application/category/CategoryApplicationService.js"
import { OrderApplicationServiceLive } from "@/application/order/OrderApplicationService.js"
import { ProductApplicationServiceLive } from "@/application/product/ProductApplicationService.js"

// Infrastructure
import { JwksVerifierLive } from "@/infrastructure/auth/JwksVerifier.js"
import { MigratorLive } from "@/infrastructure/database/MigratorLive.js"
import { CartRepositoryLive } from "@/infrastructure/database/repositories/CartRepositoryLive.js"
import { CategoryRepositoryLive } from "@/infrastructure/database/repositories/CategoryRepositoryLive.js"
import { OrderRepositoryLive } from "@/infrastructure/database/repositories/OrderRepositoryLive.js"
import { ProductRepositoryLive } from "@/infrastructure/database/repositories/ProductRepositoryLive.js"
import { SqlLive } from "@/infrastructure/database/SqlLive.js"
import { TelemetryLive } from "@/infrastructure/telemetry/TelemetryLive.js"

// Presentation
import { EcommerceApi } from "@/presentation/api/EcommerceApi.js"
import { CartHandler } from "@/presentation/handlers/CartHandler.js"
import { CategoriesHandler } from "@/presentation/handlers/CategoriesHandler.js"
import { HealthHandler } from "@/presentation/handlers/HealthHandler.js"
import { OrdersHandler } from "@/presentation/handlers/OrdersHandler.js"
import { ProductsHandler } from "@/presentation/handlers/ProductsHandler.js"
import { RequireAdminLive, RequireAuthLive } from "@/presentation/middleware/Authentication.js"

// Environment provider layer - loads .env file if exists, otherwise uses process.env
const EnvProviderLayer = Layer.unwrapEffect(
  PlatformConfigProvider.fromDotEnv(".env").pipe(
    Effect.map(Layer.setConfigProvider),
    Effect.catchAll(() => Effect.succeed(Layer.empty)),
    Effect.provide(BunContext.layer)
  )
)

// Repository layer
const RepositoryLayer = Layer.mergeAll(
  CategoryRepositoryLive,
  ProductRepositoryLive,
  CartRepositoryLive,
  OrderRepositoryLive
)

// Application services layer
const ApplicationServiceLayer = Layer.mergeAll(
  CategoryApplicationServiceLive,
  ProductApplicationServiceLive,
  CartApplicationServiceLive,
  OrderApplicationServiceLive
).pipe(Layer.provide(RepositoryLayer))

// API implementation
const ApiLive = HttpApiBuilder.api(EcommerceApi).pipe(
  Layer.provide(HealthHandler),
  Layer.provide(CategoriesHandler),
  Layer.provide(ProductsHandler),
  Layer.provide(CartHandler),
  Layer.provide(OrdersHandler),
  Layer.provide(ApplicationServiceLayer),
  Layer.provide(RequireAuthLive),
  Layer.provide(RequireAdminLive),
  Layer.provide(JwksVerifierLive)
)

// Server configuration with Scalar API docs
const ServerLive = Layer.unwrapEffect(
  Config.number("PORT").pipe(
    Config.withDefault(3000),
    Effect.map((port) =>
      HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
        // Add Scalar API docs at /docs
        Layer.provide(HttpApiScalar.layer({ path: "/docs" })),
        Layer.provide(ApiLive),
        HttpServer.withLogAddress,
        Layer.provide(BunHttpServer.layer({ port }))
      )
    )
  )
)

// Database layer with migrations
const DatabaseLive = MigratorLive.pipe(
  Layer.provideMerge(SqlLive),
  Layer.provide(BunContext.layer)
)

// Main application layer
const MainLive = ServerLive.pipe(
  Layer.provide(DatabaseLive),
  Layer.provide(TelemetryLive),
  Layer.provide(EnvProviderLayer)
)

// Run the server
BunRuntime.runMain(Layer.launch(MainLive))
