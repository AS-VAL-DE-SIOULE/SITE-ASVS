# Site internet de l'AS Val de Sioule

Site statique en HTML/CSS/JS, avec un **back-office en ligne** protégé par identifiant.
Aucune base de données, aucun serveur à administrer, aucun abonnement payant.

---

## 1. Comment on modifie le site

**Tout se fait depuis le back-office**, à l'adresse `/admin/` du site
(ex. `asvaldesioule.fr/admin/`). Vous vous connectez avec votre e-mail et votre
mot de passe, vous modifiez, vous cliquez sur **Publier**. Le site se met à jour
tout seul en une minute environ.

Vous êtes le seul à pouvoir vous connecter : l'inscription est fermée, seules les
personnes que vous invitez explicitement peuvent créer un compte.

> **Première installation :** voir `Outils site\guide-mise-en-ligne.html`.
> Il faut créer un compte GitHub et un compte Netlify (gratuits), une seule fois.

### Les 9 modules modifiables

| Module | Ce qu'il pilote |
|---|---|
| **Infos générales du club** | Nom, stade, communes, e-mails, liens Facebook et boutique, nombre de licenciés |
| **Actualités** | Accueil + page Actualités. Photo, **vidéo**, **PDF joint**, lien |
| **Calendrier des matchs** | Page Calendrier + « prochains rendez-vous » de l'accueil. Scores compris |
| **Les équipes** | Fiches Séniors A / B / école de foot, avec photo ou vidéo d'équipe |
| **Événements** | Manifestations de la saison, avec photo et document joint |
| **Partenaires** | Sponsors, niveau Or/Argent/Bronze, logo et site internet |
| **Bureau, conseil & commissions** | Page Le club. Un bloc vide disparaît automatiquement |
| **Galerie photos & vidéos** | Bas de la page Équipes |
| **Documents à télécharger** | Plaquettes, règlements, comptes-rendus, rangés par page |

**Vous pouvez importer une photo, une vidéo ou un PDF depuis n'importe lequel de ces
modules.** Le bouton « Choisir une image » / « Choisir un fichier » ouvre la
médiathèque : vous y téléversez le fichier, il est stocké dans `assets/medias/`.

---

## 2. Où sont les données

Le contenu vit dans le dossier **`content/`**, en fichiers JSON :

```
content/
├── club.json              Infos générales
├── actualites.json        Actualités écrites à la main
├── actualites-auto.json   Actualités importées de Facebook (généré, optionnel)
├── matchs.json            Calendrier
├── equipes.json           Fiches des équipes
├── evenements.json        Manifestations
├── partenaires.json       Sponsors
├── organisation.json      Bureau, conseil, commissions
├── galerie.json           Photos et vidéos
└── documents.json         Fichiers à télécharger
```

Le back-office écrit dans ces fichiers. Vous pouvez aussi les modifier à la main
avec le Bloc-notes si besoin, mais **le back-office est la voie normale** : il évite
les erreurs de virgule et de guillemet.

---

## 3. Structure du dossier

```
Site ASVS/
├── index.html          Accueil
├── club.html           Histoire, valeurs, bureau, territoire
├── equipes.html        Équipes, encadrement, galerie
├── calendrier.html     Matchs avec filtres
├── actualites.html     Actualités + boutique
├── evenements.html     Manifestations
├── partenaires.html    Sponsors, supports, défiscalisation
├── infos.html          Licences, stade, contact, documents, FAQ
├── admin/              LE BACK-OFFICE
│   ├── index.html
│   └── config.yml      Décrit les modules et leurs champs
├── content/            LES DONNÉES (voir ci-dessus)
├── assets/
│   ├── css/style.css   Toute la mise en forme
│   ├── js/main.js      Le moteur d'affichage
│   ├── img/            Logo, bannière, calendriers
│   ├── photos/         Photos existantes
│   ├── medias/         Ce que vous téléversez depuis le back-office
│   └── docs/           PDF existants
├── netlify.toml        Réglages d'hébergement
└── robots.txt          Empêche l'indexation de /admin/
```

---

## 4. Conseils sur les médias

### Photos
Format `.jpg`, largeur 1200 à 1600 px, **moins de 500 Ko**. Une photo de 5 Mo rend
le site lent sur téléphone. Pour alléger : clic droit → **Ouvrir avec → Photos** →
Redimensionner.

Pour une **photo d'équipe** : format paysage, en pied, de face, lumière dans le dos
du photographe. Elle est recadrée en bandeau large, donc cadrez l'équipe au centre.
Évitez le portrait vertical du téléphone.

### Vidéos
Format `.mp4`, **20 Mo maximum**. Au-delà, la publication devient lente et le site
lourd à charger. Pour une vidéo longue, publiez-la sur Facebook ou YouTube et mettez
simplement le lien dans le champ « En savoir plus ».

