# NIBU — YOUR LIFE, ONE LITTLE CREATURE.

Webapp **mobile-first** de gestion du quotidien, incarnée par un mini-robot futuriste.
V1 statique : **aucun serveur, aucune clé API, aucun compte, aucun traceur**.

**En ligne : https://quatree12.github.io/nibu/**

---

## 1. Mise en ligne sur GitHub Pages — pas à pas

### Option A — dépôt tout neuf (le plus simple)

1. Va sur **https://github.com/new**.
2. Nom du dépôt : `nibu`. Visibilité : **Public** (obligatoire pour Pages en offre gratuite).
3. Crée le dépôt, puis clique sur **uploading an existing file**.
4. Dépose les fichiers **à la racine** : `index.html`, `styles.css`, `app.js`, `README.md`, et le dossier `assets/`.
   > Attention : ne dépose pas le dossier parent, mais bien le **contenu**. `index.html` doit être à la racine du dépôt.
5. **Commit changes**.
6. Va dans **Settings → Pages** (menu de gauche).
7. Sous *Build and deployment* :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main` · **Folder** : `/ (root)`
   - **Save**.
8. Attends 30 à 90 secondes, recharge la page : l'URL apparaît en haut.
   Elle ressemble à `https://TON-PSEUDO.github.io/nibu/`.

### Option B — ligne de commande

```bash
git init
git add .
git commit -m "NIBU V1"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/nibu.git
git push -u origin main
```
Puis Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

### Option C — dépôt de type `PSEUDO.github.io`

Si le dépôt s'appelle exactement `TON-PSEUDO.github.io`, le site est servi à la racine :
`https://TON-PSEUDO.github.io/`.

---

## 2. Utilisation sur iPhone (Safari) — raccourci écran d'accueil

1. Ouvre l'URL NIBU dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil**.
3. Nomme-le « NIBU » → **Ajouter**.

Le raccourci ouvre NIBU en plein écran, comme une app. Ce **n'est pas** un widget iOS natif :
voir la section « Limites » plus bas.

---

## 3. Structure des fichiers

```
.
├── index.html    # structure + SVG du robot
├── styles.css    # direction artistique CHROME × ELECTRIC LIGHT × CYBERPUNK
├── app.js        # logique complète (état, rendus, réactions, persistance)
├── assets/
│   ├── nibu.svg  # favicon
│   └── nibu.png  # icône pour l'écran d'accueil iOS
└── README.md
```

Aucune dépendance externe, aucune étape de compilation : ce sont des fichiers statiques.

---

## 4. Ce que fait la V1

### A. Accueil — le monde de NIBU
- Robot SVG animé (flottement, clignements, reflets, cœur pulsé) avec **six humeurs** :
  neutre, satisfaite, concentrée, inquiète, endormie, en fête.
- Message personnalisé utilisant le nom défini dans les réglages.
- Indicateur d'énergie, niveau et XP.
- **Quatre indicateurs branchés sur les données réelles** : budget restant, prochaine échéance,
  nombre de rendez-vous à venir, commandes en cours.
- Capsules actives prioritaires, prochains rendez-vous, commandes en attente.
- **Mission du jour**, validée uniquement quand l'action a réellement été faite.
- État vide esthétique quand aucune donnée n'existe.
- Bouton principal « + Ajouter une capsule ».

### B. Budget — le centre financier
- Budget hebdomadaire en **CHF** (semaine du lundi au dimanche).
- Ajout d'une dépense : montant, catégorie, libellé, date (auto = aujourd'hui).
- Calcul automatique : **reste = budget hebdomadaire − total des dépenses de la semaine**.
- Barre de progression, pourcentage, historique, suppression unitaire, modification du budget,
  réinitialisation avec confirmation.
- Alerte visuelle + réaction humoristique en cas de dépassement, **sans culpabilisation**.
- Aucune lecture de compte bancaire : tout est saisi manuellement.

### C. Capsules — la mémoire du quotidien
Quatre types : **échéance**, **rendez-vous**, **commande & colis**, **rappel & note**.
Chaque capsule possède un identifiant unique, un type, un titre, une date et une heure facultatives,
un montant facultatif, un détail, un statut et une date de création.
- Créer, consulter, modifier, terminer, réactiver, supprimer (avec confirmation).
- **Tri** : date proche, date lointaine, création récente, création ancienne, titre A→Z.
- **Filtres** : par type et par statut.
- Capsules terminées regroupées à part, pliables.
- Mise en évidence visuelle : **EN RETARD** ou **BIENTÔT** (≤ 3 jours).
- Commandes : statuts commandé → expédié → en livraison → livré, plus annulé.
- Aucune date de livraison ou échéance inventée : si le champ est vide, il reste vide.

