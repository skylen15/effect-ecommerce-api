# Effect MVP E-commerce API

This is an Effect-based API project using TypeScript with DDD architecture.

## Development

-   **Package Manager:** bun
-   **Run Server:** `bun run dev`
-   **Type Check:** `bun run check`
-   **Test:** `bun run test`
-   **Build:** `bun run build`
-   **Lint:** `bun run lint`

## Path Aliases

-   `@/*` → `./src/*`
-   `@test/*` → `./test/*`

<!-- effect-solutions:start -->

## Effect Best Practices

**Before implementing Effect features**, run `effect-solutions list` and read the relevant guide.

Topics include: services and layers, data modeling, error handling, configuration, testing, HTTP clients, CLIs, observability, and project structure.

**Effect Source Reference:** `~/.local/share/effect-solutions/effect`
Search here for real implementations when docs aren't enough.

<!-- effect-solutions:end -->

## Key Features

-   **Database Migrations:** Auto-run via `PgMigrator` in `src/migrations/`
-   **API Docs:** Scalar UI at `/docs`
-   **Health Check:** `GET /health` for status monitoring
-   **Auth Middleware:** `RequireAuth` (user) and `RequireAdmin` (admin)
-   **Error Types:** `Unauthorized` (401), `Forbidden` (403), `NotFound` (404), `InternalError` (500)

## Code Style

**Error handling:** Use direct yield for `Schema.TaggedError`:

```typescript
// ✅ Good
yield* new NotFound({ resource: "Product", id })

// ❌ Avoid
yield* Effect.fail(new NotFound({ resource: "Product", id }))
```

## Project Structure

-   `src/domain/` - Business logic (entities, repositories)
-   `src/application/` - Use cases (services)
-   `src/infrastructure/` - Implementations (DB, Auth)
-   `src/presentation/` - HTTP API (endpoints, handlers)
-   `src/shared/` - Common types, errors, config
-   `src/migrations/` - Database migrations
-   `test/` - Tests (domain, application, integration)

## Testing

```bash
bun run test           # 97 tests
bun run test --watch   # Watch mode
```
