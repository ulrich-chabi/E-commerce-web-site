# E3 — Stock par vendeur et suspension des comptes vendeur

Résultat dans l'environnement de l'assistant (Linux, Node 22.22.2, PostgreSQL 16) : 23 tests sur 23 réussis
(santé 1, marketplace 14, stock 3, stock par vendeur et suspension 5). Non exécuté sur Windows à ce stade.

## Ce qui est en place

- Emplacement de stock propre à chaque vendeur, créé à la première activation, rattaché au canal de vente. Les réservations d'une commande se font chez le vendeur propriétaire du produit.
- Le vendeur gère uniquement son stock (`GET` et `POST /vendors/stock`) ; une variante d'un autre vendeur est introuvable (404) ; un stock inférieur aux quantités réservées est refusé.
- Statuts : pending → active ⇄ suspended. Suspendu : produits retirés de la vente (puis rétablis à l'identique, sans publier ce qui était en brouillon), accès vendeur refusé, finalisation d'un panier refusée. Le stock et les données sont conservés.

## Décision du propriétaire : pas de suppression de compte

La suppression de compte vendeur (clôture, archivage, suppression de l'emplacement de stock) a été étudiée, testée puis abandonnée. Raisons constatées :

- Medusa laisse supprimer un emplacement de stock avec une réservation en cours, sans avertissement, et laisse des enregistrements orphelins.
- Les suppressions de Medusa sont logiques (lignes conservées avec `deleted_at`) : l'espace disque n'aurait pas été libéré.
- Les commandes en cours, retours et remboursements imposent des conditions strictes.

Le code correspondant a été retiré. Une migration supprime les deux colonnes ajoutées par l'étape précédente.

## Non testé / limites connues

- Livraison par vendeur, retours, interface : pas encore faits.
- Un vendeur suspendu n'a plus accès à ses commandes en cours : à revoir si ce comportement pose problème.
