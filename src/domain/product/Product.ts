import { Schema } from "effect"

// Product entity
export class Product extends Schema.Class<Product>("Product")({
  id: Schema.UUID,
  categoryId: Schema.NullOr(Schema.UUID),
  name: Schema.String,
  description: Schema.String,
  price: Schema.BigDecimal,
  stock: Schema.Int,
  isActive: Schema.Boolean,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Create product DTO
export class CreateProduct extends Schema.Class<CreateProduct>("CreateProduct")({
  categoryId: Schema.optionalWith(Schema.UUID, { nullable: true }),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.String,
  price: Schema.BigDecimal.pipe(Schema.nonNegativeBigDecimal()),
  stock: Schema.Int.pipe(Schema.nonNegative()),
  isActive: Schema.optionalWith(Schema.Boolean, { default: () => true })
}) {}

// Update product DTO
export class UpdateProduct extends Schema.Class<UpdateProduct>("UpdateProduct")({
  categoryId: Schema.optionalWith(Schema.UUID, { nullable: true }),
  name: Schema.optionalWith(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)), { nullable: true }),
  description: Schema.optionalWith(Schema.String, { nullable: true }),
  price: Schema.optionalWith(Schema.BigDecimal.pipe(Schema.nonNegativeBigDecimal()), { nullable: true }),
  stock: Schema.optionalWith(Schema.Int.pipe(Schema.nonNegative()), { nullable: true }),
  isActive: Schema.optionalWith(Schema.Boolean, { nullable: true })
}) {}

// Product with category info
export class ProductWithCategory extends Schema.Class<ProductWithCategory>("ProductWithCategory")({
  id: Schema.UUID,
  categoryId: Schema.NullOr(Schema.UUID),
  categoryName: Schema.NullOr(Schema.String),
  name: Schema.String,
  description: Schema.String,
  price: Schema.BigDecimal,
  stock: Schema.Int,
  isActive: Schema.Boolean,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Product filter params
export class ProductFilters extends Schema.Class<ProductFilters>("ProductFilters")({
  categoryId: Schema.optionalWith(Schema.UUID, { nullable: true }),
  search: Schema.optionalWith(Schema.String, { nullable: true }),
  minPrice: Schema.optionalWith(Schema.BigDecimal, { nullable: true }),
  maxPrice: Schema.optionalWith(Schema.BigDecimal, { nullable: true }),
  isActive: Schema.optionalWith(Schema.Boolean, { nullable: true }),
  limit: Schema.optionalWith(Schema.Int.pipe(Schema.positive(), Schema.lessThanOrEqualTo(100)), {
    default: () => 20
  }),
  offset: Schema.optionalWith(Schema.Int.pipe(Schema.nonNegative()), { default: () => 0 })
}) {}
