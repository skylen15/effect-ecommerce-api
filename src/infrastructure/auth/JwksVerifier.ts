import { User, UserRole } from "@/domain/user/User.js"
import { AppConfig } from "@/shared/config/AppConfig.js"
import { Context, Effect, Layer, Option, Schema } from "effect"
import { createRemoteJWKSet, jwtVerify } from "jose"

// JWT Claims schema
const JwtClaims = Schema.Struct({
  sub: Schema.UUID,
  email: Schema.String,
  name: Schema.String,
  role: UserRole
})

export interface JwksVerifier {
  readonly verify: (
    token: string
  ) => Effect.Effect<Option.Option<User>, never>
}

export class JwksVerifierTag extends Context.Tag("JwksVerifier")<
  JwksVerifierTag,
  JwksVerifier
>() {}

export const JwksVerifierLive = Layer.effect(
  JwksVerifierTag,
  Effect.gen(function*() {
    const config = yield* AppConfig

    // Create JWKS remote key set
    const jwks = createRemoteJWKSet(new URL(config.auth.jwksUrl))

    return {
      verify: (token: string) =>
        Effect.gen(function*() {
          yield* Effect.annotateCurrentSpan(
            "jwks.issuer",
            config.auth.issuer
          )
          yield* Effect.annotateCurrentSpan(
            "jwks.audience",
            config.auth.audience
          )

          const result = yield* Effect.tryPromise({
            try: () =>
              jwtVerify(token, jwks, {
                issuer: config.auth.issuer,
                audience: config.auth.audience
              }),
            catch: () => null
          })

          const payload = result?.payload
          if (!payload) {
            yield* Effect.annotateCurrentSpan(
              "jwks.verified",
              false
            )
            return Option.none()
          }

          yield* Effect.annotateCurrentSpan("jwks.verified", true)

          // Decode and validate claims
          const decoded = yield* Schema.decodeUnknown(JwtClaims)(
            payload
          ).pipe(
            Effect.map(Option.some),
            Effect.catchAll(() => Effect.succeed(Option.none()))
          )

          if (Option.isSome(decoded)) {
            yield* Effect.annotateCurrentSpan(
              "jwks.userId",
              decoded.value.sub
            )
            yield* Effect.annotateCurrentSpan(
              "jwks.userRole",
              decoded.value.role
            )
          }

          return Option.map(
            decoded,
            (claims) =>
              new User({
                id: claims.sub,
                email: claims.email,
                name: claims.name,
                role: claims.role
              })
          )
        }).pipe(
          Effect.catchAll(() => Effect.succeed(Option.none())),
          Effect.withSpan("jwks.verifyToken")
        )
    }
  })
)
