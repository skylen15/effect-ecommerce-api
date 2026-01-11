import { CurrentUserContext } from "@/domain/user/User.js"
import { JwksVerifierTag } from "@/infrastructure/auth/JwksVerifier.js"
import { Forbidden, Unauthorized } from "@/shared/errors/ApiErrors.js"
import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform"
import { Effect, Layer, Option, Redacted, Schema } from "effect"

// Bearer token security
const BearerSecurity = HttpApiSecurity.bearer

// Required authentication - must be logged in
export class RequireAuth extends HttpApiMiddleware.Tag<RequireAuth>()(
  "RequireAuth",
  {
    failure: Unauthorized,
    provides: CurrentUserContext,
    security: { bearer: BearerSecurity }
  }
) {}

export const RequireAuthLive = Layer.effect(
  RequireAuth,
  Effect.gen(function*() {
    const verifier = yield* JwksVerifierTag

    return {
      bearer: (token: Redacted.Redacted<string>) =>
        Effect.gen(function*() {
          const tokenValue = Redacted.value(token)
          const userOption = yield* verifier.verify(tokenValue)

          if (Option.isNone(userOption)) {
            yield* Effect.annotateCurrentSpan(
              "auth.success",
              false
            )
            return yield* new Unauthorized({
              message: "Invalid or expired token"
            })
          }

          const user = userOption.value
          yield* Effect.annotateCurrentSpan("auth.success", true)
          yield* Effect.annotateCurrentSpan("auth.userId", user.id)
          yield* Effect.annotateCurrentSpan("auth.role", user.role)

          return user
        }).pipe(Effect.withSpan("auth.verifyToken"))
    }
  })
)

// Admin only - must be logged in AND have admin role
export class RequireAdmin extends HttpApiMiddleware.Tag<RequireAdmin>()(
  "RequireAdmin",
  {
    failure: Schema.Union(Unauthorized, Forbidden),
    provides: CurrentUserContext,
    security: { bearer: BearerSecurity }
  }
) {}

export const RequireAdminLive = Layer.effect(
  RequireAdmin,
  Effect.gen(function*() {
    const verifier = yield* JwksVerifierTag

    return {
      bearer: (token: Redacted.Redacted<string>) =>
        Effect.gen(function*() {
          const tokenValue = Redacted.value(token)
          const userOption = yield* verifier.verify(tokenValue)

          if (Option.isNone(userOption)) {
            yield* Effect.annotateCurrentSpan(
              "auth.success",
              false
            )
            return yield* new Unauthorized({
              message: "Invalid or expired token"
            })
          }

          const user = userOption.value
          yield* Effect.annotateCurrentSpan("auth.userId", user.id)
          yield* Effect.annotateCurrentSpan("auth.role", user.role)

          if (user.role !== "admin") {
            yield* Effect.annotateCurrentSpan(
              "auth.adminCheck",
              false
            )
            return yield* new Forbidden({
              message: "Admin access required"
            })
          }

          yield* Effect.annotateCurrentSpan("auth.success", true)
          yield* Effect.annotateCurrentSpan("auth.adminCheck", true)

          return user
        }).pipe(Effect.withSpan("auth.verifyAdminToken"))
    }
  })
)

// Combined auth layer
export const AuthenticationLive = Layer.mergeAll(
  RequireAuthLive,
  RequireAdminLive
)
