import { model } from "@medusajs/framework/utils"

// Fiche catalogue : identité commune d'un produit (titre, marque, description).
// Les offres des vendeurs sont des produits Medusa reliés à cette fiche
// (voir src/links/catalog-product-offer.ts) ; chaque offre garde son prix,
// son stock et ses commandes.
const CatalogProduct = model.define("catalog_product", {
  id: model.id().primaryKey(),
  handle: model.text().unique(),
  title: model.text().index(),
  brand: model.text().index().nullable(),
  description: model.text().nullable(),
  // Copie du handle de la catégorie Medusa principale, pour filtrer sans jointure.
  category_handle: model.text().index().nullable(),
  attributes: model.json().nullable(),
})

export default CatalogProduct
