import { Context, Schema } from "effect"

// User role enum
export const UserRole = Schema.Literal("user", "admin")
export type UserRole = typeof UserRole.Type

// User entity (from JWT claims)
export class User extends Schema.Class<User>("User")({
  id: Schema.UUID,
  email: Schema.String,
  name: Schema.String,
  role: UserRole
}) {}

// Current user context - null for guests
export type CurrentUser = User | null

// Context tag for current user
export class CurrentUserContext extends Context.Tag("CurrentUserContext")<CurrentUserContext, CurrentUser>() {}
