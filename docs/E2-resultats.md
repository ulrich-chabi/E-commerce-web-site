# E2 — Test de faisabilité marketplace

Résultat dans l'environnement de l'assistant (Linux, Node 22.22.2, PostgreSQL 16) : 14 tests sur 14 réussis
(`backend/integration-tests/http/marketplace.spec.ts`). Non exécuté sur Windows à ce stade.

## Critères du plan

| Critère | Résultat |
|---|---|
| Un vendeur ne voit que ses produits et ses commandes ; l'accès à une commande d'un autre vendeur est refusé | Réussi (404 sur la commande d'un autre vendeur) |
| Un panier de deux vendeurs donne deux commandes vendeur reliées à la commande client | Réussi |
| Un remboursement partiel sur un vendeur n'affecte pas l'autre | Réussi (plafond propre à chaque commande vendeur, registre séparé) |
| Tests automatiques pour chacun | Réussi |

## Défauts du code d'exemple officiel, volontairement non repris

- Un vendeur sans commande pouvait lister les commandes de tous les vendeurs (vérifié par un test de mutation : le test échoue si on réintroduit le défaut).
- Une route permettait à n'importe quel vendeur authentifié de supprimer l'administrateur d'un autre vendeur : route non reprise.
- Une ligne de panier sans vendeur était ignorée en silence : elle fait maintenant échouer la commande, avant toute création.
- Les frais de livraison étaient recopiés sur chaque commande vendeur : ils restent sur la commande client.

## Non testé / limites connues

- Stock : tests faits avec `manage_inventory: false`. La création des commandes vendeur pourrait réserver le stock une seconde fois ; à vérifier dans l'incrément stock.
- Livraison par vendeur, promotions et taxes par commande vendeur : non traités.
- Commissions et versements : pas encore (seul le remboursement est géré).
- Le paiement est celui du fournisseur de test de Medusa (simulation).
- Aucune interface : l'activation d'un vendeur et le remboursement se font par l'API d'administration.
- Pas encore de limitation des tentatives de connexion ni de règles de mot de passe.
- Inscription vendeur ouverte, mais sans effet tant que la plateforme n'a pas activé le vendeur.

## E3 (première partie) — contrôle du stock

Trois tests ajoutés (`backend/integration-tests/http/marketplace-stock.spec.ts`), tous réussis dans l'environnement de l'assistant :

- une commande à deux vendeurs réserve chaque quantité **une seule fois** (le risque de double réservation redouté n'existe pas : la création des commandes vendeur ne réserve pas le stock) ;
- deux achats simultanés du dernier stock : un seul réussit, aucune réservation excédentaire ;
- si le stock d'un vendeur disparaît avant le paiement, la commande échoue et aucune réservation ne reste chez l'autre vendeur.

Non traité : emplacements de stock propres à chaque vendeur, gestion du stock par le vendeur lui-même, déduction du stock à l'expédition, expiration des réservations de panier.
