/**
 * Team Map page: Leaflet map + filterable team list.
 * Teams that share a location are fanned out in a ring (in screen pixels)
 * so every dot stays clickable at any zoom level.
 */
(() => {
  'use strict';

  const PIN_SIZE = 26;
  const BAY_AREA_CENTER = [37.72, -122.22];

  const state = {
    gender: 'all',
    leagues: new Set(Object.keys(LEAGUES)),
    query: '',
  };

  const els = {
    list: document.querySelector('[data-team-list]'),
    count: document.querySelector('[data-result-count]'),
    gender: document.querySelector('[data-filter="gender"]'),
    leagues: document.querySelector('[data-filter="league"]'),
    search: document.getElementById('team-search'),
  };

  const map = L.map('map', { zoomControl: true }).setView(BAY_AREA_CENTER, 9);
  Site.addBaseLayer(map);

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

  function pinIcon(team, [dx, dy]) {
    const half = PIN_SIZE / 2;
    return L.divIcon({
      className: 'pin-anchor',
      html: `<span class="pin pin--${team.league}">${GENDERS[team.gender].short}</span>`,
      iconSize: [PIN_SIZE, PIN_SIZE],
      iconAnchor: [half - dx, half - dy],
      popupAnchor: [dx, dy - half],
    });
  }

  function popupHtml(team) {
    const esc = Site.escapeHtml;
    return `
      <div class="popup">
        <div class="popup__badges">${Site.leagueBadge(team.league)}${Site.genderBadge(team.gender)}</div>
        <h3 class="popup__title">${esc(team.name)}</h3>
        <p class="popup__meta">${esc(team.program)}</p>
        <p class="popup__meta">📍 ${esc(team.location.name)}</p>
        <a class="btn btn--small" href="${Site.teamUrl(team)}">View team →</a>
      </div>`;
  }

  const offsets = ringOffsets(TEAMS);
  const markers = new Map(
    TEAMS.map((team) => {
      const marker = L.marker([team.location.lat, team.location.lng], {
        icon: pinIcon(team, offsets.get(team.id)),
        title: team.name,
        alt: `${team.name} (${LEAGUES[team.league].name}, ${GENDERS[team.gender].label})`,
        riseOnHover: true,
      }).bindPopup(popupHtml(team));
      return [team.id, marker];
    }),
  );

  function setHighlight(teamId, on) {
    const marker = markers.get(teamId);
    const el = marker?.getElement();
    if (!el) return;
    el.classList.toggle('is-highlighted', on);
    marker.setZIndexOffset(on ? 1000 : 0);
  }

  function renderList(teams) {
    const esc = Site.escapeHtml;
    els.list.innerHTML = teams
      .map(
        (team) => `
        <li>
          <a class="team-row" href="${Site.teamUrl(team)}" data-team-id="${esc(team.id)}">
            <span class="pin pin--${team.league} pin--sm" aria-hidden="true">${GENDERS[team.gender].short}</span>
            <span class="team-row__text">
              <span class="team-row__name">${esc(team.name)}</span>
              <span class="team-row__meta">${esc(LEAGUES[team.league].name)} · ${esc(GENDERS[team.gender].label)} · ${esc(team.location.name)}</span>
            </span>
          </a>
          <button class="team-row__locate" type="button" data-locate="${esc(team.id)}" aria-label="Show ${esc(team.name)} on map">⌖</button>
        </li>`,
      )
      .join('');
    if (!teams.length) {
      els.list.innerHTML = '<li class="team-list__empty">No teams match those filters.</li>';
    }
  }

  function render() {
    const visible = Site.filterTeams(TEAMS, state);
    const visibleIds = new Set(visible.map((team) => team.id));

    markers.forEach((marker, id) => {
      if (visibleIds.has(id)) marker.addTo(map);
      else marker.remove();
    });

    els.count.textContent = `Showing ${visible.length} of ${TEAMS.length} teams`;
    renderList(visible);
  }

  function renderLeagueToggles() {
    els.leagues.innerHTML = Object.entries(LEAGUES)
      .map(
        ([key, league]) => `
        <button type="button" class="league-toggle" data-league="${key}" aria-pressed="true">
          <span class="pin pin--${key} pin--sm" aria-hidden="true"></span>
          <span><strong>${league.name}</strong> <small>${league.fullName}</small></span>
        </button>`,
      )
      .join('');
  }

  function bindEvents() {
    Site.bindSegmented(els.gender, (value) => {
      state.gender = value;
      render();
    });

    els.leagues.addEventListener('click', (event) => {
      const button = event.target.closest('[data-league]');
      if (!button) return;
      const key = button.dataset.league;
      const on = !state.leagues.has(key);
      if (on) state.leagues.add(key);
      else state.leagues.delete(key);
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
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 13), { duration: 0.6 });
      map.once('moveend', () => marker.openPopup());
    });

    ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach((type) => {
      els.list.addEventListener(type, (event) => {
        const row = event.target.closest('[data-team-id]');
        if (row) setHighlight(row.dataset.teamId, type === 'mouseover' || type === 'focusin');
      });
    });
  }

  renderLeagueToggles();
  bindEvents();
  render();
  map.fitBounds(L.latLngBounds(TEAMS.map((t) => [t.location.lat, t.location.lng])), { padding: [24, 24] });
})();
