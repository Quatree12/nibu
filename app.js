/* ==========================================================================
   NIBU — YOUR LIFE, ONE LITTLE CREATURE.
   app.js — logique complete de la V1 webapp.
   Tout est local : aucune requete reseau, aucun compte, aucun traceur.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'nibu.v1';
  var state = null;

  /* ============================ Utilitaires ============================== */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid(p) { return (p || 'c') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function safeParse(t) { try { return JSON.parse(t); } catch (e) { return null; } }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function isoOrEmpty(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : ''; }
  function parseAmount(str) {
    if (str === null || str === undefined) return null;
    var s = String(str).trim().replace(/\s|CHF|chf|'|’/g, '').replace(',', '.');
    if (s === '') return null;
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var n = parseFloat(s);
    if (!isFinite(n) || n < 0 || n > 1000000) return null;
    return round2(n);
  }
  function chf(n) {
    var v = round2(Math.abs(Number(n) || 0));
    var p = v.toFixed(2).split('.');
    return (Number(n) < 0 ? '−' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'") + '.' + p[1] + ' CHF';
  }
  function dateLabel(iso, time) {
    if (!iso) return time ? 'a ' + time : 'sans date';
    var d = new Date(iso + 'T00:00:00');
    var txt = iso === todayISO() ? "aujourd'hui"
      : d.toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' });
    return time ? txt + ' · ' + time : txt;
  }
  function daysUntil(iso) {
    if (!iso) return null;
    var a = new Date(iso + 'T00:00:00').getTime();
    var b = new Date(todayISO() + 'T00:00:00').getTime();
    return Math.round((a - b) / 86400000);
  }
  function relDays(iso) {
    var d = daysUntil(iso);
    if (d === null) return '';
    if (d === 0) return "aujourd'hui";
    if (d === 1) return 'demain';
    if (d === -1) return 'hier';
    if (d < 0) return 'il y a ' + Math.abs(d) + ' jours';
    return 'dans ' + d + ' jours';
  }
  function weekStart() {
    var d = new Date(todayISO() + 'T00:00:00');
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function weekEnd() {
    var d = new Date(weekStart() + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ============================== Etat ================================== */
  function defaultState() {
    return {
      version: 1,
      settings: { name: 'pilote', weeklyBudget: 90, reduceMotion: false },
      capsules: [],
      expenses: [],
      xp: 0,
      counters: { created: 0, spentCount: 0, doneCount: 0 },
      mission: { date: todayISO(), id: null, done: false }
    };
  }
  function isCapsule(c) {
    return c && typeof c === 'object' && typeof c.id === 'string' && c.id &&
      ['echeance', 'rendezvous', 'commande', 'rappel'].indexOf(c.type) !== -1 &&
      typeof c.title === 'string' && c.title.trim() !== '';
  }
  function cleanCapsule(c) {
    return {
      id: String(c.id),
      type: c.type,
      title: String(c.title).slice(0, 70),
      date: isoOrEmpty(c.date),
      time: /^\d{2}:\d{2}$/.test(c.time || '') ? c.time : '',
      amount: (c.amount === null || c.amount === '' || c.amount === undefined || !isFinite(Number(c.amount))) ? null : round2(Number(c.amount)),
      detail: typeof c.detail === 'string' ? c.detail.slice(0, 280) : '',
      status: c.status === 'done' ? 'done' : 'active',
      echCat: typeof c.echCat === 'string' ? c.echCat : '',
      shop: typeof c.shop === 'string' ? c.shop.slice(0, 40) : '',
      tracking: typeof c.tracking === 'string' ? c.tracking.slice(0, 40) : '',
      cmdStatus: typeof c.cmdStatus === 'string' && c.cmdStatus ? c.cmdStatus : 'commandé',
      createdAt: c.createdAt || new Date().toISOString()
    };
  }
  function isExpense(e) {
    return e && typeof e === 'object' && typeof e.id === 'string' &&
      isFinite(Number(e.amount)) && Number(e.amount) >= 0;
  }
  function cleanExpense(e) {
    return {
      id: String(e.id),
      amount: round2(Number(e.amount)),
      category: (typeof e.category === 'string' && e.category) ? e.category.slice(0, 30) : 'Autre',
      label: typeof e.label === 'string' ? e.label.slice(0, 60) : '',
      date: isoOrEmpty(e.date) || todayISO(),
      createdAt: e.createdAt || new Date().toISOString()
    };
  }
  function counter(v) { var n = Number(v); return isFinite(n) && n >= 0 ? Math.floor(n) : 0; }

  function normalize(s) {
    var d = defaultState();
    if (!s || typeof s !== 'object') return d;
    var set = s.settings || {};
    d.settings.name = (typeof set.name === 'string' && set.name.trim()) ? set.name.trim().slice(0, 24) : 'pilote';
    var b = Number(set.weeklyBudget);
    d.settings.weeklyBudget = (isFinite(b) && b >= 0) ? round2(b) : 90;
    d.settings.reduceMotion = !!set.reduceMotion;
    d.capsules = Array.isArray(s.capsules) ? s.capsules.filter(isCapsule).map(cleanCapsule) : [];
    d.expenses = Array.isArray(s.expenses) ? s.expenses.filter(isExpense).map(cleanExpense) : [];
    d.xp = counter(s.xp);
    var c = s.counters || {};
    d.counters = { created: counter(c.created), spentCount: counter(c.spentCount), doneCount: counter(c.doneCount) };
    if (s.mission && typeof s.mission === 'object' && isoOrEmpty(s.mission.date)) {
      d.mission = { date: s.mission.date, id: s.mission.id || null, done: !!s.mission.done };
    }
    return d;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Stockage indisponible', "Le navigateur refuse d'enregistrer (mode prive ou quota atteint).", 'error'); }
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    state = normalize(safeParse(raw));
  }

  /* ============================== Modales =============================== */
  var pending = { confirm: null, prompt: null };
  function openModal(el) {
    el.hidden = false;
    var f = el.querySelector('input:not([type=hidden]), select, textarea, button');
    setTimeout(function () { if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function closeModal(el) {
    el.hidden = true;
    if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur();
  }
  function askConfirm(title, text, fn, okLabel) {
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;
    $('#confirmOk').textContent = okLabel || 'Confirmer';
    pending.confirm = fn;
    openModal($('#confirmModal'));
  }
  function askPrompt(title, label, value, fn) {
    $('#promptTitle').textContent = title;
    $('#promptLabel').textContent = label;
    var i = $('#promptInput');
    i.value = (value === null || value === undefined) ? '' : value;
    $('#promptErr').hidden = true;
    i.classList.remove('invalid');
    pending.prompt = fn;
    openModal($('#promptModal'));
    setTimeout(function () { i.focus({ preventScroll: true }); i.select(); }, 80);
  }

  /* ============================== Toasts ================================ */
  function toast(title, body, kind) {
    var wrap = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('data-kind', kind || 'info');
    el.innerHTML = '<span class="toast__dot" aria-hidden="true"></span><span><b>' + esc(title) + '</b>' +
      (body ? '<br>' + esc(body) : '') + '</span>';
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add('toast--out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, kind === 'error' ? 5200 : 3400);
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
  }

  /* ====================== NIBU : humeurs et reactions =================== */
  var REACTIONS = {
    capsule: ['Une capsule de plus. Mon cerveau robotique devient redoutable.',
              'Enregistre. Je range ca dans mon disque dur chrome.',
              'Capsule archivee. Mes circuits fretillent de satisfaction.'],
    spend: ['Depense notee. Mon petit compteur tourne a pleine vitesse.',
            'Recu. Je calcule plus vite que la lumiere, promis.',
            "C'est enregistre. Ton budget et moi restons en contact."],
    done: ['Mission accomplie. Je fais le moonwalk dans mes circuits.',
           'Termine ! Je clignote de fierte.',
           'Valide. Mes antennes se dressent de satisfaction.'],
    package: ['Colis detecte. Je mobilise mes antennes.',
              "Commande mise a jour. Je surveille l'horizon, facon radar.",
              "Suivi enregistre. Je garde un oeil numerique dessus."],
    budgetOk: ['Ton budget respire tranquillement. Je retourne charger mes boulons.',
               'Finances sous controle. Autorisation de me reposer, pilote.'],
    budgetWarn: ['Ton budget commence a transpirer. On verifie les depenses ?',
                 'Leger signal orange. Rien de grave, on jette un oeil ?'],
    budgetOver: ['Budget depasse. Aucun jugement ici, juste un petit ajustement.',
                 'Le compteur a pris un coup de chaud. On regarde ensemble ?'],
    calm: ['Rien d urgent pour le moment. Je peux retourner charger mes boulons.',
           'Horizon degage. Je flotte, detendu.'],
    soon: ['Attention, pilote ! Cette echeance approche a vitesse lumiere.',
           "Signaux rapproches. Une petite verification, et c'est regle."],
    welcome: ['Salut, pilote. On gere ca ?',
              "Systemes prets. On s'occupe de ta journee ?",
              "Bon retour, pilote. Je n'ai rien oublie, promis."],
    empty: ['Base vide. Parfait pour commencer, tu ne trouves pas ?',
            "Aucune capsule pour l'instant. On en cree une ?"]
  };
  var MOODS = {
    neutral: 'NEUTRE', happy: 'SATISFAITE', focused: 'CONCENTREE',
    alert: 'INQUIETE', sleepy: 'ENDORMIE', celebrate: 'EN FETE'
  };
  var lastReaction = null;

  function prefersReduced() {
    return state.settings.reduceMotion ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function setMood(mood) {
    if (!MOODS[mood]) mood = 'neutral';
    $('#nibuScene').setAttribute('data-mood', mood);
    $('#moodLabel').textContent = MOODS[mood];
    $('#moodChip').setAttribute('data-tone',
      mood === 'alert' ? 'danger' : (mood === 'happy' || mood === 'celebrate') ? 'green' : 'cyan');
  }
  function react(kind, opts) {
    opts = opts || {};
    var line = pick(REACTIONS[kind] || REACTIONS.calm);
    lastReaction = line;
    var mood = opts.mood || (
      kind === 'done' || kind === 'capsule' || kind === 'package' ? 'happy' :
      kind === 'budgetOver' ? 'alert' : kind === 'soon' ? 'focused' : deriveMood());
    setMood(mood);
    var scene = $('#nibuScene');
    if (!prefersReduced() && opts.animate !== false) {
      scene.setAttribute('data-reaction', kind);
      window.setTimeout(function () { scene.removeAttribute('data-reaction'); }, 1600);
    }
    $('#heroSub').textContent = line;
    $('#budgetSay').textContent = line;
    if (opts.toast) toast('NIBU', line, 'nibu');
    return line;
  }

  /* ========================= Statistiques =============================== */
  function activeCapsules() { return state.capsules.filter(function (c) { return c.status === 'active'; }); }
  function weekExpenses() {
    var s = weekStart(), e = weekEnd();
    return state.expenses.filter(function (x) { return x.date >= s && x.date <= e; });
  }
  function totals() {
    var spent = weekExpenses().reduce(function (a, x) { return a + x.amount; }, 0);
    var budget = state.settings.weeklyBudget;
    return { budget: budget, spent: round2(spent), left: round2(budget - spent) };
  }
  function urgency(c) {
    if (c.status === 'done') return 'done';
    var d = daysUntil(c.date);
    if (d === null) return 'none';
    if (d < 0) return 'urgent';
    if (d <= 3) return 'soon';
    return 'ok';
  }
  function computeStats() {
    var t = totals();
    var act = activeCapsules();
    var dated = act.filter(function (c) { return c.date; }).sort(function (a, b) {
      return (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'));
    });
    return {
      t: t,
      active: act.length,
      next: dated[0] || null,
      rdv: act.filter(function (c) { return c.type === 'rendezvous' && c.date >= todayISO(); }).length,
      cmd: act.filter(function (c) { return c.type === 'commande' && c.cmdStatus !== 'livré' && c.cmdStatus !== 'annulé'; }).length,
      soon: act.filter(function (c) { var d = daysUntil(c.date); return d !== null && d >= 0 && d <= 3; }).length,
      urgent: act.filter(function (c) { var d = daysUntil(c.date); return d !== null && d < 0; }).length,
      overBudget: t.budget > 0 && t.left < 0,
      empty: state.capsules.length === 0 && state.expenses.length === 0
    };
  }
  function deriveMood() {
    var s = computeStats();
    if (s.overBudget) return 'alert';
    if (s.urgent > 0) return 'alert';
    if (s.soon > 0) return 'focused';
    if (state.capsules.length === 0 && state.expenses.length === 0) return 'sleepy';
    if (s.active === 0) return 'happy';
    return 'neutral';
  }
  function levelInfo() { return { level: Math.floor(state.xp / 100) + 1 }; }
  function addXp(n) { state.xp += n; }

  /* ============================ Mission ================================= */
  var MISSIONS = {
    'add-expense': { text: 'Enregistrer une depense', hint: 'Va dans Budget et saisis un montant reel.', nav: 'budget' },
    'add-capsule': { text: 'Creer une nouvelle capsule', hint: 'Une echeance, un rendez-vous, une commande ou une note.', nav: 'capsules' },
    'check-due':   { text: 'Terminer une capsule', hint: 'Dans Capsules, marque une capsule comme terminee.', nav: 'capsules' },
    'update-pack': { text: 'Mettre a jour une commande', hint: 'Fais avancer le statut d un colis en cours.', nav: 'capsules' }
  };
  function ensureMission() {
    var t = todayISO();
    if (!state.mission || state.mission.date !== t || !MISSIONS[state.mission.id]) {
      var id = pick(['add-expense', 'add-capsule', 'check-due', 'update-pack']);
      if (state.expenses.length === 0) id = 'add-expense';
      else if (state.capsules.length === 0) id = 'add-capsule';
      state.mission = { date: t, id: id, done: false };
      save();
    }
  }
  function completeMission(id) {
    ensureMission();
    if (state.mission.done || state.mission.id !== id) return;
    state.mission.done = true;
    addXp(15);
    save();
    setMood('celebrate');
    toast('Mission du jour validee', pick(REACTIONS.done), 'success');
    window.setTimeout(function () { setMood(deriveMood()); renderStats(); }, 2200);
  }

  /* =========================== Navigation =============================== */
  var currentView = 'accueil';
  function navigate(view, opts) {
    opts = opts || {};
    if (['accueil', 'budget', 'capsules', 'reglages'].indexOf(view) === -1) view = 'accueil';
    currentView = view;
    $$('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; });
    $$('.tab').forEach(function (b) {
      if (b.getAttribute('data-nav') === view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    try { window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    if (opts.focus) {
      var t = $('#' + opts.focus);
      if (t) { if (t.focus) t.focus({ preventScroll: true }); if (t.click && t.tagName === 'BUTTON') t.click(); }
    }
  }

  /* ============================ Rendu =================================== */
  var TYPE_LABEL = { echeance: 'ECHEANCE', rendezvous: 'RENDEZ-VOUS', commande: 'COMMANDE', rappel: 'RAPPEL' };

  function urgencyBadge(c) {
    var u = urgency(c);
    if (u === 'urgent') return '<span class="badge badge--urgent">EN RETARD · ' + esc(relDays(c.date)) + '</span>';
    if (u === 'soon')   return '<span class="badge badge--soon">BIENTOT · ' + esc(relDays(c.date)) + '</span>';
    if (u === 'done')   return '<span class="badge badge--done">TERMINEE</span>';
    return '';
  }
  function cardHTML(c, o) {
    o = o || {};
    var meta = [
      '<span class="badge badge--type-' + c.type + '">' + TYPE_LABEL[c.type] + '</span>',
      c.date ? '<span class="badge">' + esc(dateLabel(c.date, c.time)) + '</span>' : '',
      c.type === 'commande' ? '<span class="badge">' + esc(c.cmdStatus) + '</span>' : '',
      (c.type === 'echeance' && c.echCat) ? '<span class="badge">' + esc(c.echCat) + '</span>' : '',
      c.amount !== null ? '<span class="badge">' + esc(chf(c.amount)) + '</span>' : '',
      c.shop ? '<span class="badge">' + esc(c.shop) + '</span>' : '',
      c.tracking ? '<span class="badge">SUIVI ' + esc(c.tracking) + '</span>' : '',
      urgencyBadge(c)
    ].filter(Boolean).join('');

    var actions = [];
    if (!o.hideActions) {
      actions.push(c.status === 'active'
        ? '<button class="btn btn--tiny" type="button" data-act="done" data-id="' + c.id + '">Marquer terminee</button>'
        : '<button class="btn btn--tiny" type="button" data-act="reopen" data-id="' + c.id + '">Reactiver</button>');
      if (c.type === 'commande' && c.status === 'active') {
        actions.push('<button class="btn btn--tiny" type="button" data-act="advance" data-id="' + c.id + '">Avancer le statut</button>');
      }
      actions.push('<button class="btn btn--tiny" type="button" data-act="edit" data-id="' + c.id + '">Modifier</button>');
      actions.push('<button class="btn btn--tiny btn--danger" type="button" data-act="delete" data-id="' + c.id + '">Supprimer</button>');
    }

    return '<article class="card" data-type="' + c.type + '" data-status="' + c.status + '" data-urgency="' + urgency(c) + '">' +
      '<div class="card__top"><h3 class="card__title">' + esc(c.title) + '</h3></div>' +
      '<div class="card__meta">' + meta + '</div>' +
      (c.detail ? '<p class="card__detail">' + esc(c.detail) + '</p>' : '') +
      (actions.length ? '<div class="card__actions">' + actions.join('') + '</div>' : '') +
      '</article>';
  }

  function renderGreeting() {
    var s = computeStats();
    var n = state.settings.name || 'pilote';
    var g;
    if (s.empty) g = 'Salut, ' + n + '. On demarre une premiere capsule ?';
    else if (s.overBudget) g = 'Salut, ' + n + ". Un petit coup d'oeil au budget ?";
    else if (s.urgent > 0) g = 'Attention, ' + n + '. Une echeance demande un regard.';
    else if (s.soon > 0) g = 'Salut, ' + n + '. Quelque chose approche a vitesse lumiere.';
    else if (s.active === 0) g = 'Tout est calme, ' + n + '. Je flotte, detendu.';
    else g = 'Salut, ' + n + '. On gere ca ?';
    $('#heroGreeting').textContent = g;
    if (!lastReaction) $('#heroSub').textContent = s.empty ? pick(REACTIONS.empty) : pick(REACTIONS.welcome);
  }

  function renderStats() {
    var s = computeStats(), t = s.t;

    var sb = $('#statBudget');
    sb.textContent = t.budget > 0 ? chf(t.left) : '—';
    sb.className = 'stat__value ' + (t.budget > 0 && t.left < 0 ? 'is-over' : (t.budget > 0 && t.spent / t.budget >= 0.8 ? 'is-warn' : 'is-ok'));
    $('#statBudgetNote').textContent = t.budget > 0
      ? chf(t.spent) + ' depense sur ' + chf(t.budget)
      : 'Budget non defini — voir Reglages';

    var sn = $('#statNext');
    if (s.next) {
      sn.textContent = s.next.title;
      sn.className = 'stat__value ' + (urgency(s.next) === 'urgent' ? 'is-over' : urgency(s.next) === 'soon' ? 'is-warn' : '');
      $('#statNextNote').textContent = dateLabel(s.next.date, s.next.time) + (s.next.date ? ' · ' + relDays(s.next.date) : '');
    } else {
      sn.textContent = '—';
      sn.className = 'stat__value';
      $('#statNextNote').textContent = 'Aucune date enregistree';
    }

    $('#statRdV').textContent = String(s.rdv);
    $('#statRdVNote').textContent = s.rdv === 0 ? 'Agenda libre' : (s.rdv === 1 ? '1 rendez-vous a venir' : s.rdv + ' rendez-vous a venir');
    $('#statColis').textContent = String(s.cmd);
    $('#statColisNote').textContent = s.cmd === 0 ? 'Rien en transit' : (s.cmd === 1 ? '1 commande en cours' : s.cmd + ' commandes en cours');

    /* Energie : socle + XP reel, moins la charge en attente (retards, echeances
       proches, budget depasse), plus un bonus quand tout est a jour. */
    var e = 58 + Math.min(30, (state.xp % 300) / 300 * 30);
    e -= s.urgent * 9;
    e -= s.soon * 3;
    if (s.overBudget) e -= 14;
    if (state.capsules.length > 0 && s.active === 0) e += 16;
    e = Math.max(20, Math.min(100, Math.round(e)));

    var energyLevel = e >= 78 ? 'high' : (e <= 45 ? 'low' : 'mid');
    var scene = $('#nibuScene');
    if (scene.getAttribute('data-energy') !== energyLevel) scene.setAttribute('data-energy', energyLevel);
    scene.setAttribute('data-xp', state.xp > 0 ? '1' : '0');

    $('#energyFill').style.width = e + '%';
    $('#energyFill').className = 'energy__fill ' + (energyLevel === 'low' ? 'is-low' : energyLevel === 'high' ? 'is-high' : '');
    $('#energyLabel').textContent = e + ' %';
    $('#energyBar').setAttribute('aria-valuenow', String(e));
    $('#energyBar').setAttribute('aria-valuetext', e + ' % · ' + (
      energyLevel === 'high' ? 'en pleine forme' :
      energyLevel === 'low' ? 'fatiguee, trop de choses en attente' : 'stable'));

    $('#levelLabel').textContent = String(levelInfo().level);
    $('#xpLabel').textContent = state.xp + ' XP';
    setMood(deriveMood());
  }

  function renderHome() {
    var rank = { urgent: 0, soon: 1, ok: 2, none: 3, done: 4 };
    var act = activeCapsules().slice().sort(function (a, b) {
      if (rank[urgency(a)] !== rank[urgency(b)]) return rank[urgency(a)] - rank[urgency(b)];
      return (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99');
    }).slice(0, 3);

    $('#homeActive').innerHTML = act.length
      ? act.map(function (c) { return cardHTML(c, { hideActions: true }); }).join('')
      : '<div class="empty"><b>Aucune capsule active</b>Cree ta premiere capsule : echeance, rendez-vous, commande ou note.</div>';

    var rdv = activeCapsules().filter(function (c) { return c.type === 'rendezvous' && c.date >= todayISO(); })
      .sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 3);
    $('#homeRdV').innerHTML = rdv.length
      ? rdv.map(function (c) { return cardHTML(c, { hideActions: true }); }).join('')
      : '<div class="empty">Aucun rendez-vous a venir.</div>';

    var cmd = activeCapsules().filter(function (c) { return c.type === 'commande' && c.cmdStatus !== 'annulé'; })
      .sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); }).slice(0, 3);
    $('#homeCmd').innerHTML = cmd.length
      ? cmd.map(function (c) { return cardHTML(c, { hideActions: true }); }).join('')
      : '<div class="empty">Aucune commande en cours.</div>';
  }

  function renderMission() {
    ensureMission();
    var m = MISSIONS[state.mission.id] || MISSIONS['add-capsule'];
    $('#missionText').textContent = m.text;
    $('#missionHint').textContent = m.hint + " La mission ne se valide que lorsque l'action a reellement ete effectuee.";
    var tag = $('#missionState');
    tag.textContent = state.mission.done ? 'ACCOMPLIE' : 'A FAIRE';
    tag.setAttribute('data-state', state.mission.done ? 'done' : 'todo');
    var go = $('#missionGo');
    go.disabled = !!state.mission.done;
    go.textContent = state.mission.done ? 'Mission accomplie' : "Aller a l'action";
    go.setAttribute('data-goto', m.nav);
  }

  function renderBudget() {
    var t = totals();
    $('#budgetTotal').textContent = chf(t.budget);
    $('#budgetSpent').textContent = chf(t.spent);
    var l = $('#budgetLeft');
    l.textContent = t.left < 0 ? '−' + chf(Math.abs(t.left)) : chf(t.left);
    l.className = t.left < 0 ? 'is-over' : 'is-ok';

    var pct = t.budget > 0 ? Math.min(100, Math.round((t.spent / t.budget) * 100)) : (t.spent > 0 ? 100 : 0);
    var f = $('#budgetFill');
    f.style.width = pct + '%';
    f.className = 'bar__fill' + (t.left < 0 ? ' is-over' : (pct >= 80 ? ' is-warn' : ''));
    $('#budgetBar').setAttribute('aria-valuenow', String(pct));
    $('#budgetPct').textContent = t.budget > 0
      ? pct + ' % du budget consomme · ' + chf(t.spent) + ' sur ' + chf(t.budget)
      : 'Budget non defini — definis-le dans Reglages';

    if (t.budget === 0) $('#budgetSay').textContent = 'Budget a zero. Donne-moi ton plafond hebdo et je surveille pour toi.';
    else if (t.left < 0) $('#budgetSay').textContent = pick(REACTIONS.budgetOver);
    else if (pct >= 80) $('#budgetSay').textContent = pick(REACTIONS.budgetWarn);
    else $('#budgetSay').textContent = pick(REACTIONS.budgetOk);

    var list = weekExpenses().slice().sort(function (a, b) {
      return (b.date + b.createdAt).localeCompare(a.date + a.createdAt);
    });
    $('#expenseList').innerHTML = list.length
      ? list.map(function (x) {
          return '<article class="card" data-type="rappel" data-status="active" data-urgency="none">' +
            '<div class="card__top"><h3 class="card__title">' + esc(chf(x.amount)) + (x.label ? ' · ' + esc(x.label) : '') + '</h3></div>' +
            '<div class="card__meta"><span class="badge">' + esc(x.category) + '</span><span class="badge">' + esc(dateLabel(x.date, '')) + '</span></div>' +
            '<div class="card__actions"><button class="btn btn--tiny btn--danger" type="button" data-act="del-expense" data-id="' + x.id + '">Supprimer</button></div>' +
            '</article>';
        }).join('')
      : '<div class="empty"><b>Aucune depense cette semaine</b>Semaine du ' + esc(dateLabel(weekStart(), '')) + ' au ' + esc(dateLabel(weekEnd(), '')) + '. Les depenses plus anciennes restent conservees mais ne comptent pas dans le budget de la semaine.</div>';
  }

  function renderCapsules() {
    var ft = $('#filterType').value, fs = $('#filterStatus').value, so = $('#sortBy').value;

    function cmp(a, b) {
      if (so === 'date-asc')     return (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99');
      if (so === 'date-desc')    return (b.date || '0000-00-00').localeCompare(a.date || '0000-00-00');
      if (so === 'created-desc') return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (so === 'created-asc')  return (a.createdAt || '').localeCompare(b.createdAt || '');
      if (so === 'title')        return a.title.localeCompare(b.title, 'fr');
      return 0;
    }
    var all = state.capsules.filter(function (c) {
      if (ft !== 'all' && c.type !== ft) return false;
      if (fs === 'active' && c.status !== 'active') return false;
      if (fs === 'done' && c.status !== 'done') return false;
      return true;
    });
    var act = all.filter(function (c) { return c.status === 'active'; }).sort(cmp);
    var done = all.filter(function (c) { return c.status === 'done'; }).sort(cmp);

    $('#capsuleCount').textContent = all.length + (all.length === 1 ? ' capsule affichee' : ' capsules affichees') +
      ' · ' + act.length + ' active' + (act.length === 1 ? '' : 's') +
      ' · ' + done.length + ' terminee' + (done.length === 1 ? '' : 's');

    $('#capsuleList').innerHTML = act.length
      ? act.map(function (c) { return cardHTML(c); }).join('')
      : '<div class="empty"><b>Aucune capsule active dans ce filtre</b>Modifie le filtre, ou cree une capsule avec « + Capsule ».</div>';

    $('#doneWrap').hidden = done.length === 0;
    $('#capsuleListDone').innerHTML = done.map(function (c) { return cardHTML(c); }).join('');
  }

  function renderSettings() {
    $('#setName').value = state.settings.name;
    $('#setBudget').value = String(state.settings.weeklyBudget);
    $('#setReduceMotion').checked = !!state.settings.reduceMotion;
    document.body.setAttribute('data-reduce-motion', state.settings.reduceMotion ? '1' : '0');
    var bytes = 0;
    try { bytes = (localStorage.getItem(KEY) || '').length; } catch (e) { bytes = 0; }
    $('#storageInfo').textContent = state.capsules.length + ' capsule' + (state.capsules.length === 1 ? '' : 's') +
      ' · ' + state.expenses.length + ' depense' + (state.expenses.length === 1 ? '' : 's') +
      ' · niveau ' + levelInfo().level + ' (' + state.xp + ' XP) · environ ' + (bytes / 1024).toFixed(1) + ' Ko stockes dans ce navigateur.';
  }

  function renderAll() {
    renderGreeting(); renderStats(); renderMission(); renderHome();
    renderBudget(); renderCapsules(); renderSettings();
  }

  /* ====================== Formulaire de capsule ========================= */
  var editingId = null;
  function applyTypeFields() {
    var t = $('#capType').value;
    $('#wrapEchCat').hidden = t !== 'echeance';
    $('#wrapShop').hidden = t !== 'commande';
    $('#wrapCmdStatus').hidden = t !== 'commande';
    $('#wrapTracking').hidden = t !== 'commande';
    $('#capTitleLabel').textContent = t === 'commande' ? 'Produit ou commande *' : 'Titre *';
    $('#capTitle').placeholder =
      t === 'echeance' ? "Facture d'electricite" :
      t === 'rendezvous' ? 'Dentiste' : t === 'commande' ? 'Casque audio' : 'Rappeler la regie';
    $('#capDateLabel').textContent =
      t === 'echeance' ? 'Date limite' :
      t === 'rendezvous' ? 'Date du rendez-vous' :
      t === 'commande' ? 'Livraison estimee (facultatif)' : 'Date (facultatif)';
    $('#capDetailLabel').textContent = t === 'rappel' ? 'Note' : 'Detail (facultatif)';
    $('#capDetail').placeholder =
      t === 'echeance' ? 'Numero de facture, reference' :
      t === 'rendezvous' ? 'Lieu, adresse, nom du praticien' :
      t === 'rappel' ? 'Information a retrouver rapidement' : 'Precision utile';
  }
  function openCapsuleForm(c) {
    editingId = c ? c.id : null;
    $('#capModalTitle').textContent = c ? 'Modifier la capsule' : 'Nouvelle capsule';
    $('#capSubmit').textContent = c ? 'Enregistrer les modifications' : 'Creer la capsule';
    $('#capType').value = c ? c.type : 'echeance';
    $('#capEchCat').value = (c && c.echCat) ? c.echCat : 'Facture a payer';
    $('#capTitle').value = c ? c.title : '';
    $('#capDate').value = c ? c.date : '';
    $('#capTime').value = c ? c.time : '';
    $('#capAmount').value = (c && c.amount !== null) ? String(c.amount) : '';
    $('#capShop').value = c ? c.shop : '';
    $('#capTracking').value = c ? c.tracking : '';
    $('#capCmdStatus').value = c ? c.cmdStatus : 'commandé';
    $('#capStatus').value = c ? c.status : 'active';
    $('#capDetail').value = c ? c.detail : '';
    ['#capTitleErr', '#capAmountErr'].forEach(function (s) { $(s).hidden = true; });
    $$('#capsuleForm input').forEach(function (i) { i.classList.remove('invalid'); });
    applyTypeFields();
    openModal($('#capsuleModal'));
  }
  function submitCapsule(ev) {
    ev.preventDefault();
    var title = $('#capTitle').value.trim();
    if (title.length < 2) {
      $('#capTitleErr').textContent = "Donne un titre d'au moins 2 caracteres.";
      $('#capTitleErr').hidden = false;
      $('#capTitle').classList.add('invalid');
      $('#capTitle').focus();
      return;
    }
    $('#capTitleErr').hidden = true;
    $('#capTitle').classList.remove('invalid');

    var raw = $('#capAmount').value.trim();
    var amount = raw === '' ? null : parseAmount(raw);
    if (raw !== '' && amount === null) {
      $('#capAmountErr').textContent = 'Montant invalide. Exemple : 120.00';
      $('#capAmountErr').hidden = false;
      $('#capAmount').classList.add('invalid');
      $('#capAmount').focus();
      return;
    }
    $('#capAmountErr').hidden = true;
    $('#capAmount').classList.remove('invalid');

    var type = $('#capType').value;
    var data = cleanCapsule({
      id: editingId || uid('c'),
      type: type,
      title: title,
      date: $('#capDate').value || '',
      time: $('#capTime').value || '',
      amount: amount,
      detail: $('#capDetail').value.trim(),
      status: $('#capStatus').value,
      echCat: type === 'echeance' ? $('#capEchCat').value : '',
      shop: type === 'commande' ? $('#capShop').value.trim() : '',
      tracking: type === 'commande' ? $('#capTracking').value.trim() : '',
      cmdStatus: type === 'commande' ? $('#capCmdStatus').value : 'commandé',
      createdAt: new Date().toISOString()
    });

    if (editingId) {
      for (var i = 0; i < state.capsules.length; i++) {
        if (state.capsules[i].id === editingId) { data.createdAt = state.capsules[i].createdAt; state.capsules[i] = data; break; }
      }
      addXp(5); save();
      closeModal($('#capsuleModal'));
      lastReaction = null; renderAll();
      react('capsule', { toast: true, mood: 'happy' });
      toast('Capsule modifiee', '"' + title + '" a ete mise a jour.', 'success');
    } else {
      state.capsules.push(data);
      state.counters.created += 1;
      addXp(10); save();
      closeModal($('#capsuleModal'));
      lastReaction = null; renderAll();
      react(type === 'commande' ? 'package' : 'capsule', { toast: true, mood: 'happy' });
      toast('Capsule creee', '"' + title + '" rejoint ta memoire du quotidien.', 'success');
      completeMission('add-capsule');
    }
  }

  /* ========================= Actions capsule ============================ */
  var CMD_ORDER = ['commandé', 'expédié', 'en livraison', 'livré'];
  function findCapsule(id) {
    for (var i = 0; i < state.capsules.length; i++) if (state.capsules[i].id === id) return state.capsules[i];
    return null;
  }
  function capsuleAction(act, id) {
    var c = findCapsule(id);
    if (!c) return;

    if (act === 'done') {
      c.status = 'done';
      state.counters.doneCount += 1;
      addXp(20); save(); renderAll();
      react('done', { toast: true, mood: 'happy' });
      toast('Capsule terminee', '"' + c.title + '" est classee dans tes accomplissements.', 'success');
      completeMission('check-due');
      return;
    }
    if (act === 'reopen') {
      c.status = 'active'; save(); renderAll();
      toast('Capsule reactivee', '"' + c.title + '" est de nouveau active.', 'success');
      return;
    }
    if (act === 'advance') {
      var i = CMD_ORDER.indexOf(c.cmdStatus);
      if (i < 0) i = 0;
      if (i >= CMD_ORDER.length - 1) {
        toast('Statut deja final', 'Cette commande est marquee « ' + c.cmdStatus + ' ».', 'info');
        return;
      }
      c.cmdStatus = CMD_ORDER[i + 1];
      if (c.cmdStatus === 'livré') { c.status = 'done'; addXp(25); } else addXp(5);
      save(); renderAll();
      react(c.cmdStatus === 'livré' ? 'package' : 'capsule', { toast: true, mood: 'happy' });
      if (c.cmdStatus === 'livré') toast('Commande livree', '"' + c.title + '" est arrivee a destination.', 'success');
      else toast('Commande mise a jour', '"' + c.title + '" est maintenant « ' + c.cmdStatus + ' ».', 'success');
      completeMission('update-pack');
      return;
    }
    if (act === 'edit') { openCapsuleForm(c); return; }
    if (act === 'delete') {
      askConfirm('Supprimer cette capsule ?', '"' + c.title + '" sera definitivement supprimee de ce navigateur.', function () {
        state.capsules = state.capsules.filter(function (x) { return x.id !== id; });
        save(); renderAll();
        toast('Capsule supprimee', '"' + c.title + '" a ete retiree.', 'success');
      }, 'Supprimer');
    }
  }

  /* ============================ Depenses ================================ */
  function submitExpense(ev) {
    ev.preventDefault();
    var amt = parseAmount($('#expAmount').value.trim());
    if (amt === null || amt <= 0) {
      $('#expAmountErr').textContent = (amt === null) ? 'Montant invalide. Exemple : 22.00' : 'Le montant doit etre superieur a 0.';
      $('#expAmountErr').hidden = false;
      $('#expAmount').classList.add('invalid');
      $('#expAmount').focus();
      return;
    }
    $('#expAmountErr').hidden = true;
    $('#expAmount').classList.remove('invalid');

    var e = cleanExpense({
      id: uid('x'),
      amount: amt,
      category: $('#expCat').value,
      label: $('#expLabel').value.trim(),
      date: $('#expDate').value || todayISO(),
      createdAt: new Date().toISOString()
    });
    state.expenses.push(e);
    state.counters.spentCount += 1;
    addXp(8); save();

    var t = totals();
    lastReaction = null; renderAll();
    react(t.left < 0 ? 'budgetOver' : 'spend', { toast: true, mood: t.left < 0 ? 'alert' : 'happy' });
    toast('Depense enregistree', chf(amt) + ' · ' + e.category + ' · reste ' + (t.left < 0 ? '−' + chf(Math.abs(t.left)) : chf(t.left)), 'success');
    completeMission('add-expense');

    $('#expenseForm').reset();
    $('#expDate').value = todayISO();
  }
  function deleteExpense(id) {
    var x = null;
    for (var i = 0; i < state.expenses.length; i++) if (state.expenses[i].id === id) x = state.expenses[i];
    if (!x) return;
    askConfirm('Supprimer cette depense ?',
      chf(x.amount) + (x.label ? ' (' + x.label + ')' : '') + " sera retiree de l'historique et le budget restant sera recalcule.",
      function () {
        state.expenses = state.expenses.filter(function (y) { return y.id !== id; });
        save(); renderAll();
        var t = totals();
        toast('Depense supprimee', 'Budget restant recalcule : ' + (t.left < 0 ? '−' + chf(Math.abs(t.left)) : chf(t.left)), 'success');
      }, 'Supprimer');
  }
  function resetExpenses() {
    if (state.expenses.length === 0) { toast('Aucune depense', "Il n'y a rien a reinitialiser.", 'info'); return; }
    askConfirm('Reinitialiser les depenses ?',
      'Les ' + state.expenses.length + ' depense(s) enregistree(s) seront supprimees et le budget restant repartira du budget hebdomadaire complet. Le budget lui-meme est conserve.',
      function () {
        state.expenses = [];
        save(); renderAll();
        toast('Depenses reinitialisees', 'Historique vide. Le budget hebdomadaire est conserve.', 'success');
      }, 'Reinitialiser');
  }

  /* ======================== Export / Import ============================= */
  function exportJSON() {
    var payload = {
      app: 'NIBU',
      slogan: 'YOUR LIFE, ONE LITTLE CREATURE.',
      exportedAt: new Date().toISOString(),
      version: 1,
      note: "Export local NIBU. Les donnees ne sont pas chiffrees et ne se synchronisent pas automatiquement.",
      settings: state.settings,
      capsules: state.capsules,
      expenses: state.expenses,
      xp: state.xp,
      counters: state.counters,
      mission: state.mission
    };
    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'nibu-export-' + todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Export pret', 'Fichier nibu-export-' + todayISO() + '.json telecharge.', 'success');
    } catch (err) {
      toast('Export impossible', 'Le navigateur a refuse de generer le fichier.', 'error');
    }
  }
  function importJSON(file) {
    var r = new FileReader();
    r.onload = function () {
      var d = safeParse(String(r.result));
      if (!d || typeof d !== 'object' || (!Array.isArray(d.capsules) && !Array.isArray(d.expenses))) {
        toast('Import refuse', "Ce fichier n'est pas un export NIBU valide.", 'error');
        return;
      }
      askConfirm('Importer ce fichier ?',
        'Le contenu actuel de ce navigateur sera remplace par le fichier importe (' +
        (Array.isArray(d.capsules) ? d.capsules.length : 0) + ' capsule(s), ' +
        (Array.isArray(d.expenses) ? d.expenses.length : 0) + ' depense(s)).',
        function () {
          state = normalize(d);
          state.mission = defaultState().mission;
          save(); renderAll();
          toast('Import termine', 'Les donnees du fichier ont remplace les donnees locales.', 'success');
        }, 'Importer');
    };
    r.onerror = function () { toast('Lecture impossible', 'Le fichier n a pas pu etre lu.', 'error'); };
    r.readAsText(file);
  }
  function wipeAll() {
    askConfirm('Effacer toutes les donnees locales ?',
      'Capsules, depenses, budget, nom et progression seront definitivement supprimes de ce navigateur. Cette action est irreversible. Pense a exporter avant si tu veux garder une copie.',
      function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        state = defaultState();
        save(); renderAll();
        toast('Donnees effacees', 'NIBU repart de zero dans ce navigateur.', 'success');
      }, 'Effacer');
  }

  /* =========================== Branchements ============================= */
  function setBudget(value, onDone) {
    askPrompt('Budget hebdomadaire', 'Montant en CHF (exemple : 90)', value, function (raw) {
      var v = parseAmount(raw);
      var err = $('#promptErr');
      if (v === null) {
        err.textContent = 'Montant invalide. Exemple : 90.00';
        err.hidden = false;
        $('#promptInput').classList.add('invalid');
        return false;
      }
      err.hidden = true;
      $('#promptInput').classList.remove('invalid');
      state.settings.weeklyBudget = v;
      save(); renderAll();
      toast('Budget mis a jour', 'Budget hebdomadaire : ' + chf(v) + '.', 'success');
      if (onDone) onDone();
      return true;
    });
  }

  function bind() {
    /* Navigation */
    document.addEventListener('click', function (ev) {
      var nav = ev.target.closest ? ev.target.closest('[data-nav]') : null;
      if (nav) {
        ev.preventDefault();
        navigate(nav.getAttribute('data-nav'));
        return;
      }
      var close = ev.target.closest ? ev.target.closest('[data-close]') : null;
      if (close) {
        var m = close.closest('.modal');
        if (m) closeModal(m);
        return;
      }
      var act = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (act) {
        var a = act.getAttribute('data-act'), id = act.getAttribute('data-id');
        if (a === 'del-expense') { deleteExpense(id); return; }
        capsuleAction(a, id);
      }
    });

    $$('.modal__backdrop').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.closest('.modal');
        if (m) closeModal(m);
      });
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') $$('.modal').forEach(function (m) { if (!m.hidden) closeModal(m); });
    });

    /* Confirm / prompt */
    $('#confirmOk').addEventListener('click', function () {
      var fn = pending.confirm;
      pending.confirm = null;
      closeModal($('#confirmModal'));
      if (typeof fn === 'function') fn();
    });
    $('#promptForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var fn = pending.prompt;
      if (typeof fn === 'function') {
        var keep = fn($('#promptInput').value);
        if (keep === false) return;
      }
      closeModal($('#promptModal'));
    });

    /* Tabs */
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () { navigate(t.getAttribute('data-nav')); });
    });

    /* Accueil */
    $('#btnAddCapsule').addEventListener('click', function () { openCapsuleForm(null); });
    $('#btnAddCapsule2').addEventListener('click', function () { openCapsuleForm(null); });
    $('#missionGo').addEventListener('click', function () {
      navigate($('#missionGo').getAttribute('data-goto') || 'accueil');
    });

    /* Capsules */
    $('#capType').addEventListener('change', applyTypeFields);
    $('#capsuleForm').addEventListener('submit', submitCapsule);
    ['#filterType', '#filterStatus', '#sortBy'].forEach(function (s) {
      $(s).addEventListener('change', renderCapsules);
    });
    $('#btnToggleDone').addEventListener('click', function () {
      var list = $('#capsuleListDone');
      var hide = !list.hidden;
      list.hidden = hide;
      $('#btnToggleDone').textContent = hide ? 'Afficher' : 'Masquer';
    });

    /* Budget */
    $('#expenseForm').addEventListener('submit', submitExpense);
    $('#btnEditBudget').addEventListener('click', function () { setBudget(state.settings.weeklyBudget); });
    $('#btnResetExpenses').addEventListener('click', resetExpenses);

    /* Reglages */
    $('#settingsForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nm = $('#setName').value.trim();
      state.settings.name = nm ? nm.slice(0, 24) : 'pilote';
      var raw = $('#setBudget').value.trim();
      var v = raw === '' ? 0 : parseAmount(raw);
      if (v === null) {
        $('#setBudgetErr').textContent = 'Montant invalide. Exemple : 90.00';
        $('#setBudgetErr').hidden = false;
        $('#setBudget').classList.add('invalid');
        $('#setBudget').focus();
        return;
      }
      $('#setBudgetErr').hidden = true;
      $('#setBudget').classList.remove('invalid');
      state.settings.weeklyBudget = v;
      state.settings.reduceMotion = $('#setReduceMotion').checked;
      save(); renderAll();
      toast('Reglages enregistres', 'NIBU t appellera « ' + state.settings.name + ' » et surveille ' + chf(v) + ' par semaine.', 'success');
    });
    $('#btnExport').addEventListener('click', exportJSON);
    $('#importFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (f) importJSON(f);
      this.value = '';
    });
    $('#btnWipe').addEventListener('click', wipeAll);

    window.addEventListener('storage', function (ev) { if (ev.key === KEY) { load(); renderAll(); } });
  }

  /* ============================== Demarrage ============================= */
  function boot() {
    load();
    ensureMission();
    bind();
    renderAll();
    var h = (location.hash || '').replace('#', '');
    navigate(['accueil', 'budget', 'capsules', 'reglages'].indexOf(h) !== -1 ? h : 'accueil');
    window.addEventListener('hashchange', function () {
      var v = (location.hash || '').replace('#', '');
      if (['accueil', 'budget', 'capsules', 'reglages'].indexOf(v) !== -1 && v !== currentView) navigate(v);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
