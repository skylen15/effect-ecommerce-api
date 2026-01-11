import { Category, CategoryWithCount, CreateCategory, UpdateCategory } from "@/domain/category/Category.js"
import { RequireAdmin } from "@/presentation/middleware/Authentication.js"
import { ConflictError, NotFound } from "@/shared/errors/ApiErrors.js"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"

// List categories endpoint (public)
const listCategories = HttpApiEndpoint.get("listCategories", "/categories")
  .addSuccess(Schema.Array(CategoryWithCount))
  .setUrlParams(
    Schema.Struct({
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
  .annotate(OpenApi.Summary, "List all categories")
  .annotate(
    OpenApi.Description,
    "Returns a list of all categories with product counts"
  )

// Get category by ID (public)
const getCategoryById = HttpApiEndpoint.get(
  "getCategoryById",
  "/categories/:id"
)
  .addSuccess(Category)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .annotate(OpenApi.Summary, "Get category by ID")
  .annotate(OpenApi.Description, "Returns a single category by its ID")

// Create category (admin only)
// Note: Unauthorized/Forbidden errors are automatically included via RequireAdmin middleware
const createCategory = HttpApiEndpoint.post("createCategory", "/categories")
  .addSuccess(Category)
  .addError(ConflictError)
  .setPayload(CreateCategory)
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "Create category")
  .annotate(OpenApi.Description, "Creates a new category (admin only)")

// Update category (admin only)
const updateCategory = HttpApiEndpoint.patch(
  "updateCategory",
  "/categories/:id"
)
  .addSuccess(Category)
  .addError(NotFound)
  .addError(ConflictError)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .setPayload(UpdateCategory)
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "Update category")
  .annotate(OpenApi.Description, "Updates an existing category (admin only)")

// Delete category (admin only)
const deleteCategory = HttpApiEndpoint.del("deleteCategory", "/categories/:id")
  .addSuccess(Schema.Void)
  .addError(NotFound)
  .setPath(Schema.Struct({ id: Schema.UUID }))
  .middleware(RequireAdmin)
  .annotate(OpenApi.Summary, "Delete category")
  .annotate(OpenApi.Description, "Deletes a category (admin only)")

export class CategoriesApi extends HttpApiGroup.make("categories")
  .add(listCategories)
  .add(getCategoryById)
  .add(createCategory)
  .add(updateCategory)
  .add(deleteCategory)
  .annotate(OpenApi.Title, "Categories")
  .annotate(OpenApi.Description, "Category management endpoints")
{}
