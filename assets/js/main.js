/* ============================================================
   AS VAL DE SIOULE — moteur du site
   ------------------------------------------------------------
   Ce fichier lit les données dans le dossier /content (fichiers
   JSON) et construit les pages. Il n'a pas à être modifié pour
   mettre le site à jour : tout se pilote depuis le back-office
   à l'adresse /admin/, ou en éditant les fichiers de /content.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Outils ---------- */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const MOIS  = ["janvier", "février", "mars", "avril", "mai", "juin",
                 "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const MOIS_COURT = ["janv.", "févr.", "mars", "avril", "mai", "juin",
                      "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  /* Données du site, remplies au chargement */
  const D = {
    club: {}, matchs: [], actus: [], evenements: [], partenaires: [],
    bureau: [], conseil: [], commissions: [], arbitres: [],
    equipes: [], galerie: [], documents: [], affiches: [], histoire: null
  };

  function versDate(iso) {
    const [a, m, j] = String(iso).split("-").map(Number);
    return new Date(a, (m || 1) - 1, j || 1);
  }
  function dateLongue(iso) {
    const d = versDate(iso);
    return JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear();
  }
  function dateCourte(iso) {
    const d = versDate(iso);
    return JOURS[d.getDay()].slice(0, 3) + ". " + d.getDate() + " " + MOIS_COURT[d.getMonth()] + " " + d.getFullYear();
  }
  function echapper(txt) {
    return String(txt == null ? "" : txt)
      .replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function initiales(nom) {
    const mots = String(nom).trim().split(/\s+/);
    return ((mots[0] || "")[0] + (mots[mots.length - 1] || "")[0] || "?").toUpperCase();
  }
  /* Les chemins venant du back-office commencent par "/" ; on les
     accepte tels quels, comme les chemins relatifs existants. */
  function chemin(p) { return String(p || "").trim(); }

  function estVideo(f) { return /\.(mp4|webm|ogg|mov|m4v)$/i.test(f || ""); }

  /* ---------- Chargement des données ---------- */
  const FICHIERS = {
    club:        "content/club.json",
    matchs:      "content/matchs.json",
    actus:       "content/actualites.json",
    evenements:  "content/evenements.json",
    partenaires: "content/partenaires.json",
    organisation:"content/organisation.json",
    equipes:     "content/equipes.json",
    galerie:     "content/galerie.json",
    documents:   "content/documents.json",
    affiches:    "content/affiches.json",
    histoire:    "content/histoire.json",
    actusAuto:   "content/actualites-auto.json"
  };

  /* Chemin racine : permet au site de fonctionner aussi bien à la
     racine du domaine que dans un sous-dossier. */
  function racine() {
    const base = document.querySelector('meta[name="asvs-racine"]');
    return base ? base.content.replace(/\/?$/, "/") : "";
  }

  async function lire(url) {
    try {
      const r = await fetch(racine() + url, { cache: "no-cache" });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  async function chargerDonnees() {
    /* On indexe par nom plutôt que par position : ajouter un fichier
       à la liste ci-dessus ne peut plus décaler les autres. */
    const cles = Object.keys(FICHIERS);
    const recus = await Promise.all(cles.map(k => lire(FICHIERS[k])));
    const F = {};
    cles.forEach((k, i) => { F[k] = recus[i]; });

    const club = F.club, matchs = F.matchs, actus = F.actus, evts = F.evenements,
          parts = F.partenaires, orga = F.organisation, equipes = F.equipes,
          gal = F.galerie, docs = F.documents, aff = F.affiches,
          hist = F.histoire, auto = F.actusAuto;

    if (club)    D.club        = club;
    if (matchs)  D.matchs      = matchs.liste || [];
    if (evts)    D.evenements  = evts.liste || [];
    if (parts)   D.partenaires = parts.liste || [];
    if (equipes) D.equipes     = equipes.liste || [];
    if (gal)     D.galerie     = gal.liste || [];
    if (docs)    D.documents   = docs.liste || [];
    if (aff)     D.affiches    = aff.liste || [];
    if (hist)    D.histoire    = hist;
    if (orga) {
      D.bureau      = orga.bureau || [];
      D.conseil     = orga.conseil || [];
      D.commissions = orga.commissions || [];
      D.arbitres    = orga.arbitres || [];
    }

    /* Actualités : celles écrites à la main d'abord, puis celles
       importées de Facebook. En cas de doublon, la main l'emporte. */
    const manuelles = (actus && actus.liste) ? actus.liste.slice() : [];
    const auto2 = (auto && auto.liste) ? auto.liste : [];
    auto2.forEach(a => {
      const doublon = manuelles.some(m =>
        (m.lien && a.lien && m.lien === a.lien) ||
        (m.titre && a.titre && m.titre.toLowerCase() === a.titre.toLowerCase()));
      if (!doublon) manuelles.push(a);
    });
    D.actus = manuelles.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  /* ---------- Navigation mobile ---------- */
  function navMobile() {
    const bouton = $(".burger");
    const nav = $(".nav-principale");
    if (!bouton || !nav) return;
    bouton.addEventListener("click", function () {
      const ouvert = nav.classList.toggle("ouvert");
      bouton.setAttribute("aria-expanded", ouvert ? "true" : "false");
    });
    $$("a", nav).forEach(a => a.addEventListener("click", function () {
      nav.classList.remove("ouvert");
      bouton.setAttribute("aria-expanded", "false");
    }));
  }

  function anneeAuto() {
    $$("[data-annee]").forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  function retourHaut() {
    const btn = document.createElement("button");
    btn.className = "haut";
    btn.type = "button";
    btn.setAttribute("aria-label", "Revenir en haut de la page");
    btn.innerHTML = "&#8593;";
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.appendChild(btn);
    const maj = () => btn.classList.toggle("visible", window.scrollY > 600);
    window.addEventListener("scroll", maj, { passive: true });
    maj();
  }

  /* ---------- Apparition au défilement ---------- */
  function apparitions() {
    // Les en-têtes de section s'animent aussi : le trait tricolore
    // se déploie quand le titre entre à l'écran.
    $$(".entete-section").forEach(e => e.classList.add("reveal"));

    let restants = $$(".reveal, .reveal-gauche, .reveal-droite, .reveal-zoom");
    if (!restants.length) return;
    let tache = null;

    function verifier() {
      tache = null;
      const limite = window.innerHeight * 0.94;
      restants = restants.filter(function (el) {
        if (el.getBoundingClientRect().top < limite) { el.classList.add("vu"); return false; }
        return true;
      });
      if (!restants.length) {
        window.removeEventListener("scroll", planifier);
        window.removeEventListener("resize", planifier);
      }
    }
    function planifier() {
      if (!tache) tache = window.requestAnimationFrame(verifier);
    }

    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier);
    verifier();
  }

  /* ---------- Carrousel de photos ----------
     Rend un diaporama à partir d'une liste de médias. Une seule photo :
     on affiche simplement l'image, sans habillage inutile. */
  let compteurCarrousel = 0;

  function normaliserPhotos(objet) {
    // Accepte le nouveau format (liste "photos") comme l'ancien (champ "image")
    let liste = [];
    if (Array.isArray(objet.photos)) {
      liste = objet.photos
        .map(p => (typeof p === "string") ? { fichier: p, legende: "" } : p)
        .filter(p => p && p.fichier);
    }
    if (!liste.length && objet.image) liste = [{ fichier: objet.image, legende: objet.legende || "" }];
    return liste;
  }

  /* Rend un texte long en respectant les retours à la ligne.
     Indispensable pour les textes recopiés depuis Facebook, qui sont
     écrits en paragraphes séparés par des lignes vides. */
  function texteRiche(txt) {
    if (!txt) return "";
    const paragraphes = String(txt)
      .replace(/\r\n?/g, "\n")
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean);
    if (!paragraphes.length) return "";
    return paragraphes
      .map(p => "<p>" + echapper(p).replace(/\n/g, "<br>") + "</p>")
      .join("");
  }

  function blocCarrousel(photos, format) {
    if (!photos.length) return "";
    const cls = "carrousel--" + (format || "4-3");

    if (photos.length === 1) {
      const p = photos[0];
      const f = chemin(p.fichier);
      const media = estVideo(f)
        ? '<video controls preload="metadata" playsinline src="' + echapper(f) + '"></video>'
        : '<img src="' + echapper(f) + '" alt="' + echapper(p.legende || "") + '" loading="lazy">';
      return '<div class="carrousel ' + cls + '"><div class="carrousel__piste">' +
        '<div class="carrousel__vue">' + media +
        (p.legende ? '<div class="carrousel__legende">' + echapper(p.legende) + '</div>' : "") +
        '</div></div></div>';
    }

    const id = "carr-" + (++compteurCarrousel);
    const vues = photos.map(p => {
      const f = chemin(p.fichier);
      const media = estVideo(f)
        ? '<video controls preload="metadata" playsinline src="' + echapper(f) + '"></video>'
        : '<img src="' + echapper(f) + '" alt="' + echapper(p.legende || "") + '" loading="lazy">';
      return '<div class="carrousel__vue">' + media +
        (p.legende ? '<div class="carrousel__legende">' + echapper(p.legende) + '</div>' : "") +
        '</div>';
    }).join("");

    const points = photos.map((p, i) =>
      '<button class="carrousel__point" type="button" data-vers="' + i + '" ' +
      'aria-label="Photo ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '></button>'
    ).join("");

    return '<div class="carrousel ' + cls + '" id="' + id + '" data-carrousel>' +
      '<div class="carrousel__compteur"><span data-actuel>1</span>/' + photos.length + '</div>' +
      '<div class="carrousel__piste">' + vues + '</div>' +
      '<button class="carrousel__nav carrousel__nav--prec" type="button" aria-label="Photo précédente">&#8249;</button>' +
      '<button class="carrousel__nav carrousel__nav--suiv" type="button" aria-label="Photo suivante">&#8250;</button>' +
      '<div class="carrousel__points">' + points + '</div>' +
    '</div>';
  }

  /* Une image qui ne charge pas ne doit pas laisser un cadre vide.
     C'est le cas typique d'un lien collé depuis Facebook : les adresses
     du CDN de Facebook sont signées et expirent au bout de quelques heures. */
  function surveillerImages() {
    document.addEventListener("error", function (e) {
      const el = e.target;
      if (!el || el.tagName !== "IMG") return;

      const vue = el.closest(".carrousel__vue");
      if (vue) {
        const carrousel = vue.closest(".carrousel");
        vue.remove();
        if (carrousel && !carrousel.querySelector(".carrousel__vue")) carrousel.remove();
        else if (carrousel) reindexerCarrousel(carrousel);
        return;
      }
      const figure = el.closest("figure");
      if (figure) { figure.remove(); return; }
      el.style.display = "none";
    }, true);   // capture : les erreurs d'image ne remontent pas autrement
  }

  /* Remet à jour points et compteur après suppression d'une vue */
  function reindexerCarrousel(c) {
    const vues = $$(".carrousel__vue", c).length;
    const points = $$(".carrousel__point", c);
    points.slice(vues).forEach(p => p.remove());
    const compteur = $(".carrousel__compteur", c);
    if (compteur) {
      if (vues <= 1) compteur.remove();
      else compteur.innerHTML = '<span data-actuel>1</span>/' + vues;
    }
    if (vues <= 1) {
      $$(".carrousel__nav, .carrousel__points", c).forEach(el => el.remove());
      c.removeAttribute("data-carrousel");
      $(".carrousel__piste", c).style.transform = "translateX(0)";
    }
  }

  /* Active tous les carrousels présents dans la page */
  function activerCarrousels() {
    $$("[data-carrousel]").forEach(function (c) {
      const piste = $(".carrousel__piste", c);
      const points = $$(".carrousel__point", c);
      const compteur = $("[data-actuel]", c);
      const total = points.length;
      let index = 0;
      let minuterie = null;

      function aller(n) {
        index = (n + total) % total;
        piste.style.transform = "translateX(" + (-index * 100) + "%)";
        points.forEach((p, i) => {
          if (i === index) p.setAttribute("aria-current", "true");
          else p.removeAttribute("aria-current");
        });
        if (compteur) compteur.textContent = index + 1;
      }
      function relancer() {
        arreter();
        minuterie = window.setInterval(() => aller(index + 1), 4500);
      }
      function arreter() {
        if (minuterie) { window.clearInterval(minuterie); minuterie = null; }
      }

      $(".carrousel__nav--prec", c).addEventListener("click", () => { aller(index - 1); relancer(); });
      $(".carrousel__nav--suiv", c).addEventListener("click", () => { aller(index + 1); relancer(); });
      points.forEach(p => p.addEventListener("click", () => {
        aller(parseInt(p.dataset.vers, 10)); relancer();
      }));

      // On met en pause quand la souris ou le clavier est dessus
      c.addEventListener("mouseenter", arreter);
      c.addEventListener("mouseleave", relancer);
      c.addEventListener("focusin", arreter);
      c.addEventListener("focusout", relancer);

      // Balayage au doigt
      let departX = null;
      c.addEventListener("touchstart", e => { departX = e.touches[0].clientX; arreter(); }, { passive: true });
      c.addEventListener("touchend", e => {
        if (departX === null) return;
        const delta = e.changedTouches[0].clientX - departX;
        if (Math.abs(delta) > 45) aller(index + (delta < 0 ? 1 : -1));
        departX = null; relancer();
      }, { passive: true });

      // Le diaporama ne tourne que si le bloc est visible à l'écran
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(entrees => {
          entrees.forEach(e => e.isIntersecting ? relancer() : arreter());
        }, { threshold: 0.35 }).observe(c);
      } else {
        relancer();
      }
    });
  }

  /* ---------- Fragments média réutilisables ---------- */
  function blocVideo(src, classe) {
    if (!src) return "";
    return '<div class="' + (classe || "media-video") + '">' +
      '<video controls preload="metadata" playsinline src="' + echapper(chemin(src)) + '">' +
      'Votre navigateur ne peut pas lire cette vidéo.</video></div>';
  }

  function lienDocument(src, titre) {
    if (!src) return "";
    const nom = titre || "Télécharger le document";
    return '<a class="doc-lien" href="' + echapper(chemin(src)) + '" target="_blank" rel="noopener">' +
      '<span class="doc-lien__icone" aria-hidden="true">📄</span>' +
      '<span>' + echapper(nom) + '</span></a>';
  }

  /* ---------- Cartes de match ---------- */
  function carteMatch(m) {
    const suffixe = { B: " 2", C: " 3" };
    const nous = "AS Val de Sioule" + (suffixe[m.equipe] || "");
    const dom = !!m.domicile;
    const gauche = dom ? nous : m.adversaire;
    const droite = dom ? m.adversaire : nous;
    const coupe = /coupe/i.test(m.competition || "");
    let centre = m.heure;
    if (m.score) centre = dom ? m.score : String(m.score).split("-").reverse().join("-");

    const lieu = dom
      ? "🏠 À domicile · " + (D.club.stade || "") + ", " + (D.club.ville || "")
      : "🚌 Déplacement";

    return '<article class="match' + (coupe ? " match--coupe" : "") + '">' +
      '<div class="match__date">' + echapper(dateCourte(m.date)) + ' — ' + echapper(m.heure) + '</div>' +
      '<div class="match__compet">' + (coupe ? "🏆 " : "") + '<b>' + echapper(m.competition) + '</b> · ' + echapper(m.journee) + '</div>' +
      '<div class="match__duel">' +
        '<div class="match__equipe match__equipe--dom' + (dom ? " est-asvs" : "") + '">' + echapper(gauche) + '</div>' +
        '<div class="match__heure">' + echapper(centre) + '</div>' +
        '<div class="match__equipe match__equipe--ext' + (dom ? "" : " est-asvs") + '">' + echapper(droite) + '</div>' +
      '</div>' +
      '<div class="match__lieu ' + (dom ? "match__lieu--dom" : "match__lieu--ext") + '">' + echapper(lieu) + '</div>' +
    '</article>';
  }

  function prochainsMatchs() {
    const hote = $("#prochains-matchs");
    if (!hote) return;
    const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
    const nb = parseInt(hote.dataset.nombre || "3", 10);

    const suivants = D.matchs
      .filter(m => versDate(m.date) >= aujourdhui)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.heure).localeCompare(String(b.heure)))
      .slice(0, nb);

    hote.innerHTML = suivants.length
      ? suivants.map(carteMatch).join("")
      : '<p class="vide">La phase aller est terminée. Le calendrier de la phase retour sera publié dès sa parution.</p>';
  }

  function calendrierComplet() {
    const hote = $("#calendrier-complet");
    if (!hote) return;
    const boutons = $$(".filtre[data-filtre]");
    let filtre = "tous";

    function dessiner() {
      let liste = D.matchs.slice()
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.heure).localeCompare(String(b.heure)));
      if (filtre === "A" || filtre === "B" || filtre === "C") liste = liste.filter(m => m.equipe === filtre);
      if (filtre === "domicile")  liste = liste.filter(m => m.domicile);
      if (filtre === "exterieur") liste = liste.filter(m => !m.domicile);
      if (filtre === "avenir") {
        const auj = new Date(); auj.setHours(0, 0, 0, 0);
        liste = liste.filter(m => versDate(m.date) >= auj);
      }
      hote.innerHTML = liste.length
        ? liste.map(carteMatch).join("")
        : '<p class="vide">Aucune rencontre ne correspond à ce filtre.</p>';
    }

    boutons.forEach(b => b.addEventListener("click", function () {
      filtre = b.dataset.filtre;
      boutons.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      dessiner();
    }));
    dessiner();
  }

  function statistiques() {
    $$("[data-stat='domicile']").forEach(el => { el.textContent = D.matchs.filter(m => m.domicile).length; });
    $$("[data-stat='matchs']").forEach(el => { el.textContent = D.matchs.length; });
    $$("[data-stat='partenaires']").forEach(el => { el.textContent = D.partenaires.length; });
    $$("[data-stat='conseil']").forEach(el => { el.textContent = D.conseil.length; });
    $$("[data-stat='documents']").forEach(el => { el.textContent = D.documents.length; });
  }

  /* ---------- Actualités ---------- */
  function actualites() {
    const hote = $("#liste-actus");
    if (!hote) return;
    const nb = parseInt(hote.dataset.nombre || "0", 10);
    const libelles = { sportif: "Sportif", club: "Vie du club", event: "Événement" };

    let liste = D.actus.slice();
    if (nb > 0) liste = liste.slice(0, nb);

    if (!liste.length) {
      hote.innerHTML = '<p class="vide">Aucune actualité pour le moment.</p>';
      return;
    }

    hote.innerHTML = liste.map(a => {
      const lien = a.lien
        ? '<p style="margin-top:1rem"><a href="' + echapper(chemin(a.lien)) + '"' +
          (/^https?:/.test(a.lien) ? ' target="_blank" rel="noopener"' : "") +
          '><strong>En savoir plus &rarr;</strong></a></p>'
        : "";

      const photos = normaliserPhotos(a);
      let media = "";
      if (photos.length) media = blocCarrousel(photos, "4-3");
      else if (a.video) media = blocVideo(a.video, "actu__video");

      return '<article class="actu reveal-zoom">' + media +
        '<div class="actu__corps">' +
          '<span class="etiquette etiq--' + echapper(a.categorie || "club") + '">' + (libelles[a.categorie] || "Actualité") + '</span>' +
          '<div class="actu__date">' + echapper(dateLongue(a.date)) + '</div>' +
          '<h3>' + echapper(a.titre) + '</h3>' +
          '<div class="actu__texte">' + texteRiche(a.texte) + '</div>' +
          (a.document ? '<div style="margin-top:1rem">' + lienDocument(a.document, a.documentTitre) + '</div>' : "") +
          lien +
        '</div>' +
      '</article>';
    }).join("");
  }

  /* ---------- Équipes ---------- */
  function equipes() {
    const hote = $("#liste-equipes");
    if (!hote) return;
    hote.innerHTML = D.equipes.map(e => {
      const photos = normaliserPhotos(e);
      let media = "";
      if (photos.length) media = blocCarrousel(photos, "21-9");
      else if (e.video) media = blocVideo(e.video, "equipe__video");
      return '<article class="equipe reveal" id="equipe-' + echapper(e.id) + '">' +
        '<header class="equipe__bandeau bandeau--' + echapper(e.couleur) + '">' +
          '<h3>' + echapper(e.nom) + '</h3>' +
          '<span class="equipe__niveau">' + echapper(e.niveau) + '</span>' +
        '</header>' + media +
        '<div class="equipe__corps">' +
          '<p>' + echapper(e.texte) + '</p>' +
          '<ul class="equipe__infos">' +
            '<li><b>Encadrement</b><span>' + echapper(e.coach) + '</span></li>' +
            '<li><b>Créneaux</b><span>' + echapper(e.creneaux) + '</span></li>' +
            '<li><b>À retenir</b><span>' + echapper(e.fait) + '</span></li>' +
          '</ul>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  /* ---------- Galerie (photos et vidéos) ---------- */
  function galerie() {
    const hote = $("#galerie-photos");
    if (!hote) return;
    const bloc = $("#bloc-galerie");
    if (bloc) bloc.hidden = D.galerie.length === 0;
    hote.innerHTML = D.galerie.map(p => {
      const f = chemin(p.fichier);
      const media = (p.type === "video" || estVideo(f))
        ? '<video controls preload="metadata" playsinline src="' + echapper(f) + '"></video>'
        : '<img src="' + echapper(f) + '" alt="' + echapper(p.legende || "Photo du club") + '" loading="lazy">';
      return '<figure>' + media +
        (p.legende ? '<figcaption>' + echapper(p.legende) + '</figcaption>' : "") + '</figure>';
    }).join("");
  }

  /* ---------- Événements ---------- */
  function evenements() {
    const hote = $("#liste-evenements");
    if (!hote) return;
    hote.classList.add("cascade");
    hote.innerHTML = D.evenements.map((e, i) => {
      const photos = normaliserPhotos(e);
      const media = photos.length
        ? '<div class="carte__media">' + blocCarrousel(photos, "16-9") + '</div>'
        : "";
      return '<article class="carte reveal-zoom">' + media +
        '<div class="carte__pastille pastille--' + ["rouge", "vert", "bleu"][i % 3] + '">' + echapper(e.emoji || "⚽") + '</div>' +
        '<span class="etiquette etiq--event">' + echapper(e.periode) + '</span>' +
        '<h3>' + echapper(e.nom) + '</h3>' +
        '<p>' + echapper(e.texte) + '</p>' +
        (e.document ? '<div style="margin-top:1rem">' + lienDocument(e.document, "Le document") + '</div>' : "") +
      '</article>';
    }).join("");
  }

  /* ---------- Partenaires ---------- */
  function cartePartenaire(p, avecCoordonnees) {
    let coord = "";
    if (avecCoordonnees) {
      const bouts = [];
      if (p.ville) bouts.push('<span class="partenaire__ville">📍 ' + echapper(p.ville) + '</span>');
      if (p.telephone) bouts.push('<a class="partenaire__tel" href="tel:' + echapper(String(p.telephone).replace(/\s/g, "")) + '">☎ ' + echapper(p.telephone) + '</a>');
      if (p.siteWeb) bouts.push('<a class="partenaire__web" href="' + echapper(p.siteWeb) + '" target="_blank" rel="noopener">🔗 Site internet</a>');
      if (bouts.length) coord = '<div class="partenaire__coord">' + bouts.join("") + '</div>';
    }

    const inner =
      (p.logo ? '<img class="partenaire__logo" src="' + echapper(chemin(p.logo)) + '" alt="' + echapper(p.nom) + '" loading="lazy">' : "") +
      '<b>' + echapper(p.nom) + '</b>' +
      '<span>' + echapper(p.soutien) + '</span>' + coord;

    const cls = 'partenaire partenaire--' + echapper(p.niveau || "bronze");
    // Avec des coordonnées cliquables à l'intérieur, la carte ne peut pas
    // être elle-même un lien : on imbriquerait des liens.
    return (p.siteWeb && !avecCoordonnees)
      ? '<a class="' + cls + '" href="' + echapper(p.siteWeb) + '" target="_blank" rel="noopener">' + inner + '</a>'
      : '<div class="' + cls + '">' + inner + '</div>';
  }

  function partenaires() {
    const hote = $("#liste-partenaires");
    if (hote) {
      const niveaux = [
        { cle: "or",     titre: "Partenaires Or",     abr: "OR" },
        { cle: "argent", titre: "Partenaires Argent", abr: "AG" },
        { cle: "bronze", titre: "Partenaires Bronze", abr: "BR" }
      ];
      hote.innerHTML = niveaux.map(n => {
        const liste = D.partenaires.filter(p => p.niveau === n.cle);
        if (!liste.length) return "";
        return '<div class="niveau-titre"><span class="medaille medaille--' + n.cle + '">' + n.abr + '</span>' +
               '<h3>' + n.titre + '</h3></div>' +
               '<div class="partenaires cascade">' + liste.map(p => cartePartenaire(p, true)).join("") + '</div>';
      }).join("");
    }

    const bandeau = $("#bandeau-partenaires");
    if (bandeau) bandeau.innerHTML = D.partenaires.map(p => cartePartenaire(p, false)).join("");
  }

  /* ---------- Les arbitres du club ---------- */
  function arbitres() {
    const hote = $("#liste-arbitres");
    if (!hote) return;
    const liste = D.arbitres || [];
    const bloc = $("#bloc-arbitres");
    if (bloc) bloc.hidden = liste.length === 0;
    hote.innerHTML = liste.map(a => '<span class="jeton">' + echapper(a.nom) + '</span>').join("");
  }

  /* ---------- Page Histoire ---------- */
  function histoire() {
    const hote = $("#chronologie");
    if (!hote || !D.histoire) return;
    const h = D.histoire;

    const intro = $("#histoire-intro");
    if (intro && h.intro) intro.textContent = h.intro;

    // Signification du blason
    const hBlason = $("#blason-elements");
    if (hBlason && h.blason) {
      if (h.blason.titre) { const t = $("#blason-titre"); if (t) t.textContent = h.blason.titre; }
      if (h.blason.chapeau) { const c = $("#blason-chapeau"); if (c) c.textContent = h.blason.chapeau; }
      if (h.blason.note) { const n = $("#blason-note"); if (n) n.textContent = h.blason.note; }
      const img = $("#blason-image");
      if (img && h.blason.image) img.src = chemin(h.blason.image);
      hBlason.classList.add("cascade");
      hBlason.innerHTML = (h.blason.elements || []).map(e =>
        '<div class="blason-item blason-item--' + echapper(e.couleur || "navy") + ' reveal-zoom">' +
          '<h3>' + echapper(e.titre) + '</h3>' +
          '<p>' + echapper(e.texte) + '</p>' +
        '</div>'
      ).join("");
    }

    // Chronologie
    hote.innerHTML = (h.chronologie || []).map((c, i) => {
      const photos = normaliserPhotos(c);
      const medias = photos.length
        ? '<div class="chrono__medias">' + blocCarrousel(photos, "16-9") + '</div>'
        : "";
      return '<li class="chrono__item ' + (i % 2 ? "reveal-droite" : "reveal-gauche") + '">' +
        '<span class="chrono__pastille" aria-hidden="true">⚽</span>' +
        '<span class="chrono__annee">' + echapper(c.annee) + '</span>' +
        '<h3>' + echapper(c.titre) + '</h3>' +
        '<p>' + echapper(c.texte) + '</p>' + medias +
      '</li>';
    }).join("");

    // Photos d'équipes historiques
    const hEquipes = $("#equipes-historiques");
    if (hEquipes) {
      const liste = h.equipesHistoriques || [];
      const bloc = $("#bloc-equipes-historiques");
      if (bloc) bloc.hidden = liste.length === 0;
      hEquipes.innerHTML = liste.map(e =>
        '<figure class="reveal-zoom">' +
          '<img src="' + echapper(chemin(e.fichier)) + '" alt="' + echapper(e.legende || "") + '" loading="lazy">' +
          '<figcaption><strong>' + echapper(e.saison || "") + '</strong>' +
          (e.legende ? '<br>' + echapper(e.legende) : "") + '</figcaption>' +
        '</figure>'
      ).join("");
    }
  }

  /* ---------- Compteurs animés ---------- */
  function compteurs() {
    const cibles = $$(".chiffre strong, .hero__meta strong").filter(el => /^\d+$/.test(el.textContent.trim()));
    if (!cibles.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function animer(el) {
      const fin = parseInt(el.textContent, 10);
      if (!isFinite(fin) || fin === 0) return;
      const duree = 900;
      const depart = performance.now();
      function pas(maintenant) {
        const t = Math.min(1, (maintenant - depart) / duree);
        // Décélération douce
        el.textContent = Math.round(fin * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(pas);
      }
      requestAnimationFrame(pas);
    }

    if (!("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(entrees => {
      entrees.forEach(e => {
        if (e.isIntersecting) { animer(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    cibles.forEach(el => obs.observe(el));
  }

  /* ---------- Décor de campagne ----------
     Un paysage fixe derrière le site : les deux clochers de
     Broût-Vernet et d'Étroussat, la Sioule entre les deux, les
     vaches, les arbres et les bottes de paille. Le tout dessiné
     en SVG, sans aucune image à charger. */
  function decorVillage() {
    if (document.querySelector(".decor")) return;

    const vache = (x, y, e) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        '<path class="decor__queue" d="M74 6 q9 10 5 24" stroke="#2c4433" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M6 34 h68 v20 h-9 v14 h-6 v-14 H21 v14 h-6 V54 H6 z" fill="#2c4433"/>' +
        '<path d="M6 34 q-8 -4 -6 -12 q7 -3 11 4 z" fill="#2c4433"/>' +
        '<ellipse cx="30" cy="42" rx="10" ry="6" fill="#f4f1e6" opacity=".55"/>' +
        '<ellipse cx="56" cy="47" rx="7" ry="4" fill="#f4f1e6" opacity=".45"/>' +
      '</g>';

    const arbre = (x, y, e) =>
      '<g class="decor__arbre" transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        '<rect x="-4" y="-26" width="8" height="28" fill="#3d5a41"/>' +
        '<circle cx="0" cy="-44" r="26" fill="#3d5a41"/>' +
        '<circle cx="-18" cy="-32" r="17" fill="#3d5a41"/>' +
        '<circle cx="19" cy="-33" r="18" fill="#3d5a41"/>' +
      '</g>';

    const clocher = (x, y, e, couleur) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        '<rect x="-17" y="-96" width="34" height="96" fill="#f2efe4"/>' +
        '<path d="M-25 -96 L0 -150 L25 -96 z" fill="' + couleur + '"/>' +
        '<rect x="-6" y="-84" width="12" height="17" rx="6" fill="#2c4433"/>' +
        '<rect x="-5" y="-40" width="10" height="40" rx="5" fill="#2c4433"/>' +
        '<circle cx="0" cy="-58" r="7" fill="#f2efe4" stroke="#2c4433" stroke-width="2"/>' +
        '<path d="M0 -158 v9 M-5 -153 h10" stroke="#2c4433" stroke-width="2.4"/>' +
        '<path d="M17 -60 h44 v60 h-44 z" fill="#e7e3d5"/>' +
        '<path d="M13 -60 L39 -80 L65 -60 z" fill="' + couleur + '" opacity=".85"/>' +
      '</g>';

    const nuage = (x, y, e) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')" fill="#ffffff" opacity=".5">' +
        '<ellipse cx="0" cy="0" rx="34" ry="17"/>' +
        '<ellipse cx="26" cy="6" rx="26" ry="13"/>' +
        '<ellipse cx="-25" cy="6" rx="22" ry="11"/>' +
      '</g>';

    const oiseau = (x, y, e) =>
      '<path transform="translate(' + x + ',' + y + ') scale(' + e + ')" ' +
      'd="M0 0 q7 -7 14 0 q7 -7 14 0" stroke="#2c4433" stroke-width="2" fill="none" stroke-linecap="round"/>';

    const svg =
      '<svg viewBox="0 0 1600 460" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
        '<g class="decor__nuages--lent">' + nuage(180, 70, 1) + nuage(1180, 52, .8) + '</g>' +
        '<g class="decor__nuages">' + nuage(700, 106, .62) + '</g>' +
        '<g class="decor__oiseaux">' + oiseau(0, 130, 1) + oiseau(38, 146, .8) + oiseau(20, 116, .6) + '</g>' +

        /* Collines lointaines */
        '<path d="M0 300 q210 -78 430 -22 q220 56 430 -18 q210 -74 420 -6 q170 52 320 12 V460 H0 z" fill="#6f8f6a" opacity=".38"/>' +
        '<path d="M0 336 q250 -60 500 -8 q240 50 480 -14 q220 -58 420 4 V460 H0 z" fill="#5c7d59" opacity=".5"/>' +

        /* Les deux clochers, de part et d'autre de la rivière */
        clocher(300, 340, 1, '#c9382f') +
        clocher(1180, 340, .92, '#2f8f4a') +

        /* Arbres */
        arbre(120, 344, 1) + arbre(520, 348, .8) + arbre(880, 344, .95) +
        arbre(1420, 348, .85) + arbre(1520, 342, .65) +

        /* La Sioule */
        '<path d="M0 392 q200 -22 400 2 q200 24 400 -2 q200 -26 400 0 q200 26 400 6 V420 q-200 20 -400 -6 q-200 -26 -400 0 q-200 26 -400 2 q-200 -24 -400 -2 z" fill="#5da9d6" opacity=".55"/>' +

        /* Pré */
        '<path d="M0 404 h1600 V460 H0 z" fill="#4e7a4a" opacity=".62"/>' +

        /* Clôture */
        '<g stroke="#6b5138" stroke-width="4" opacity=".55">' +
          '<path d="M60 452 v-30 M140 452 v-30 M220 452 v-30 M300 452 v-30"/>' +
          '<path d="M52 430 h256 M52 442 h256"/>' +
        '</g>' +

        /* Bottes de paille */
        '<g fill="#c9a86a" opacity=".75">' +
          '<circle cx="1010" cy="436" r="19"/><circle cx="1052" cy="440" r="14"/>' +
        '</g>' +

        /* Vaches */
        vache(600, 396, .78) + vache(760, 408, .62) + vache(1300, 400, .7) +

        /* Herbes au premier plan */
        '<g class="decor__herbe" stroke="#3f6b3d" stroke-width="3" opacity=".5" stroke-linecap="round">' +
          '<path d="M40 460 q6 -22 2 -34 M70 460 q-6 -20 -1 -30 M100 460 q7 -24 3 -32"/>' +
          '<path d="M900 460 q6 -22 2 -34 M930 460 q-6 -20 -1 -30"/>' +
          '<path d="M1480 460 q6 -24 2 -34 M1512 460 q-6 -20 -1 -30"/>' +
        '</g>' +
      '</svg>';

    const decor = document.createElement("div");
    decor.className = "decor";
    decor.setAttribute("aria-hidden", "true");
    decor.innerHTML = svg;
    document.body.appendChild(decor);
  }

  /* ---------- Le ballon qui traverse le site ----------
     Sa position horizontale suit le défilement ; sa hauteur
     décrit une série de rebonds, comme un ballon qui traverse
     le terrain d'un bout à l'autre de la page. */
  function ballonVivant() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth <= 700) return;

    const el = document.createElement("div");
    el.className = "ballon";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<svg viewBox="0 0 40 40">' +
        '<circle cx="20" cy="20" r="19" fill="#fdfdfa" stroke="#22374f" stroke-width="2"/>' +
        '<path d="M20 8 l8 6 -3 10 h-10 l-3 -10 z" fill="#22374f"/>' +
        '<path d="M20 1.5 l0 6.5 M28 14 l7.5 -3 M25 24 l6 6.5 M15 24 l-6 6.5 M12 14 l-7.5 -3" ' +
        'stroke="#22374f" stroke-width="2" fill="none"/>' +
      '</svg>';
    document.body.appendChild(el);

    const REBONDS = 13;   // nombre de rebonds sur toute la hauteur du site
    let tache = null;

    function placer() {
      tache = null;
      const hauteurDoc = document.documentElement.scrollHeight - window.innerHeight;
      const p = hauteurDoc > 0 ? Math.min(1, Math.max(0, window.scrollY / hauteurDoc)) : 0;

      const largeur = window.innerWidth;
      const x = largeur * 0.06 + p * (largeur * 0.86);

      // |sin| donne des rebonds successifs ; l'amplitude s'atténue
      // légèrement pour imiter un ballon qui perd de sa force.
      const phase = p * REBONDS * Math.PI;
      const amplitude = 130 * (1 - 0.35 * p);
      const sol = window.innerHeight - 96;
      const y = sol - Math.abs(Math.sin(phase)) * amplitude;

      el.style.transform =
        "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + (p * 1440).toFixed(1) + "deg)";
    }
    function planifier() { if (!tache) tache = window.requestAnimationFrame(placer); }

    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier);
    placer();
  }

  /* ---------- Affiches officielles ----------
     Les plannings publiés par le club. Chaque affiche est
     consultable en grand et téléchargeable par les visiteurs. */
  function affiches() {
    const hote = $("#liste-affiches");
    if (!hote) return;
    const bloc = $("#bloc-affiches");
    if (bloc) bloc.hidden = D.affiches.length === 0;
    if (!D.affiches.length) { hote.innerHTML = ""; return; }

    hote.innerHTML = D.affiches.map(a => {
      const src = chemin(a.fichier);
      const nom = (a.titre || "affiche").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
      const ext = (src.split(".").pop() || "jpg").split("?")[0];
      return '<figure class="affiche">' +
        '<a class="affiche__vue" href="' + echapper(src) + '" target="_blank" rel="noopener" ' +
        'title="Ouvrir l\'affiche en grand">' +
          '<img src="' + echapper(src) + '" alt="' + echapper(a.titre) + '" loading="lazy">' +
        '</a>' +
        '<figcaption class="affiche__pied">' +
          '<div class="affiche__txt">' +
            '<b>' + echapper(a.titre) + '</b>' +
            (a.sousTitre ? '<span>' + echapper(a.sousTitre) + '</span>' : "") +
          '</div>' +
          '<a class="btn btn--bleu affiche__btn" href="' + echapper(src) + '" ' +
          'download="asvs-' + nom + '.' + echapper(ext) + '">' +
            '<span aria-hidden="true">⬇</span> Télécharger' +
          '</a>' +
        '</figcaption>' +
      '</figure>';
    }).join("");
  }

  /* ---------- Documents ---------- */
  function documents() {
    const hote = $("#liste-documents");
    if (!hote) return;
    const filtre = hote.dataset.categorie || "";
    const liste = filtre ? D.documents.filter(d => d.categorie === filtre) : D.documents;
    const bloc = $("#bloc-documents");
    if (bloc) bloc.hidden = liste.length === 0;
    hote.innerHTML = liste.map(d =>
      '<a class="document" href="' + echapper(chemin(d.fichier)) + '" target="_blank" rel="noopener">' +
        '<span class="document__icone" aria-hidden="true">📄</span>' +
        '<span class="document__txt">' +
          '<b>' + echapper(d.titre) + '</b>' +
          (d.description ? '<span>' + echapper(d.description) + '</span>' : "") +
        '</span>' +
        '<span class="document__fleche" aria-hidden="true">↓</span>' +
      '</a>'
    ).join("");
  }

  /* ---------- Organisation ---------- */
  function organisation() {
    function bloc(id, garni) {
      const el = $(id);
      if (el) el.hidden = !garni;
    }
    function personne(p) {
      return '<div class="personne">' +
        '<div class="personne__init" aria-hidden="true">' + echapper(initiales(p.nom)) + '</div>' +
        '<div><div class="personne__nom">' + echapper(p.nom) + '</div>' +
        '<div class="personne__role">' + echapper(p.role) + '</div></div>' +
      '</div>';
    }

    const hBureau = $("#liste-bureau");
    if (hBureau) {
      hBureau.innerHTML = D.bureau.map(personne).join("");
      bloc("#bloc-bureau", D.bureau.length > 0);
    }

    const hCA = $("#liste-conseil");
    if (hCA) {
      hCA.innerHTML = D.conseil.map(personne).join("");
      bloc("#bloc-conseil", D.conseil.length > 0);
    }

    const hCom = $("#liste-commissions");
    if (hCom) {
      hCom.innerHTML = D.commissions.length
        ? '<div class="table-enveloppe"><table>' +
          '<thead><tr><th>Commission</th><th>Référent(s)</th><th>Mission</th></tr></thead><tbody>' +
          D.commissions.map(c =>
            '<tr><td><strong>' + echapper(c.nom) + '</strong></td>' +
            '<td>' + echapper(c.responsable) + '</td>' +
            '<td>' + echapper(c.mission) + '</td></tr>').join("") +
          '</tbody></table></div>'
        : "";
      bloc("#bloc-commissions", D.commissions.length > 0);
    }
  }

  /* ---------- Champs alimentés par les infos du club ---------- */
  function infosClub() {
    /* Un bloc marqué data-club-si="champ" disparaît quand le champ
       n'est pas renseigné (ex. le numéro RNA tant qu'on ne l'a pas). */
    $$("[data-club-si]").forEach(el => {
      const v = D.club[el.dataset.clubSi];
      el.hidden = (v === undefined || v === null || String(v).trim() === "");
    });

    $$("[data-club]").forEach(el => {
      const v = D.club[el.dataset.club];
      if (v === undefined || v === null || v === "") return;
      if (el.tagName === "A") {
        el.href = /^email/.test(el.dataset.club) ? "mailto:" + v : v;
        // On ne remplit le texte que si le lien est vraiment vide :
        // un lien qui contient une icône SVG doit garder son icône.
        if (!el.textContent.trim() && !el.firstElementChild) el.textContent = v;
      } else {
        el.textContent = Array.isArray(v) ? v.join(" · ") : v;
      }
    });
  }

  /* ---------- Démarrage ---------- */
  async function demarrer() {
    navMobile();
    anneeAuto();
    retourHaut();
    decorVillage();
    surveillerImages();

    await chargerDonnees();

    infosClub();
    prochainsMatchs();
    calendrierComplet();
    statistiques();
    actualites();
    equipes();
    galerie();
    evenements();
    partenaires();
    documents();
    affiches();
    organisation();
    arbitres();
    histoire();

    // Après le rendu : on anime ce qui vient d'être créé
    activerCarrousels();
    compteurs();
    apparitions();
    ballonVivant();

    document.body.classList.add("donnees-chargees");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }
})();
