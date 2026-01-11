import { CreateProduct, Product, ProductWithCategory, UpdateProduct } from "@/domain/product/Product.js"
import { RequireAdmin } from "@/presentation/middleware/Authentication.js"
import { ConflictError, NotFound } from "@/shared/errors/ApiErrors.js"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"

// List products endpoint (public)
const listProducts = HttpApiEndpoint.get("listProducts", "/products")
  .addSuccess(Schema.Array(ProductWithCategory))
  .setUrlParams(
    Schema.Struct({
      categoryId: Schema.optional(Schema.String),
      search: Schema.optional(Schema.String),
      isActive: Schema.optional(Schema.BooleanFromString),
      limit: Schema.optionalWith(
        Schema.NumberFromString.pipe(Schema.int(), Schema.positive()),
        { default: () => 20 }
      ),
      offset: Schema.optionalWith(
        Schema.NumberFromString.pipe(
          Schema.int(),
          Schema.nonNegative()
        ),
        {
          default: () => 0
        }
      )
    })
  )
  .annotate(OpenApi.Summary, "List products")
  .annotate(
    OpenApi.Description,
    "Returns a list of products with optional filtering"
  )

// Get product by ID (public)
const getProductById = HttpApiEndpoint.get("getProductById", "/products/:id")
  .addSuccess(ProductWithCategory)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .annotate(OpenApi.Summary, "Get product by ID")
  .annotate(
    OpenApi.Description,
    "Returns a single product with category info"
  )

// Create product (admin only)
// Note: Unauthorized/Forbidden errors are automatically included via RequireAdmin middleware
const createProduct = HttpApiEndpoint.post("createProduct", "/products")
  .addSuccess(Product)
  .addError(ConflictError)
  .setPayload(CreateProduct)
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "Create product")
  .annotate(OpenApi.Description, "Creates a new product (admin only)")

// Update product (admin only)
const updateProduct = HttpApiEndpoint.patch("updateProduct", "/products/:id")
  .addSuccess(Product)
  .addError(NotFound)
  .addError(ConflictError)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .setPayload(UpdateProduct)
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "Update product")
  .annotate(OpenApi.Description, "Updates an existing product (admin only)")

// Delete product (admin only)
const deleteProduct = HttpApiEndpoint.del("deleteProduct", "/products/:id")
  .addSuccess(Schema.Void)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "Delete product")
  .annotate(OpenApi.Description, "Deletes a product (admin only)")

export class ProductsApi extends HttpApiGroup.make("products")
  .add(listProducts)
  .add(getProductById)
  .add(createProduct)
  .add(updateProduct)
  .add(deleteProduct)
  .annotate(OpenApi.Title, "Products")
  .annotate(OpenApi.Description, "Product management endpoints")
{}
