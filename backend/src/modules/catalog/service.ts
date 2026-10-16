import { MedusaService } from "@medusajs/framework/utils"
import CatalogProduct from "./models/catalog-product"

class CatalogModuleService extends MedusaService({ CatalogProduct }) {}

export default CatalogModuleService
