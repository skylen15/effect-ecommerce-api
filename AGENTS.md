# Effect MVP E-commerce API

This is an Effect-based API project using TypeScript with Domain-Driven Design (DDD) architecture.

## Development

-   **Package Manager:** bun
-   **Run Server (dev):** `bun run dev`
-   **Run Server (prod):** `bun run start`
-   **Type Check:** `bun run check`
-   **Test:** `bun run test`
-   **Build:** `bun run build`
-   **Lint:** `bun run lint`

## Environment Variables

```env
# Server
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
AUTH_JWKS_URL=https://your-auth-server/.well-known/jwks.json
AUTH_ISSUER=https://your-auth-server
AUTH_AUDIENCE=your-api-audience

# OpenTelemetry (optional)
OTEL_ENABLED=true
OTEL_SERVICE_NAME=ecommerce-api
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER=console                              # "console" or "otlp"
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

## Path Aliases

The project uses path aliases defined in `tsconfig.base.json`:

-   `@/*` → `./src/*`
-   `@test/*` → `./test/*` (for tests)

Example: `import { User } from "@/domain/user/User.js"`

## Database Migrations

Migrations use `@effect/sql-pg` PgMigrator and are located in `src/migrations/`:

```
src/migrations/
├── 0001_create_tables.ts    # Initial schema
└── _schema.sql              # Generated schema file
```

Migrations run automatically on server startup via `MigratorLive` layer.

<!-- effect-solutions:start -->

## Effect Best Practices

**Before implementing Effect features**, run `pnpm dlx effect-solutions list` and read the relevant guide.

Topics include: services and layers, data modeling, error handling, configuration, testing, HTTP clients, CLIs, observability, and project structure.

**Effect Source Reference:** `~/.local/share/effect-solutions/effect`
Search here for real implementations when docs aren't enough.

<!-- effect-solutions:end -->

## Project Structure (DDD)

All directories use **lowercase** naming convention.

```
src/
├── domain/                     # Domain Layer - Business Logic
│   ├── product/
│   │   ├── Product.ts          # Product entity/schemas
│   │   └── ProductRepository.ts # Repository interface (port)
│   ├── category/
│   │   ├── Category.ts
│   │   └── CategoryRepository.ts
│   ├── cart/
│   │   ├── Cart.ts
│   │   └── CartRepository.ts
│   ├── order/
│   │   ├── Order.ts
│   │   └── OrderRepository.ts
│   └── user/
│       └── User.ts             # User value object (from JWT)
│
├── application/                # Application Layer - Use Cases
│   ├── product/
│   │   └── ProductApplicationService.ts
│   ├── category/
│   │   └── CategoryApplicationService.ts
│   ├── cart/
│   │   └── CartApplicationService.ts
│   └── order/
│       └── OrderApplicationService.ts
│
├── infrastructure/             # Infrastructure Layer - Implementations
│   ├── database/
│   │   ├── SqlLive.ts          # NeonDB connection
│   │   ├── MigratorLive.ts     # Database migrations
│   │   └── repositories/
│   │       ├── ProductRepositoryLive.ts
│   │       ├── CategoryRepositoryLive.ts
│   │       ├── CartRepositoryLive.ts
│   │       └── OrderRepositoryLive.ts
│   ├── auth/
│   │   └── JwksVerifier.ts     # JWKS token verification
│   └── telemetry/
│       └── TelemetryLive.ts    # OpenTelemetry configuration
│
├── presentation/               # Presentation Layer - HTTP API
│   ├── api/
│   │   ├── EcommerceApi.ts     # Main HttpApi definition
│   │   ├── ProductsApi.ts
│   │   ├── CategoriesApi.ts
│   │   ├── CartApi.ts
│   │   ├── OrdersApi.ts
│   │   └── HealthApi.ts        # Health check endpoint
│   ├── handlers/
│   │   ├── ProductsHandler.ts
│   │   ├── CategoriesHandler.ts
│   │   ├── CartHandler.ts
│   │   ├── OrdersHandler.ts
│   │   └── HealthHandler.ts    # Health check handler
│   └── middleware/
│       └── Authentication.ts   # JWT auth middleware
│
├── migrations/                 # Database migrations
│   ├── 0001_create_tables.ts
│   └── _schema.sql
│
├── shared/                     # Shared Kernel
│   ├── config/
│   │   └── AppConfig.ts
│   ├── errors/
│   │   └── ApiErrors.ts        # Error types with HTTP status codes
│   ├── tracing/
│   │   └── DbTracing.ts        # Database tracing utilities
│   └── types/
│       └── Common.ts           # UUID, Pagination, etc.
│
└── Main.ts                     # Entry point (Bun Runtime)

test/
├── domain/                     # Domain schema tests
├── application/                # Application service tests
├── presentation/               # API schema tests
├── shared/                     # Shared types tests
└── integration/                # Integration tests
    ├── TestUtils.ts            # Test utilities
    ├── MockLayers.ts           # Mock services
    ├── PublicEndpoints.test.ts # Public API tests
    └── AdminEndpoints.test.ts  # Auth/Admin tests

observability/                  # Grafana Stack configs
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── datasources.yaml
├── tempo/
│   └── tempo.yaml
├── loki/
│   └── loki.yaml
└── prometheus/
    └── prometheus.yaml
```

## Access Control Matrix

| Endpoint               | Guest | User     | Admin |
| ---------------------- | ----- | -------- | ----- |
| GET /health            | ✅    | ✅       | ✅    |
| GET /products          | ✅    | ✅       | ✅    |
| GET /products/:id      | ✅    | ✅       | ✅    |
| POST /products         | ❌    | ❌       | ✅    |
| PUT /products/:id      | ❌    | ❌       | ✅    |
| DELETE /products/:id   | ❌    | ❌       | ✅    |
| GET /categories        | ✅    | ✅       | ✅    |
| POST /categories       | ❌    | ❌       | ✅    |
| PUT /categories/:id    | ❌    | ❌       | ✅    |
| DELETE /categories/:id | ❌    | ❌       | ✅    |
| GET /cart              | ❌    | ✅       | ✅    |
| POST /cart/items       | ❌    | ✅       | ✅    |
| PUT /cart/items/:id    | ❌    | ✅       | ✅    |
| DELETE /cart/items/:id | ❌    | ✅       | ✅    |
| POST /orders           | ❌    | ✅       | ✅    |
| GET /orders            | ❌    | ✅       | ✅    |
| GET /orders/:id        | ❌    | ✅ (own) | ✅    |
| PUT /orders/:id/status | ❌    | ❌       | ✅    |
| GET /admin/orders      | ❌    | ❌       | ✅    |

## HTTP Status Codes

Error types are defined in `shared/Errors/ApiErrors.ts` with `HttpApiSchema.annotations`:

| Status | Error Type        | Description               |
| ------ | ----------------- | ------------------------- |
| 400    | `ValidationError` | Invalid request data      |
| 401    | `Unauthorized`    | Authentication required   |
| 403    | `Forbidden`       | Access denied (not admin) |
| 404    | `NotFound`        | Resource not found        |
| 409    | `Conflict`        | Resource conflict         |
| 500    | `InternalError`   | Server error              |

## Architecture Rules

1. **Domain Layer** - Pure business logic with no dependencies on infrastructure
2. **Application Layer** - Orchestrates domain objects to perform use cases
3. **Infrastructure Layer** - Implements repositories and external services
4. **Presentation Layer** - HTTP API endpoints and request handling

## Effect Patterns Used

-   **Schema Classes** - For entities and DTOs with validation
-   **Schema.TaggedError** - For typed errors with HTTP status codes
-   **Context.Tag** - For dependency injection (repositories, services)
-   **Layer** - For composing dependencies
-   **Effect.gen** - For composing effectful operations
-   **HttpApiBuilder** - For type-safe API definition
-   **HttpApiMiddleware** - For authentication middleware
-   **HttpApiSchema.annotations** - For HTTP status code mapping
-   **PgMigrator** - For database migrations

## Code Style Rules

### Error Handling

`Schema.TaggedError` classes are yieldable directly. Use the shorter syntax:

```typescript
// ✅ Good - direct yield
yield * new NotFound({ resource: "Product", id });

// ❌ Avoid - unnecessary Effect.fail wrapper
yield * Effect.fail(new NotFound({ resource: "Product", id }));
```

### Tracing Guidelines

**Always add tracing when implementing new features.** Use `Effect.withSpan()` and `Effect.annotateCurrentSpan()`.

#### 1. HTTP Handlers - Wrap with `HTTP.*` span

```typescript
.handle("getProduct", ({ path }) =>
  Effect.gen(function*() {
    yield* Effect.annotateCurrentSpan("http.route", "GET /products/:id")
    yield* Effect.annotateCurrentSpan("product.id", path.id)

    const service = yield* ProductApplicationServiceTag
    const result = yield* service.getProductById(path.id)

    yield* Effect.annotateCurrentSpan("result.found", true)
    return result
  }).pipe(Effect.withSpan("HTTP.getProduct")))
```

#### 2. Application Services - Wrap with `*Service.*` span

```typescript
getProductById: (id) =>
    repo.findById(id).pipe(
        Effect.orDie,
        Effect.flatMap((opt) =>
            Option.isSome(opt)
                ? Effect.succeed(opt.value)
                : new NotFound({ resource: "Product", id })
        ),
        Effect.withSpan("ProductService.getProductById", {
            attributes: { productId: id },
        })
    );
```

#### 3. Repository - Use `DbSpan` utility from `@/shared/Tracing/DbTracing.js`

```typescript
import { DbSpan } from "@/shared/tracing/DbTracing.js";

// Use pre-configured span helper for entity
const withDbSpan = DbSpan.product; // or DbSpan.category, DbSpan.cart, DbSpan.order

// Use in repository methods
findById: (id: string) =>
    withDbSpan(
        "findById",
        sql`SELECT * FROM product WHERE id = ${id}`.pipe(
            Effect.tap(() => Effect.annotateCurrentSpan("db.productId", id)),
            Effect.flatMap(Schema.decodeUnknown(Schema.Array(ProductFromRow))),
            Effect.map((rows) =>
                rows.length > 0 ? Option.some(rows[0]) : Option.none()
            )
        )
    );
```

Available helpers in `DbSpan`:

-   `DbSpan.product` → `db.product.*` spans
-   `DbSpan.category` → `db.category.*` spans
-   `DbSpan.cart` → `db.cart.*` spans
-   `DbSpan.order` → `db.order.*` spans

For new entities, use `createDbSpan("entityName")`.

#### 4. Standard Attribute Names

| Layer       | Attributes to include                            |
| ----------- | ------------------------------------------------ |
| HTTP        | `http.route`, `*.id`, `result.count`, `filter.*` |
| Auth        | `auth.success`, `auth.userId`, `auth.role`       |
| Application | Resource IDs, counts, status                     |
| Repository  | `db.system`, `db.operation`, `db.*Id`            |

#### 5. Tracing Checklist for New Features

-   [ ] HTTP Handler has `HTTP.*` span with `http.route` attribute
-   [ ] Application Service methods have `*Service.*` spans
-   [ ] Repository methods use `withDbSpan` helper
-   [ ] IDs are annotated (productId, categoryId, orderId, userId)
-   [ ] Counts are annotated (result.count, itemCount)
-   [ ] Status/state changes are annotated

## API Documentation

Scalar UI available at `/docs` when server is running (powered by `@effect/platform` HttpApiScalar).

## Testing

Tests use `@effect/vitest` for Effect integration:

```bash
bun run test           # Run all tests (97 tests)
bun run test --watch   # Watch mode
```

Test structure:

-   **Domain tests** - Schema validation
-   **Application tests** - Business logic with mocks
-   **Integration tests** - Auth/authorization flows

## Observability

Full distributed tracing is powered by `@effect/opentelemetry` with comprehensive span creation across all layers.

### Traced Layers

| Layer               | Span Prefix  | Example Span                    |
| ------------------- | ------------ | ------------------------------- |
| **HTTP Handler**    | `HTTP.*`     | `HTTP.listProducts`             |
| **Auth Middleware** | `auth.*`     | `auth.verifyToken`              |
| **JWKS Verifier**   | `jwks.*`     | `jwks.verifyToken`              |
| **Application**     | `*Service.*` | `ProductService.getProductById` |
| **Repository**      | `db.*.*`     | `db.product.findById`           |
| **Health Check**    | `health.*`   | `health.checkDatabase`          |

### Span Attributes

| Category     | Attributes                                            |
| ------------ | ----------------------------------------------------- |
| **HTTP**     | http.route, result.count, product.id, order.id        |
| **Auth**     | auth.success, auth.userId, auth.role, auth.adminCheck |
| **JWKS**     | jwks.verified, jwks.userId, jwks.userRole             |
| **Database** | db.system, db.operation, db.productId, db.categoryId  |
| **Cart**     | cart.id, cart.itemCount, product.id, quantity         |
| **Order**    | order.id, order.status, order.total, order.itemCount  |

### Exporter Options

| Exporter  | OTEL_EXPORTER | Use Case               |
| --------- | ------------- | ---------------------- |
| Console   | `console`     | Development/debugging  |
| OTLP/HTTP | `otlp`        | Jaeger, Zipkin, SigNoz |

### Example Trace (GET /products/:id)

```
HTTP.getProductById (12ms)
├── auth.verifyToken (3ms)
│   └── jwks.verifyToken (2ms)
├── ProductService.getProductById (8ms)
│   └── db.product.findByIdWithCategory (5ms)
```

## Docker

### Option 1: Docker Compose with Grafana Stack (recommended)

```bash
# Start API + Grafana + Tempo + Loki + Prometheus
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all
docker-compose down
```

Access:

-   **API**: http://localhost:3000
-   **API Docs**: http://localhost:3000/docs
-   **Grafana**: http://localhost:3001 (admin/admin)
-   **Tempo**: http://localhost:3200
-   **Prometheus**: http://localhost:9090

### Grafana Stack Components

| Service        | Port | Description                 |
| -------------- | ---- | --------------------------- |
| **Grafana**    | 3001 | Dashboards & visualization  |
| **Tempo**      | 3200 | Distributed tracing backend |
| **Loki**       | 3100 | Log aggregation             |
| **Prometheus** | 9090 | Metrics collection          |

### Viewing Traces in Grafana

1. Open http://localhost:3001
2. Login with `admin/admin`
3. Go to **Explore** → Select **Tempo** datasource
4. Search traces by service name: `ecommerce-api`

### Option 2: Standalone Docker

```bash
# Build image
docker build -t ecommerce-api .

# Run with env file
docker run -p 3000:3000 --env-file .env ecommerce-api

# Or with inline env vars
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e AUTH_JWKS_URL=http://localhost:2121/api/auth/jwks \
  -e AUTH_ISSUER=http://localhost:2121 \
  -e AUTH_AUDIENCE=http://localhost:3000 \
  ecommerce-api
```

### Option 3: Jaeger Only (lightweight alternative)

```bash
# Start Jaeger
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/jaeger:latest

# Configure API to send traces
OTEL_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Health check endpoint: `GET /health`
