import { SqlClient } from "@effect/sql"
import { Effect } from "effect"

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DROP TABLE IF EXISTS _sql_migrations CASCADE;
DROP TABLE IF EXISTS wishlist, review, order_item, "order", customer_address, coupon_user, coupon, cart_item, product_image, product_variant, product, category, cart CASCADE;
DROP TYPE IF EXISTS order_status_enum, coupon_type_enum CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
CREATE TYPE coupon_type_enum AS ENUM ('fixed', 'percent');

CREATE TYPE order_status_enum AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "cart" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_cart_user
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_cart_updated
BEFORE UPDATE ON "cart"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "category" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID,
    image VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_category_parent
        FOREIGN KEY (parent_id)
        REFERENCES "category"(id)
        ON DELETE SET NULL
);

CREATE TRIGGER trg_category_updated
BEFORE UPDATE ON "category"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "product" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_product_category
        FOREIGN KEY (category_id)
        REFERENCES "category"(id)
        ON DELETE SET NULL
);

CREATE TRIGGER trg_product_updated
BEFORE UPDATE ON "product"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "product_variant" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_variant_product
        FOREIGN KEY (product_id)
        REFERENCES "product"(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_product_variant_updated
BEFORE UPDATE ON "product_variant"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TABLE "product_image" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    image VARCHAR(255),
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_product_image_product
        FOREIGN KEY (product_id)
        REFERENCES "product"(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_product_image_updated
BEFORE UPDATE ON "product_image"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "cart_item" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL,
    product_id UUID NOT NULL,
    product_variant_id UUID,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_cart_item_cart
        FOREIGN KEY (cart_id)
        REFERENCES "cart"(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_item_product
        FOREIGN KEY (product_id)
        REFERENCES "product"(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cart_item_variant
        FOREIGN KEY (product_variant_id)
        REFERENCES "product_variant"(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_cart_item UNIQUE (cart_id, product_id, product_variant_id)
);

CREATE TRIGGER trg_cart_item_updated
BEFORE UPDATE ON "cart_item"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "coupon" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL UNIQUE,
    type coupon_type_enum NOT NULL,
    value NUMERIC(8,2) NOT NULL CHECK (value >= 0),
    min_order_amount NUMERIC(8,2),
    usage_limit INT CHECK (usage_limit >= 0),
    used INT NOT NULL DEFAULT 0 CHECK (used >= 0),
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TRIGGER trg_coupon_updated
BEFORE UPDATE ON "coupon"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "coupon_user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL,
    user_id UUID NOT NULL,
    times_used INT NOT NULL DEFAULT 0 CHECK (times_used >= 0),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_coupon_user_coupon
        FOREIGN KEY (coupon_id)
        REFERENCES "coupon"(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_coupon_user_user
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_coupon_user UNIQUE (coupon_id, user_id)
);

CREATE TRIGGER trg_coupon_user_updated
BEFORE UPDATE ON "coupon_user"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "customer_address" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'billing',
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    postal_code VARCHAR(255),
    country VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_customer_address_user
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_customer_address_updated
BEFORE UPDATE ON "customer_address"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "order" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    address_name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    postal_code VARCHAR(255),
    country VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255) NOT NULL,
    status order_status_enum NOT NULL DEFAULT 'pending',
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    coupon_code VARCHAR(255),
    discount_amount NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_order_user
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
);

CREATE TRIGGER trg_order_updated
BEFORE UPDATE ON "order"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "order_item" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    product_variant_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(255),
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_order_item_order
        FOREIGN KEY (order_id)
        REFERENCES "order"(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_order_item_updated
BEFORE UPDATE ON "order_item"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "review" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_review_user
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_product
        FOREIGN KEY (product_id)
        REFERENCES "product"(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_review UNIQUE (user_id, product_id)
);

CREATE TRIGGER trg_review_updated
BEFORE UPDATE ON "review"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "wishlist" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT fk_wishlist_user
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_wishlist_product
        FOREIGN KEY (product_id)
        REFERENCES "product"(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_wishlist UNIQUE (user_id, product_id)
);

CREATE TRIGGER trg_wishlist_updated
BEFORE UPDATE ON "wishlist"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();`
)
