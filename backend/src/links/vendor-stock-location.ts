import { defineLink } from "@medusajs/framework/utils"
import MarketplaceModule from "../modules/marketplace"
import StockLocationModule from "@medusajs/medusa/stock-location"

// Un vendeur a un seul emplacement de stock, créé à sa première activation.
export default defineLink(
  MarketplaceModule.linkable.vendor,
  StockLocationModule.linkable.stockLocation
)
