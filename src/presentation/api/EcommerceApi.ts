import { InternalError } from "@/shared/errors/ApiErrors.js"
import { HttpApi, OpenApi } from "@effect/platform"
import { CartApi } from "./CartApi.js"
import { CategoriesApi } from "./CategoriesApi.js"
import { HealthApi } from "./HealthApi.js"
import { OrdersApi } from "./OrdersApi.js"
import { ProductsApi } from "./ProductsApi.js"

export class EcommerceApi extends HttpApi.make("EcommerceApi")
  .add(HealthApi)
  .add(CategoriesApi)
  .add(ProductsApi)
  .add(CartApi)
  .add(OrdersApi)
  .addError(InternalError) // 500 Internal Server Error for all endpoints
  .annotate(OpenApi.Title, "E-commerce API")
  .annotate(
    OpenApi.Description,
    "Effect-based E-commerce REST API with JWT authentication"
  )
  .annotate(OpenApi.Version, "1.0.0")
{}
