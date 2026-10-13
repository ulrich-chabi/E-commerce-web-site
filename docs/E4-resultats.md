# E4 — Sécurité de base

Résultat dans l'environnement de l'assistant (Linux, Node 22.22.2, PostgreSQL 16) : 34 tests sur 34 réussis
(santé 1, marketplace 14, stock 3, stock par vendeur et suspension 5, sécurité 11). Non exécuté sur Windows à ce stade.
Un premier passage complet a connu un échec isolé dû à l'outil de test (erreur de permission PostgreSQL lors de la
réinitialisation de la base entre deux tests) ; il ne s'est pas reproduit au second passage.

## Ce qui est en place

- **Limitation des tentatives** (`POST /auth/:type/:provider`) : 5 échecs puis blocage de 15 minutes, par identifiant saisi. Le compteur est en base (table `login_attempt`) avec une empreinte HMAC de l'identifiant : ni email ni IP n'y sont stockés. Une connexion réussie remet le compteur à zéro. Valable pour l'administration, les vendeurs et les clients.
- **Message identique** : un compte inconnu et un mauvais mot de passe donnent la même réponse ; un compte inconnu est bloqué comme un compte réel. Le blocage répond 429 avec un message générique.
- **Mot de passe** : longueur minimale (4 par défaut, `PASSWORD_MIN_LENGTH`) sur l'inscription et la mise à jour. La commande `medusa user` en ligne de commande contourne cette règle.
- **Journal d'audit** (table `audit_event`, `GET /admin/audit-events` réservé à la plateforme) : changement de statut d'un vendeur, inscription vendeur, mise à jour de stock, remboursement, blocage de connexion. Aucun mot de passe ni jeton n'y est écrit (vérifié par un test). Chaque événement est aussi écrit dans les journaux du serveur, sans email ni IP.
- **Conservation temporaire des données personnelles** : une tâche nocturne efface l'email et l'IP des événements de plus de 90 jours, en gardant l'action, la cible et la date, et supprime les échecs de connexion de plus de 24 h.
- **Vendeur suspendu** : lecture seule de ses commandes ; catalogue, stock et modifications refusés (403).

## Limites connues

- Un envoi de nombreuses tentatives en parallèle peut dépasser légèrement la limite avant que les échecs soient enregistrés.
- L'adresse IP enregistrée dépend de la configuration du serveur derrière un proxy : à régler selon l'hébergeur choisi.
- Aucune limitation sur les autres routes (inscription, recherche) ; pas de double authentification.
- La tâche nocturne est testée en l'appelant directement ; son déclenchement par le planificateur de Medusa n'a pas été observé.
- La durée de 90 jours est une proposition, non validée.
- Les adresses email et IP du journal sont des données personnelles : une durée de conservation et une base légale devront être arrêtées avant un vrai service.
