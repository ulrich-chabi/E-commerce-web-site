# Registre des décisions

Statuts : validée / proposée / à confirmer / rejetée. Dernière mise à jour : 2026-10-10.

| # | Décision | Statut | Étape |
|---|---|---|---|
| 1 | Prototype de refonte UI/UX d'Amazon.com, proposition indépendante, sans infrastructure de production | validée | A |
| 2 | Marché : États-Unis, anglais américain, USD | validée | A |
| 3 | Modèle hybride (ventes directes + vendeurs tiers), commandes multi-vendeurs | validée | A |
| 4 | Paiements, livraisons, commissions, versements simulés ; aucune transaction réelle | validée | A |
| 5 | Budget 0 à 1 $ ; calendrier initial 3 mois, dépassement accepté | validée | A |
| 6 | Identité originale, sans marque ni logo d'Amazon ; emplacement de logo seulement | validée | A, C |
| 7 | Toutes les catégories, en profondeur (~20 produits par grande catégorie), construites par étapes | validée | B |
| 8 | Taxes simulées : taux fixe de 1 % (fictif) | validée | B |
| 9 | Priorisation : cœur = recherche, fiche, comparateur, panier, commande, compte, suivi ; important = retours, espace vendeur ; administration | validée | B |
| 10 | Direction visuelle chaleureuse (crème, terracotta, sarcelle), ordinateur d'abord, mobile et tablette à concevoir | validée | C |
| 11 | Stack : Medusa + Next.js + PostgreSQL, TypeScript, développement local | validée | D |
| 12 | Test de faisabilité marketplace (vendeurs, commande multi-vendeurs, permissions, remboursement partiel) ; repli sur Node.js + SQLite si échec | validée | D |
| 13 | Hébergeur gratuit : à choisir par le propriétaire ; rien dans le code ne doit dépendre du local | validée | D |
| 14 | Redis, moteur de recherche dédié, microservices : non utilisés au départ | proposée | D |
| 15 | Diffusion à Amazon : politique sur les idées non sollicitées à vérifier avant tout envoi | à confirmer | A |
| 16 | Marketplace : notre propre module (vendeurs, administrateurs de vendeur, registre de remboursements), d'après la recette officielle ; Mercur en lecture seule | validée | E2 |
| 17 | Une commande Medusa par vendeur ; la commande client sert de « groupe » (pas d'entité séparée, écart avec le plan initial) | validée (écart à confirmer) | E2 |
| 18 | Vendeur créé « pending », activé ou suspendu uniquement par la plateforme | proposée | E2 |
| 19 | Remboursement décidé par la plateforme, plafonné par commande vendeur, tracé dans un registre | proposée | E2 |
| 20 | Go / no-go Medusa après le test de faisabilité E2 | à confirmer | E2 |
| 21 | Un emplacement de stock par vendeur, créé à sa première activation et rattaché au canal de vente | validée | E3 |
| 22 | Statuts vendeur : pending → active ⇄ suspended. Suspension : produits retirés de la vente, stock conservé, réactivable | validée | E3 |
| 23 | Délai de rétention et archivage automatique | rejetée (suppression de compte abandonnée à la demande du propriétaire) | E3 |
| 24 | Archivage et suppression de l'emplacement de stock d'un vendeur | rejetée (trop de conflits : commandes en cours, suppression logique de Medusa) | E3 |
| 25 | Purge physique des données supprimées | sans objet pour l'instant | E3 |
| 26 | Limitation des tentatives de connexion : compteur en base, 5 échecs puis blocage de 15 minutes, par identifiant saisi (compte existant ou non) | validée | E4 |
| 27 | Mot de passe : longueur minimale de 4 caractères pour le prototype (variable PASSWORD_MIN_LENGTH) ; 12 recommandé en usage réel | validée (à durcir avant usage réel) | E4 |
| 28 | Journal des actions sensibles en base de données, consultable par la plateforme | validée | E4 |
| 29 | Vendeur suspendu : lecture seule de ses commandes, tout le reste refusé | validée | E4 |
| 30 | Conservation temporaire des données personnelles : email et IP du journal effacés après 90 jours, événements conservés ; échecs de connexion supprimés après 24 h (variable PERSONAL_DATA_RETENTION_DAYS) | validée (durée de 90 jours : proposition à confirmer) | E4 |
| 31 | Message d'erreur identique : même réponse pour un compte inconnu et un mauvais mot de passe, et même blocage pour un compte inconnu | validée (choix délégué à l'assistant) | E4 |
| 32 | Offres : une fiche catalogue regroupe les produits de plusieurs vendeurs (chaque offre garde son prix, son stock et ses commandes) | validée | F |
| 33 | Site Next.js neuf (Next 16, React 19, Tailwind 4, kit officiel Medusa), construit à partir des maquettes | validée | F |
| 34 | Visuels de substitution générés, marques inventées, aucun avis ni note | validée | F |
| 35 | Catalogue fictif : 20 rayons, 20 fiches par rayon (réglable), 7 vendeurs dont « Marketplace Direct » pour les ventes directes | validée (ajustable) | F |
| 36 | Terracotta assombri (#A33F22) : le précédent (#B4492A) était sous le seuil de contraste sur le fond sable des menus | proposée | F |
| 37 | Site non indexé par les moteurs de recherche (prototype) | proposée | F |

