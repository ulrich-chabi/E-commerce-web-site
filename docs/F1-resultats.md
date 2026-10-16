# F1 — Site Next.js : accueil, rayons, recherche, fiche simple

## Ce qui est en place

- **Backend** : module catalogue (fiche catalogue reliée aux produits des vendeurs), routes publiques `GET /store/catalog` (filtres : texte, rayon, vendeur, prix ; tris ; pagination ; liste des vendeurs disponibles) et `GET /store/catalog/:handle`. Seules les offres de vendeurs actifs, publiées et avec un prix sont visibles ; une fiche sans offre visible n'apparaît pas.
- **Script de démonstration** : 20 rayons, 7 vendeurs (dont « Marketplace Direct »), 400 fiches et environ 1 000 offres fictives ; 19 secondes dans l'environnement de l'assistant.
- **Site** (`storefront`) : accueil, tous les rayons, page de rayon et recherche avec filtres, fiche produit simple (offres par prix), pages d'information du pied de page (textes à rédiger), pages « Cart » et « Account » provisoires. Logo : emplacement. Interface en anglais américain, prix en USD, site non indexé.

## Vérifications effectuées (environnement de l'assistant : Linux, Node 22.22.2, PostgreSQL 16)

- Backend : 42 tests automatiques réussis (dont 8 sur le catalogue).
- Site : vérification des types et compilation réussies.
- Contrôle d'accessibilité automatique (axe-core, règles WCAG 2.0 à 2.2 niveaux A et AA) sur 10 pages ou états : aucune violation après correction du contraste du terracotta.
- Parcours manuel scripté : pagination (17 pages sur 400 fiches), filtres vendeur et prix combinés avec tri, recherche sans résultat, fiche produit, retour à l'accueil par le logo, lien d'évitement au clavier. Pas de défilement horizontal à 390 px de large.
- Temps de réponse du backend : 0,05 à 0,65 s selon la requête, sur 400 fiches.

## Défauts trouvés et corrigés pendant le développement

- La fiche d'un produit situé au-delà des 100 premiers (ordre alphabétique) renvoyait « introuvable » : corrigé par un filtre direct, avec un test qui échoue sans le correctif.
- Pages inconnues (fiche, rayon, page d'information) qui répondaient avec le code HTTP 200 au lieu de 404 (« fausse 404 ») à cause d'un écran de chargement global : écran retiré, les trois répondent maintenant 404.
- Contraste insuffisant du lien terracotta sur le fond des menus (4,45 au lieu de 4,5) : couleur assombrie.

## Non fait / limites connues

- Les vérifications du site ci-dessus ont été faites par des scripts ponctuels, **pas par des tests automatiques livrés dans le dépôt** (à ajouter).
- Pas de panier, de commande, de compte (F3, F4), ni de comparateur et de détail des offres (F2).
- Pas de contenu sponsorisé, de recommandations, d'avis ni de notes : aucune donnée ne les porte.
- Recherche simple (texte contenu dans le titre ou la marque) : pas de tolérance aux fautes ni de synonymes.
- Le prix « à partir de » est recalculé à chaque requête ; à optimiser si le catalogue grossit nettement.
- Une seule variante par produit ; pas d'indicateur de disponibilité.
- Mise en page mobile contrôlée seulement par une capture et l'absence de défilement horizontal.
- Noms de marques inventés : ressemblance fortuite possible avec des marques existantes, à faire vérifier avant toute diffusion.
