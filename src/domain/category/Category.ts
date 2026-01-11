import { Schema } from "effect"

// Category entity
export class Category extends Schema.Class<Category>("Category")({
  id: Schema.UUID,
  name: Schema.String,
  parentId: Schema.NullOr(Schema.UUID),
  image: Schema.NullOr(Schema.String),
  slug: Schema.NullOr(Schema.String),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Create category DTO
export class CreateCategory extends Schema.Class<CreateCategory>("CreateCategory")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  parentId: Schema.optionalWith(Schema.UUID, { nullable: true }),
  image: Schema.optionalWith(Schema.String, { nullable: true }),
  slug: Schema.optionalWith(Schema.String, { nullable: true })
}) {}

// Update category DTO
export class UpdateCategory extends Schema.Class<UpdateCategory>("UpdateCategory")({
  name: Schema.optionalWith(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)), { nullable: true }),
  parentId: Schema.optionalWith(Schema.UUID, { nullable: true }),
  image: Schema.optionalWith(Schema.String, { nullable: true }),
  slug: Schema.optionalWith(Schema.String, { nullable: true })
}) {}

// Category with products count
export class CategoryWithCount extends Schema.Class<CategoryWithCount>("CategoryWithCount")({
  id: Schema.UUID,
  name: Schema.String,
  parentId: Schema.NullOr(Schema.UUID),
  image: Schema.NullOr(Schema.String),
  slug: Schema.NullOr(Schema.String),
  productCount: Schema.Int,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}