### PDF
Aucune limite technique gênante, mais restez sous 10 Mo. Le champ « Où l'afficher »
du module Documents détermine sur quelle page le fichier apparaît.

---

## 5. Droit à l'image — à lire avant de publier une photo

Une photo publiée sur le site est publique et indexée par Google.

- **Mineurs** : jamais de photo identifiable d'enfant sans l'autorisation écrite des
  parents. Le club fait signer cette autorisation à l'inscription — vérifiez avant.
- **Adultes** : prévenez les joueurs, et retirez une photo à la première demande.
- En cas de doute sur un groupe d'enfants, préférez un plan large de dos ou une photo
  d'action où les visages ne sont pas reconnaissables.

---

## 6. Données personnelles

Le module Partenaires n'affiche **que** le nom de l'entreprise et ce qu'elle finance.
Les noms de contacts, e-mails et téléphones du classeur `ASVS - Gestion Financiere.xlsm`
**ne doivent jamais être saisis dans le back-office** : cette page est publique.

### Les deux adresses e-mail — à ne pas mélanger

| Champ | Adresse | Où elle apparaît |
|---|---|---|
| E-mail général | `554229@laurafoot.org` | Pied de page, licences, page Infos pratiques |
| E-mail partenariats | `asvaldesioule@gmail.com` | Page Partenaires + ligne « Partenariats » |

Chaque adresse a son rôle, c'est volontaire.

---

## 7. Import automatique depuis Facebook

Un outil séparé, dans le dossier **`Outils site`** (à côté de `Site ASVS`), récupère
les publications de la page Facebook et écrit `content/actualites-auto.json`.

- Les actualités que vous écrivez dans le back-office restent **prioritaires** et ne
  sont jamais écrasées.
- L'outil écarte les publications personnelles (anniversaires…) via une liste de
  mots exclus.
- Détails : `Outils site\guide-import-facebook.html`.

---

## 8. Prévisualiser en local

Le site lit ses données par le réseau : un simple double-clic sur `index.html` ne
suffit plus, il faut passer par un petit serveur local. Le script
`.claude\serve-asvs.ps1` s'en charge et sert le site sur `http://localhost:8123`.

En pratique, vous n'en aurez pas besoin : le back-office a son propre aperçu, et le
site en ligne se met à jour en une minute.

---

## 9. Mentions légales

La page `mentions-legales.html` est en place, liée depuis le pied de page de toutes
les pages. Elle couvre l'éditeur, le directeur de la publication, l'hébergeur, la
propriété intellectuelle, le droit à l'image, les données personnelles et les cookies.

Trois champs viennent du back-office (module « Infos générales du club ») :

| Champ | Valeur actuelle |
|---|---|
| Directeur de la publication | Philippe ALLIGIER, président |
| Adresse du siège social | Stade Municipal, 03110 Broût-Vernet — **à confirmer d'après les statuts** |
| Numéro RNA | **vide** — la ligne est masquée tant qu'il n'est pas renseigné |

Le numéro RNA (`W03…`) figure sur le récépissé de déclaration en préfecture. Il n'est
pas strictement obligatoire pour une association non commerciale, mais il rend les
mentions plus solides.

---

## 10. Aide-mémoire couleurs

Définies une seule fois, en haut de `assets/css/style.css` :

| Variable | Couleur | Usage |
|---|---|---|
| `--rouge` | `#e1332b` | Broût-Vernet — boutons principaux |
| `--vert` | `#2f9e4f` | Étroussat — matchs à domicile |
| `--bleu` | `#2f6fb7` | La Sioule — liens, dates |
| `--navy` | `#22374f` | Bleu du blason |
| `--pelouse` | `#1e3b28` | Fond des sections sombres |
| `--creme` | `#f7f4ec` | Fond général |

Polices : **Anton** (titres), **Caveat Brush** (accroches manuscrites), **Barlow** (texte).

---

## 11. En attente

- [ ] **Conseil d'administration** — à saisir dans le module « Bureau, conseil & commissions ».
      Le bloc est masqué tant que la liste est vide.
- [ ] **Commissions** — idem.
- [ ] **Photos d'équipe** Séniors B et école de foot.
- [ ] **Numéro RNA** de l'association et adresse exacte du siège (voir point 9).
- [ ] Le nombre de licenciés (113) date de l'AG du 15/06/2025 — à actualiser.
- [ ] L'encadrement des jeunes date de 2024-2025 — à confirmer.
- [ ] Les arbitres cités page Équipes — toujours d'actualité ?
- [ ] L'adresse exacte du stade (rue) pour le plan d'accès.
