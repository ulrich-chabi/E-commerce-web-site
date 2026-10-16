import { defineLink } from "@medusajs/framework/utils"
import CatalogModule from "../modules/catalog"
import ProductModule from "@medusajs/medusa/product"

// Une fiche catalogue regroupe les offres (produits vendeur) d'un même produit.
export default defineLink(CatalogModule.linkable.catalogProduct, {
  linkable: ProductModule.linkable.product.id,
  isList: true,
})