### D. Réglages — le contrôleur de NIBU
- Nom utilisé par NIBU, budget hebdomadaire, réduction forcée des animations.
- **Export JSON**, import JSON, effacement complet avec confirmation.
- Informations de confidentialité et limites de la version web.
- Distinction explicite entre ce qui fonctionne dans la webapp et ce qui exige une app iOS native.

---

## 5. Confidentialité

- Les données vivent dans le **localStorage** du navigateur : rien ne quitte l'appareil.
- Aucune requête réseau émise par l'application.
- Aucun compte, aucun cookie tiers, aucun traceur publicitaire.
- Aucune demande de mot de passe bancaire, de numéro de carte ou d'identifiant de compte.
- **Le localStorage n'est pas un coffre-fort** : les données ne sont pas chiffrées et ne se
  synchronisent pas entre appareils.
- Si les données du navigateur sont effacées sans export préalable, les capsules sont perdues.
  → **Exporte régulièrement** depuis Réglages.

### Format d'export
```json
{
  "app": "NIBU",
  "version": 1,
  "exportedAt": "2026-10-27T09:00:00.000Z",
  "settings": { "name": "pilote", "weeklyBudget": 90, "reduceMotion": false },
  "capsules": [], "expenses": [], "xp": 0,
  "counters": { "created": 0, "spentCount": 0, "doneCount": 0 },
  "mission": { "date": "2026-10-27", "id": "add-capsule", "done": false }
}
```

---

## 6. Limites assumées de la V1

**Possible dans cette webapp :** afficher NIBU, gérer les capsules, calculer le budget,
suivre rendez-vous et commandes manuellement, conserver les données dans le navigateur,
exporter, être installée comme raccourci web si le navigateur le permet.

**Nécessite une application iOS native :** véritable **widget** sur l'écran d'accueil,
partage fiable des données entre l'app et le widget, **notifications locales** selon les
autorisations iOS, intégration native au **calendrier Apple**, accès à des données d'autres
applications, synchronisation sécurisée entre appareils, actualisation permanente en temps réel.

**Piste pour la version native :** SwiftUI avec WidgetKit. Le widget pourra afficher le robot,
la prochaine échéance, le budget restant et une commande en cours ; les interactions complexes
ouvriront l'application principale. Le widget respectera les mécanismes de rafraîchissement
d'iOS — aucune actualisation permanente en temps réel ne peut être promise.

Aucune notification système n'est simulée dans la V1. Les réactions de NIBU reposent sur des
règles et des messages prédéfinis : **aucune IA n'est connectée**, et l'application ne prétend
pas le contraire.

---

## 7. Accessibilité et performance

- Pensée d'abord pour un écran d'iPhone, utilisable au pouce, cibles ≥ 44 px.
- Contraste élevé, aucun état indiqué par la couleur seule (libellés textuels en plus).
- Champs en 16 px pour éviter le zoom automatique de Safari iOS.
- Formats de date et montants adaptés à la Suisse, gestion correcte des accents français.
- Animations légères ; respect de `prefers-reduced-motion` **et** option de réduction forcée.
- Aucun défilement horizontal, aucun débordement sur un iPhone XR (414 × 896).

---

## 8. Checklist de test (V1)

- [ ] Création et modification d'une capsule.
- [ ] Suppression avec confirmation et réactivation.
- [ ] Tri et filtrage réellement appliqués.
- [ ] Ajout et suppression d'une dépense.
- [ ] Calcul du budget restant exact.
- [ ] Modification du budget hebdomadaire.
- [ ] Mise à jour des quatre compteurs de l'accueil.
- [ ] Enregistrement conservé après rechargement de la page.
- [ ] Export JSON valide et réimportable.
- [ ] Effacement des données avec confirmation.
- [ ] Navigation entre les quatre sections.
- [ ] Aucune erreur JavaScript dans la console.
- [ ] Aucun bouton sans fonction.
- [ ] Affichage correct sur un écran mobile étroit.

---

## 9. Feuille de route

1. Notifications locales natives (app iOS).
2. Widget WidgetKit : robot, prochaine échéance, budget restant, commande en cours.
3. Synchronisation chiffrée optionnelle entre appareils.
4. Intégration calendrier avec autorisation explicite.
5. Suivi automatique de colis via des services compatibles.

NIBU — *YOUR LIFE, ONE LITTLE CREATURE.*
