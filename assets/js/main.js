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
     Un paysage fixe derrière le site : les deux églises de
     Broût-Vernet et d'Étroussat, la Sioule, les vaches, les cages
     de foot et les arbres. Entièrement dessiné en SVG : aucune
     image à charger, net sur tous les écrans. */
  function decorVillage() {
    if (document.querySelector(".decor")) return;

    /* --- Une église : nef, clocher, flèche, contreforts --- */
    const eglise = (x, y, e, toit) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        /* Nef */
        '<path d="M18 0 v-54 h96 v54 z" fill="#efe9db"/>' +
        '<path d="M14 -54 L66 -78 L118 -54 z" fill="' + toit + '"/>' +
        /* Contreforts */
        '<path d="M34 0 v-40 l7 -5 v45 z M92 0 v-40 l7 5 v35 z" fill="#ddd5c3"/>' +
        /* Fenêtres en plein cintre */
        '<path d="M50 -14 v-18 a7 7 0 0 1 14 0 v18 z" fill="#3a5a44"/>' +
        '<path d="M78 -14 v-18 a7 7 0 0 1 14 0 v18 z" fill="#3a5a44"/>' +
        /* Clocher */
        '<path d="M-16 0 v-104 h34 v104 z" fill="#f4efe3"/>' +
        '<path d="M-16 -104 h34 l-3 -7 h-28 z" fill="#cfc7b4"/>' +
        /* Flèche */
        '<path d="M-19 -111 L1 -168 L21 -111 z" fill="' + toit + '"/>' +
        '<path d="M1 -178 v11 M-5 -173 h12" stroke="#2c4433" stroke-width="2.6" stroke-linecap="round"/>' +
        /* Abat-son et horloge */
        '<path d="M-8 -84 v-14 a8 8 0 0 1 16 0 v14 z" fill="#3a5a44"/>' +
        '<circle cx="1" cy="-62" r="8.5" fill="#f4efe3" stroke="#2c4433" stroke-width="2"/>' +
        '<path d="M1 -62 v-5 M1 -62 h4" stroke="#2c4433" stroke-width="1.6" stroke-linecap="round"/>' +
        /* Porte */
        '<path d="M-7 0 v-24 a7 7 0 0 1 14 0 v24 z" fill="#6b5138"/>' +
      '</g>';

    /* --- Une vache pie : corps, tête baissée, pattes, taches --- */
    const vache = (x, y, e, sens) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + (e * sens) + ',' + e + ')">' +
        /* Pattes */
        '<path d="M-26 0 v22 h6 v-22 z M-10 0 v24 h6 v-24 z M14 0 v23 h6 v-23 z M28 0 v22 h6 v-22 z" fill="#3a4a3c"/>' +
        '<path d="M-26 20 h6 v4 h-6 z M-10 22 h6 v4 h-6 z M14 21 h6 v4 h-6 z M28 20 h6 v4 h-6 z" fill="#22302a"/>' +
        /* Corps */
        '<path d="M-32 0 q-6 -22 8 -30 q20 -9 46 -6 q16 2 18 16 q2 14 -4 20 z" fill="#f6f3ea"/>' +
        /* Taches */
        '<path d="M-16 -22 q10 -7 18 -1 q4 8 -6 11 q-12 2 -12 -10 z" fill="#33443a"/>' +
        '<path d="M18 -26 q12 -2 14 8 q-1 8 -10 6 q-8 -3 -4 -14 z" fill="#33443a"/>' +
        /* Encolure et tête baissée */
        '<path d="M-32 -6 q-14 4 -20 16 q-2 8 6 9 q10 0 14 -9 z" fill="#f6f3ea"/>' +
        '<path d="M-52 12 q-9 2 -9 8 q1 5 8 4 q7 -1 8 -7 z" fill="#e2d9c8"/>' +
        '<circle cx="-46" cy="10" r="1.8" fill="#22302a"/>' +
        /* Oreille et corne */
        '<path d="M-42 4 q-8 -5 -12 -1 q3 6 11 5 z" fill="#33443a"/>' +
        '<path d="M-40 0 q-4 -8 1 -10 q3 4 2 10 z" fill="#d9cfb8"/>' +
        /* Queue */
        '<path class="decor__queue" d="M32 -18 q11 8 8 26" stroke="#33443a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M39 6 q5 5 3 11 q-5 1 -6 -5 z" fill="#33443a"/>' +
      '</g>';

    /* --- Une cage de foot, avec filet --- */
    const cage = (x, y, e) => {
      let filet = "";
      for (let i = 1; i < 9; i++) filet += '<path d="M' + (i * 12) + ' 0 v-52"/>';
      for (let j = 1; j < 5; j++) filet += '<path d="M0 ' + (-j * 11) + ' h108"/>';
      return '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        '<g stroke="#f2efe4" stroke-width="1" opacity=".55" fill="none">' + filet + '</g>' +
        '<path d="M0 0 v-56 h108 v56" fill="none" stroke="#f7f5ec" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M0 -56 l-16 -10 M108 -56 l16 -10 M-16 -66 v56 M124 -66 v56" ' +
        'stroke="#f7f5ec" stroke-width="3" opacity=".7" fill="none"/>' +
      '</g>';
    };

    /* --- Arbres : un peuplier, un chêne, un buisson --- */
    const peuplier = (x, y, e) =>
      '<g class="decor__arbre" transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        '<rect x="-3" y="-30" width="6" height="32" fill="#4a3a28"/>' +
        '<path d="M0 -104 q20 34 13 62 q-13 12 -26 0 q-7 -28 13 -62 z" fill="#3d6b42"/>' +
      '</g>';

    const chene = (x, y, e) =>
      '<g class="decor__arbre" transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        '<path d="M-5 2 v-30 q-8 -8 -2 -12 l14 0 q6 4 -2 12 v30 z" fill="#4a3a28"/>' +
        '<ellipse cx="0" cy="-58" rx="30" ry="24" fill="#3d6b42"/>' +
        '<ellipse cx="-22" cy="-44" rx="19" ry="15" fill="#3d6b42"/>' +
        '<ellipse cx="23" cy="-45" rx="20" ry="16" fill="#3d6b42"/>' +
        '<ellipse cx="0" cy="-72" rx="19" ry="14" fill="#457a4b"/>' +
      '</g>';

    const buisson = (x, y, e) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')" fill="#40704a">' +
        '<ellipse cx="0" cy="0" rx="18" ry="12"/><ellipse cx="14" cy="3" rx="12" ry="9"/>' +
        '<ellipse cx="-13" cy="3" rx="11" ry="8"/>' +
      '</g>';

    const maison = (x, y, e, toit) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
        '<path d="M0 0 v-38 h58 v38 z" fill="#efe9db"/>' +
        '<path d="M-6 -38 L29 -60 L64 -38 z" fill="' + toit + '"/>' +
        '<rect x="12" y="-26" width="12" height="12" fill="#3a5a44"/>' +
        '<rect x="36" y="-26" width="12" height="12" fill="#3a5a44"/>' +
        '<rect x="24" y="-14" width="12" height="14" fill="#6b5138"/>' +
        '<rect x="44" y="-70" width="8" height="14" fill="#c9c0ad"/>' +
      '</g>';

    const nuage = (x, y, e) =>
      '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')" fill="#ffffff" opacity=".62">' +
        '<ellipse cx="0" cy="0" rx="36" ry="18"/><ellipse cx="28" cy="7" rx="27" ry="14"/>' +
        '<ellipse cx="-27" cy="7" rx="23" ry="12"/>' +
      '</g>';

    const oiseau = (x, y, e) =>
      '<path transform="translate(' + x + ',' + y + ') scale(' + e + ')" ' +
      'd="M0 0 q7 -7 14 0 q7 -7 14 0" stroke="#2c4433" stroke-width="2" fill="none" stroke-linecap="round"/>';

    const svg =
      '<svg viewBox="0 0 1600 500" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
        '<g class="decor__nuages--lent">' + nuage(200, 66, 1) + nuage(1200, 48, .8) + '</g>' +
        '<g class="decor__nuages">' + nuage(720, 104, .6) + '</g>' +
        '<g class="decor__oiseaux">' + oiseau(0, 128, 1) + oiseau(40, 146, .8) + oiseau(22, 112, .6) + '</g>' +

        /* Collines */
        '<path d="M0 322 q210 -80 430 -24 q220 58 430 -18 q210 -76 420 -6 q170 54 320 12 V500 H0 z" fill="#7fa077" opacity=".45"/>' +
        '<path d="M0 358 q250 -62 500 -8 q240 52 480 -14 q220 -60 420 4 V500 H0 z" fill="#63875c" opacity=".6"/>' +

        /* Le village : les deux églises et quelques maisons */
        maison(150, 372, .9, '#b8433a') +
        eglise(300, 372, 1, '#c9382f') +
        maison(470, 374, .78, '#b8433a') +
        maison(1050, 374, .8, '#2f8f4a') +
        eglise(1210, 372, .94, '#2f8f4a') +
        maison(1400, 372, .86, '#2f8f4a') +

        /* Arbres */
        peuplier(90, 376, 1) + peuplier(112, 378, .8) +
        chene(640, 378, .9) + chene(1550, 378, .8) + peuplier(1520, 376, .85) +

        /* La Sioule */
        '<path d="M0 404 q200 -22 400 2 q200 24 400 -2 q200 -26 400 0 q200 26 400 6 V434 ' +
        'q-200 20 -400 -6 q-200 -26 -400 0 q-200 26 -400 2 q-200 -24 -400 -2 z" fill="#5da9d6" opacity=".62"/>' +
        '<path d="M0 410 q200 -20 400 2 q200 22 400 -2" stroke="#ffffff" stroke-width="2" fill="none" opacity=".35"/>' +

        /* Le pré */
        '<path d="M0 420 h1600 V500 H0 z" fill="#568b52" opacity=".68"/>' +

        /* Le terrain : deux cages qui se font face */
        cage(60, 486, .9) + cage(1400, 486, .9) +
        '<path d="M250 492 h1100" stroke="#f2efe4" stroke-width="2" opacity=".35" fill="none"/>' +
        '<circle cx="800" cy="492" r="42" stroke="#f2efe4" stroke-width="2" opacity=".3" fill="none"/>' +

        /* Vaches au pré */
        vache(560, 452, .62, 1) + vache(700, 468, .5, -1) + vache(1180, 458, .56, 1) +

        /* Buissons, bottes de paille, clôture */
        buisson(400, 460, .9) + buisson(940, 466, .8) +
        '<g fill="#c9a86a" opacity=".8">' +
          '<circle cx="1020" cy="464" r="17"/><circle cx="1056" cy="468" r="12"/>' +
          '<circle cx="1020" cy="464" r="10" fill="none" stroke="#b0904f" stroke-width="2"/>' +
        '</g>' +
        '<g stroke="#6b5138" stroke-width="4" opacity=".5" fill="none">' +
          '<path d="M180 492 v-30 M262 492 v-30 M344 492 v-30"/>' +
          '<path d="M172 470 h180 M172 482 h180"/>' +
        '</g>' +

        /* Herbes au premier plan */
        '<g class="decor__herbe" stroke="#3f6b3d" stroke-width="3" opacity=".55" stroke-linecap="round" fill="none">' +
          '<path d="M40 500 q6 -24 2 -36 M70 500 q-6 -22 -1 -32 M100 500 q7 -26 3 -34"/>' +
          '<path d="M860 500 q6 -24 2 -36 M890 500 q-6 -22 -1 -32"/>' +
          '<path d="M1490 500 q6 -26 2 -36 M1522 500 q-6 -22 -1 -32"/>' +
        '</g>' +
      '</svg>';

    const decor = document.createElement("div");
    decor.className = "decor";
    decor.setAttribute("aria-hidden", "true");
    decor.innerHTML = svg;
    document.body.appendChild(decor);
  }

  /* ---------- Les deux joueurs ----------
     En haut de page, un joueur frappe : c'est lui qui lance le
     ballon. En bas, un coéquipier le réceptionne. Ils
     n'apparaissent qu'aux deux extrémités du site. */
  function joueurs() {
    if (document.querySelector(".joueur")) return;

    const maillot = "#e1332b", short = "#22374f", peau = "#e0b48c";

    const frappeur =
      '<svg viewBox="0 0 120 170" aria-hidden="true">' +
        '<circle cx="52" cy="26" r="15" fill="' + peau + '"/>' +
        '<path d="M38 22 q14 -16 28 -2 q-14 -6 -28 2 z" fill="#3a2a1c"/>' +
        /* Torse penché vers l'avant */
        '<path d="M40 42 q14 -6 26 0 l7 44 q-20 7 -40 0 z" fill="' + maillot + '"/>' +
        '<path d="M47 42 h12 v10 h-12 z" fill="#f7f5ec" opacity=".85"/>' +
        /* Bras : un tendu en arrière pour l'équilibre, un devant */
        '<path d="M40 48 q-22 8 -30 26" stroke="' + peau + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="M66 48 q20 4 26 -8" stroke="' + peau + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        /* Short */
        '<path d="M33 84 q20 7 40 0 l4 24 q-24 7 -48 0 z" fill="' + short + '"/>' +
        /* Jambe d'appui */
        '<path d="M42 106 q-4 26 -2 46" stroke="' + peau + '" stroke-width="11" fill="none" stroke-linecap="round"/>' +
        '<path d="M34 150 h22 v9 h-24 z" fill="#22374f"/>' +
        /* Jambe de frappe, lancée vers l'avant */
        '<g class="joueur__frappe">' +
          '<path d="M64 106 q22 10 36 2" stroke="' + peau + '" stroke-width="11" fill="none" stroke-linecap="round"/>' +
          '<path d="M96 102 h20 v9 h-20 z" fill="#22374f" transform="rotate(-16 96 106)"/>' +
        '</g>' +
      '</svg>';

    const receveur =
      '<svg viewBox="0 0 120 170" aria-hidden="true">' +
        '<circle cx="68" cy="26" r="15" fill="' + peau + '"/>' +
        '<path d="M54 22 q14 -16 28 -2 q-14 -6 -28 2 z" fill="#3a2a1c"/>' +
        '<path d="M54 42 q14 -6 26 0 l5 44 q-20 7 -38 0 z" fill="#2f6fb7"/>' +
        '<path d="M61 42 h12 v10 h-12 z" fill="#f7f5ec" opacity=".85"/>' +
        /* Bras ouverts pour amortir */
        '<path d="M54 48 q-24 2 -30 -10" stroke="' + peau + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="M80 48 q22 6 28 22" stroke="' + peau + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="M47 84 q20 7 40 0 l3 24 q-24 7 -46 0 z" fill="' + short + '"/>' +
        '<path d="M56 106 q-4 26 -2 46" stroke="' + peau + '" stroke-width="11" fill="none" stroke-linecap="round"/>' +
        '<path d="M46 150 h22 v9 h-24 z" fill="#22374f"/>' +
        /* Jambe avancée qui contrôle le ballon */
        '<g class="joueur__controle">' +
          '<path d="M76 106 q-16 20 -30 30" stroke="' + peau + '" stroke-width="11" fill="none" stroke-linecap="round"/>' +
          '<path d="M28 132 h22 v9 h-22 z" fill="#22374f" transform="rotate(14 40 136)"/>' +
        '</g>' +
      '</svg>';

    const a = document.createElement("div");
    a.className = "joueur joueur--frappe";
    a.setAttribute("aria-hidden", "true");
    a.innerHTML = frappeur;

    const b = document.createElement("div");
    b.className = "joueur joueur--receveur";
    b.setAttribute("aria-hidden", "true");
    b.innerHTML = receveur;

    document.body.appendChild(a);
    document.body.appendChild(b);
    return { a, b };
  }

  /* ---------- Le ballon qui traverse le site ----------
     Frappé en haut de page, il rebondit d'un bout à l'autre au fil
     du défilement, et retombe dans les pieds du receveur en bas. */
  function ballonVivant() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const jo = joueurs();

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

    let tache = null;

    function placer() {
      tache = null;
      const petit = window.innerWidth < 700;
      const rebonds = petit ? 9 : 13;
      const hauteurDoc = document.documentElement.scrollHeight - window.innerHeight;
      const p = hauteurDoc > 0 ? Math.min(1, Math.max(0, window.scrollY / hauteurDoc)) : 0;

      const marge = petit ? 0.13 : 0.09;
      const x = window.innerWidth * marge + p * (window.innerWidth * (1 - 2 * marge));
      const amplitude = (petit ? 78 : 130) * (1 - 0.35 * p);
      const sol = window.innerHeight - (petit ? 62 : 84);
      const y = sol - Math.abs(Math.sin(p * rebonds * Math.PI)) * amplitude;

      el.style.transform =
        "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + (p * 1440).toFixed(1) + "deg)";

      if (jo) {
        // Le frappeur s'efface dès qu'on quitte le haut de la page,
        // le receveur n'apparaît qu'à l'approche du pied de page.
        const borne = v => Math.min(1, Math.max(0, v));
        jo.a.style.opacity = String(borne(1 - p / 0.12));
        jo.b.style.opacity = String(borne((p - 0.86) / 0.1));
      }
    }
    function planifier() { if (!tache) tache = window.requestAnimationFrame(placer); }

    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier);
    placer();
  }

  /* ---------- Menu et pied de page ----------
     Communs à toutes les pages, pilotés par content/navigation.json.
     Le HTML garde une version de secours si le fichier est absent. */
  async function navigation() {
    const n = await lire("content/navigation.json");
    if (!n) return;

    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    if (Array.isArray(n.menu)) {
      const ul = $(".nav-principale ul");
      if (ul) {
        ul.innerHTML = n.menu.map(m => {
          const courant = String(m.lien).toLowerCase() === page ||
            (page === "" && m.lien === "index.html");
          return '<li' + (m.miseEnAvant ? ' class="nav-cta"' : "") + '>' +
            '<a href="' + echapper(m.lien) + '"' + (courant ? ' aria-current="page"' : "") + '>' +
            echapper(m.libelle) + '</a></li>';
        }).join("");
      }
    }

    if (n.marque && n.marque.sousTitre) {
      $$(".marque__sous").forEach(e => { e.textContent = n.marque.sousTitre; });
    }

    /* Fil d'Ariane : le premier maillon reprend le libellé du menu Accueil */
    if (Array.isArray(n.menu) && n.menu.length) {
      const accueil = n.menu.find(m => String(m.lien).toLowerCase() === "index.html");
      if (accueil) $$(".fil a[href='index.html']").forEach(a => { a.textContent = accueil.libelle; });
    }

    const p = n.pied || {};
    const maj = (sel, v) => { const e = $(sel); if (e && v) e.textContent = v; };
    maj("[data-pied='presentation']", p.presentation);
    maj("[data-pied='mentionAffiliation']", p.mentionAffiliation);
    maj("[data-pied='boutonFacebook']", p.boutonFacebook);
    maj("[data-pied='boutonBoutique']", p.boutonBoutique);
    maj("[data-pied='titreContact']", p.titreContact);
    maj("[data-pied='copyright']", p.copyright);
    maj("[data-pied='lienMentions']", p.lienMentions);
    maj("[data-pied='prefixeSaison']", p.prefixeSaison);

    const cols = $("[data-pied='colonnes']");
    if (cols && Array.isArray(p.colonnes)) {
      cols.innerHTML = p.colonnes.map(c =>
        '<div><h4>' + echapper(c.titre) + '</h4><ul>' +
        (c.liens || []).map(l => '<li><a href="' + echapper(l.lien) + '">' +
          echapper(l.libelle) + '</a></li>').join("") +
        '</ul></div>'
      ).join("");
    }
  }

  /* ---------- Textes de la page ----------
     Chaque page déclare son fichier de textes dans une balise
     <meta name="asvs-page">. Tout ce qui porte data-txt, data-riche
     ou data-liste y est alimenté : titres, paragraphes, cartes,
     listes à puces, tableaux, questions fréquentes. Rien n'est figé
     dans le HTML. */
  let PAGE = {};

  async function chargerTextesPage() {
    const meta = document.querySelector('meta[name="asvs-page"]');
    if (!meta) return;
    const j = await lire("content/page-" + meta.content + ".json");
    if (j) PAGE = j;
  }

  function valeurPage(chemin) {
    return String(chemin).split(".").reduce(
      (o, c) => (o && o[c] !== undefined) ? o[c] : undefined, PAGE);
  }

  /* Gabarits d'affichage pour les blocs répétables */
  const GABARITS = {
    carte: (e, i) =>
      '<article class="carte reveal">' +
        (e.pictogramme ? '<div class="carte__pastille pastille--' +
          ["rouge", "vert", "bleu"][i % 3] + '">' + echapper(e.pictogramme) + '</div>' : "") +
        (e.titre ? '<h3>' + echapper(e.titre) + '</h3>' : "") +
        (e.texte ? '<p>' + echapper(e.texte) + '</p>' : "") +
      '</article>',

    carteLien: (e, i) =>
      '<a class="carte carte--lien reveal" href="' + echapper(e.lien || "#") + '">' +
        (e.pictogramme ? '<div class="carte__pastille pastille--' +
          ["rouge", "bleu", "vert"][i % 3] + '">' + echapper(e.pictogramme) + '</div>' : "") +
        '<h3>' + echapper(e.titre) + '</h3>' +
        '<p>' + echapper(e.texte) + '</p>' +
      '</a>',

    repere: e =>
      '<div><strong>' + echapper(e.valeur) + '</strong><span>' + echapper(e.libelle) + '</span></div>',

    chiffre: e =>
      '<div class="chiffre reveal"><strong>' + echapper(e.valeur) + '</strong>' +
      '<span>' + echapper(e.libelle) + '</span></div>',

    etape: e =>
      '<li class="reveal"><span class="frise__an">' + echapper(e.annee) + '</span>' +
      '<p>' + echapper(e.texte) + '</p></li>',

    bloc: e =>
      '<h2 class="souligne">' + echapper(e.titre) + '</h2>' + texteRiche(e.texte),

    puce: e => '<li>' + echapper(e.texte || e) + '</li>',

    tarif: e =>
      '<tr><td>' + (e.libelle ? '<strong>' + echapper(e.libelle) + '</strong>' : "") +
      (e.precision ? ' ' + echapper(e.precision) : "") + '</td>' +
      '<td style="text-align:right;font-weight:700">' + echapper(e.montant) + '</td></tr>',

    encadrement: e =>
      '<tr><td><strong>' + echapper(e.equipe) + '</strong></td>' +
      '<td>' + echapper(e.championnat) + '</td>' +
      '<td>' + echapper(e.encadrement) + '</td></tr>',

    pack: e =>
      '<div class="pack reveal">' +
        '<h4>' + echapper(e.titre) + '</h4>' +
        (e.sousTitre ? '<p class="pack__sous">' + echapper(e.sousTitre) + '</p>' : "") +
        '<ul>' + (e.points || []).map(p => '<li>' + echapper(p.texte || p) + '</li>').join("") + '</ul>' +
      '</div>',

    faq: e =>
      '<div class="carte">' +
        '<h3>' + echapper(e.question) + '</h3>' +
        '<div>' + texteRiche(e.reponse) + '</div>' +
      '</div>'
  };

  function textesPage() {
    $$("[data-txt]").forEach(el => {
      const v = valeurPage(el.dataset.txt);
      if (v !== undefined && v !== null && String(v) !== "") el.textContent = v;
    });

    $$("[data-riche]").forEach(el => {
      const v = valeurPage(el.dataset.riche);
      if (v !== undefined && v !== null && String(v) !== "") el.innerHTML = texteRiche(v);
    });

    /* Images et textes alternatifs pilotés depuis le back-office */
    $$("[data-src-txt]").forEach(el => {
      const v = valeurPage(el.dataset.srcTxt);
      if (v) el.setAttribute("src", chemin(v));
    });
    $$("[data-alt-txt]").forEach(el => {
      const v = valeurPage(el.dataset.altTxt);
      if (v) el.setAttribute("alt", v);
    });
    $$("[data-href-txt]").forEach(el => {
      const v = valeurPage(el.dataset.hrefTxt);
      if (v) el.setAttribute("href", v);
    });

    /* Image de fond d'un bandeau, pilotée depuis le back-office */
    $$("[data-fond-txt]").forEach(el => {
      const v = valeurPage(el.dataset.fondTxt);
      if (v) el.style.backgroundImage = "url('" + chemin(v) + "')";
    });

    /* Titre de l'onglet et description pour les moteurs de recherche */
    const seo = valeurPage("seo") || {};
    if (seo.titre) document.title = seo.titre;
    if (seo.description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
      }
      m.setAttribute("content", seo.description);
    }

    $$("[data-liste]").forEach(el => {
      const v = valeurPage(el.dataset.liste);
      if (!Array.isArray(v)) return;
      const gabarit = GABARITS[el.dataset.gabarit || "carte"];
      if (!gabarit) return;
      el.innerHTML = v.map(gabarit).join("");
      const bloc = el.closest("[data-bloc-si]");
      if (bloc) bloc.hidden = v.length === 0;
    });
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
      } else if (el.tagName === "IMG") {
        el.setAttribute("src", chemin(v));
      } else {
        el.textContent = Array.isArray(v) ? v.join(" · ") : v;
      }
    });

    /* Texte alternatif d'une image (blason du club, bannière…) */
    $$("[data-club-alt]").forEach(el => {
      const v = D.club[el.dataset.clubAlt];
      if (v) el.setAttribute("alt", v);
    });
  }

  /* ---------- Démarrage ---------- */
  async function demarrer() {
    navMobile();
    anneeAuto();
    retourHaut();
    decorVillage();
    surveillerImages();

    await Promise.all([chargerDonnees(), chargerTextesPage(), navigation()]);

    navMobile();
    textesPage();
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
