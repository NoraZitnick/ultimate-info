/**
 * Team Map page: Leaflet map + filterable list.
 *  - High school (BADA) teams get one green dot each.
 *  - Club programs (BUYA, OAK) get one blue dot each at their main practice area;
 *    clicking it opens that program's page listing all of its teams.
 * High school teams that share a location are fanned out in a ring (in screen
 * pixels) so every dot stays clickable at any zoom level.
 */
(() => {
  'use strict';

  const PIN_SIZE = 26;
  /** BUYA's and OAK's fields are ~3 km apart, so their pills are nudged apart (in pixels) to stay readable. */
  const CLUB_PIN_NUDGE = { buya: [-30, -14], oak: [30, 12] };
  const esc = Site.escapeHtml;

  const state = {
    gender: 'all',
    categories: new Set(Object.keys(CATEGORIES)),
    query: '',
  };

  const els = {
    list: document.querySelector('[data-team-list]'),
    count: document.querySelector('[data-result-count]'),
    gender: document.querySelector('[data-filter="gender"]'),
    categories: document.querySelector('[data-filter="category"]'),
    search: document.getElementById('team-search'),
  };

  const schoolTeams = TEAMS.filter((team) => LEAGUES[team.league].category === 'school');
  const clubOrgs = Object.keys(LEAGUES).filter((key) => LEAGUES[key].category === 'club');

  /* ---------- Map setup ---------- */

  const allPoints = [
    ...schoolTeams.map((team) => [team.location.lat, team.location.lng]),
    ...clubOrgs.map((key) => [LEAGUES[key].spot.lat, LEAGUES[key].spot.lng]),
  ];
  const teamBounds = L.latLngBounds(allPoints);

  const map = L.map('map', {
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 100,
    wheelDebounceTime: 30,
    maxBounds: teamBounds.pad(0.6),
    maxBoundsViscosity: 1,
    inertiaDeceleration: 2500,
  });
  Site.addBaseLayer(map);

  /** Lets users zoom out only slightly past the view that fits every team. */
  function fitToBayArea() {
    const fitZoom = map.getBoundsZoom(teamBounds, false, L.point(40, 40));
    map.setMinZoom(fitZoom - 0.5);
    map.fitBounds(teamBounds, { padding: [40, 40] });
  }

  /* ---------- Markers ---------- */

  /** Returns a Map of team id -> [dx, dy] pixel offset for teams sharing a spot. */
  function ringOffsets(teams) {
    const groups = new Map();
    teams.forEach((team) => {
      const key = `${team.location.lat},${team.location.lng}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(team);
    });

    const offsets = new Map();
    groups.forEach((group) => {
      if (group.length === 1) {
        offsets.set(group[0].id, [0, 0]);
        return;
      }
      const radius = 10 + group.length * 3;
      group.forEach((team, i) => {
        const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
        offsets.set(team.id, [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))]);
      });
    });
    return offsets;
  }

  function schoolIcon(team, [dx, dy]) {
    const half = PIN_SIZE / 2;
    return L.divIcon({
      className: 'pin-anchor',
      html: `<span class="pin pin--school">${GENDERS[team.gender].short}</span>`,
      iconSize: [PIN_SIZE, PIN_SIZE],
      iconAnchor: [half - dx, half - dy],
      popupAnchor: [dx, dy - half],
    });
  }

  function clubIcon(key) {
    const [dx, dy] = CLUB_PIN_NUDGE[key] ?? [0, 0];
    return L.divIcon({
      className: 'pin-anchor',
      html: `<span class="pin pin--club pin--org">${esc(LEAGUES[key].name)}</span>`,
      iconSize: [58, 30],
      iconAnchor: [29 - dx, 15 - dy],
      tooltipAnchor: [dx, dy - 15],
    });
  }

  function schoolPopup(team) {
    return `
      <div class="popup">
        <div class="popup__badges"><span class="badge badge--school">High school</span>${Site.genderBadge(team.gender)}</div>
        <h3 class="popup__title">${esc(team.name)}</h3>
        <p class="popup__meta">${esc(team.program)}</p>
        <p class="popup__meta">📍 ${esc(team.location.name)}</p>
        <a class="btn btn--small" href="${Site.teamUrl(team)}">View team →</a>
      </div>`;
  }

  const offsets = ringOffsets(schoolTeams);
  const markers = new Map();

  schoolTeams.forEach((team) => {
    const marker = L.marker([team.location.lat, team.location.lng], {
      icon: schoolIcon(team, offsets.get(team.id)),
      title: team.name,
      alt: `${team.name} (high school, ${GENDERS[team.gender].label})`,
      riseOnHover: true,
    }).bindPopup(schoolPopup(team));
    markers.set(team.id, marker);
  });

  clubOrgs.forEach((key) => {
    const org = LEAGUES[key];
    const count = Site.orgTeams(key).length;
    const marker = L.marker([org.spot.lat, org.spot.lng], {
      icon: clubIcon(key),
      title: `${org.fullName}: see all ${count} teams`,
      alt: `${org.fullName} club teams`,
      riseOnHover: true,
      zIndexOffset: 500,
    })
      .bindTooltip(`<strong>${esc(org.fullName)}</strong><br>${count} club teams · click to see them all`, {
        direction: 'top',
      })
      .on('click', () => window.location.assign(Site.orgUrl(key)));
    markers.set(`org:${key}`, marker);
  });

  /* ---------- Filtering ---------- */

  function visibleSchoolTeams() {
    if (!state.categories.has('school')) return [];
    return Site.filterTeams(schoolTeams, state);
  }

  /** A club dot shows when any of its teams matches the gender filter and the search. */
  function visibleOrgs() {
    if (!state.categories.has('club')) return [];
    const needle = state.query.trim().toLowerCase();
    return clubOrgs.filter((key) => {
      const org = LEAGUES[key];
      const teams = Site.filterTeams(Site.orgTeams(key), { gender: state.gender });
      if (!teams.length) return false;
      if (!needle) return true;
      const names = [org.name, org.fullName, ...teams.map((team) => team.name)].join(' ').toLowerCase();
      return names.includes(needle);
    });
  }

  function setHighlight(markerKey, on) {
    const marker = markers.get(markerKey);
    const el = marker?.getElement();
    if (!el) return;
    el.classList.toggle('is-highlighted', on);
    marker.setZIndexOffset(on ? 1000 : markerKey.startsWith('org:') ? 500 : 0);
  }

  /* ---------- List ---------- */

  function orgRow(key) {
    const org = LEAGUES[key];
    const teams = Site.filterTeams(Site.orgTeams(key), { gender: state.gender });
    return `
      <li>
        <a class="team-row" href="${Site.orgUrl(key)}" data-marker="org:${key}">
          <span class="pin pin--club pin--org pin--org-sm" aria-hidden="true">${esc(org.name)}</span>
          <span class="team-row__text">
            <span class="team-row__name">${esc(org.fullName)}</span>
            <span class="team-row__meta">${teams.length} club teams · ${esc(org.spot.name)}</span>
          </span>
        </a>
        <button class="team-row__locate" type="button" data-locate="org:${key}" aria-label="Show ${esc(org.fullName)} on map">⌖</button>
      </li>`;
  }

  function schoolRow(team) {
    return `
      <li>
        <a class="team-row" href="${Site.teamUrl(team)}" data-marker="${esc(team.id)}">
          <span class="pin pin--school pin--sm" aria-hidden="true">${GENDERS[team.gender].short}</span>
          <span class="team-row__text">
            <span class="team-row__name">${esc(team.name)}</span>
            <span class="team-row__meta">${esc(GENDERS[team.gender].label)} · ${esc(team.location.name)}</span>
          </span>
        </a>
        <button class="team-row__locate" type="button" data-locate="${esc(team.id)}" aria-label="Show ${esc(team.name)} on map">⌖</button>
      </li>`;
  }

  function renderList(orgs, teams) {
    const sections = [];
    if (orgs.length) sections.push(`<li class="team-list__heading">Club programs</li>${orgs.map(orgRow).join('')}`);
    if (teams.length) sections.push(`<li class="team-list__heading">High school teams</li>${teams.map(schoolRow).join('')}`);
    els.list.innerHTML = sections.join('') || '<li class="team-list__empty">Nothing matches those filters.</li>';
  }

  function render() {
    const teams = visibleSchoolTeams();
    const orgs = visibleOrgs();
    const visibleKeys = new Set([...teams.map((team) => team.id), ...orgs.map((key) => `org:${key}`)]);

    markers.forEach((marker, key) => {
      if (visibleKeys.has(key)) marker.addTo(map);
      else marker.remove();
    });

    const clubCount = orgs.length ? ` + ${orgs.length} club program${orgs.length > 1 ? 's' : ''}` : '';
    els.count.textContent = `Showing ${teams.length} high school team${teams.length === 1 ? '' : 's'}${clubCount}`;
    renderList(orgs, teams);
  }

  /* ---------- Controls ---------- */

  function renderCategoryToggles() {
    els.categories.innerHTML = Object.entries(CATEGORIES)
      .map(
        ([key, category]) => `
        <button type="button" class="league-toggle" data-category="${key}" aria-pressed="true">
          <span class="pin pin--${key} pin--sm" aria-hidden="true"></span>
          <span><strong>${esc(category.label)}</strong> <small>${esc(category.note)}</small></span>
        </button>`,
      )
      .join('');
  }

  function bindEvents() {
    Site.bindSegmented(els.gender, (value) => {
      state.gender = value;
      render();
    });

    els.categories.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      const key = button.dataset.category;
      const on = !state.categories.has(key);
      if (on) state.categories.add(key);
      else state.categories.delete(key);
      button.setAttribute('aria-pressed', String(on));
      render();
    });

    els.search.addEventListener('input', () => {
      state.query = els.search.value;
      render();
    });

    els.list.addEventListener('click', (event) => {
      const locate = event.target.closest('[data-locate]');
      if (!locate) return;
      const marker = markers.get(locate.dataset.locate);
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 13), { duration: 0.8 });
      map.once('moveend', () => (marker.getPopup() ? marker.openPopup() : marker.openTooltip()));
    });

    ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach((type) => {
      els.list.addEventListener(type, (event) => {
        const row = event.target.closest('[data-marker]');
        if (row) setHighlight(row.dataset.marker, type === 'mouseover' || type === 'focusin');
      });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.setMinZoom(map.getBoundsZoom(teamBounds, false, L.point(40, 40)) - 0.5);
      }, 200);
    });
  }

  renderCategoryToggles();
  bindEvents();
  fitToBayArea();
  render();
})();
