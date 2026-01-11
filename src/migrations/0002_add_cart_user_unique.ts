import { SqlClient } from "@effect/sql"
import { Effect } from "effect"

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
-- Remove duplicate carts (keep the oldest one per user)
DELETE FROM cart a
USING cart b
WHERE a.user_id = b.user_id
  AND a.created_at > b.created_at;

-- Add unique constraint on user_id
-- Each user can only have one cart
ALTER TABLE cart
ADD CONSTRAINT uq_cart_user_id UNIQUE (user_id);
`
)
