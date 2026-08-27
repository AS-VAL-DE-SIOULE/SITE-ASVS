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
    equipes: [], galerie: [], documents: [], histoire: null
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
    const [club, matchs, actus, evts, parts, orga, equipes, gal, docs, hist, auto] =
      await Promise.all(Object.values(FICHIERS).map(lire));

    if (club)    D.club        = club;
    if (matchs)  D.matchs      = matchs.liste || [];
    if (evts)    D.evenements  = evts.liste || [];
    if (parts)   D.partenaires = parts.liste || [];
    if (equipes) D.equipes     = equipes.liste || [];
    if (gal)     D.galerie     = gal.liste || [];
    if (docs)    D.documents   = docs.liste || [];
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
    const nous = "AS Val de Sioule" + (m.equipe === "B" ? " 2" : "");
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
      if (filtre === "A" || filtre === "B") liste = liste.filter(m => m.equipe === filtre);
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
    organisation();
    arbitres();
    histoire();

    // Après le rendu : on anime ce qui vient d'être créé
    activerCarrousels();
    compteurs();
    apparitions();

    document.body.classList.add("donnees-chargees");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }
})();
