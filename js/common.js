/**
 * Shared helpers used by every page: site header/footer, HTML escaping,
 * team filtering and small render helpers. Loaded after data.js.
 */
const Site = (() => {
  'use strict';

  const NAV_ITEMS = [
    { href: 'index.html', label: 'Team Map', page: 'map' },
    { href: 'team.html', label: 'Team Lookup', page: 'team' },
    { href: 'seasons.html', label: 'Seasons', page: 'seasons' },
    { href: 'clubs.html', label: 'Club Teams', page: 'clubs' },
  ];

  const LAST_CHECKED = 'October 2026';

  /** Escape a value for safe insertion into HTML text or attributes. */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function teamUrl(team) {
    return `team.html?id=${encodeURIComponent(team.id)}`;
  }

  function divisionUrl(divisionKey) {
    return SEASON_LINKS[DIVISIONS[divisionKey].season];
  }

  function orgUrl(leagueKey) {
    return `org.html?org=${encodeURIComponent(leagueKey)}`;
  }

  function findTeam(id) {
    return TEAMS.find((team) => team.id === id) ?? null;
  }

  /** Every program a team belongs to (joint teams list more than one). */
  function teamOrgs(team) {
    return team.affiliations ?? [team.league];
  }

  function orgTeams(leagueKey) {
    return TEAMS.filter((team) => teamOrgs(team).includes(leagueKey));
  }

  /**
   * @param {Team[]} teams
   * @param {{gender?: string, leagues?: Set<string>, query?: string}} filters
   */
  function filterTeams(teams, { gender = 'all', leagues, query = '' } = {}) {
    const needle = query.trim().toLowerCase();
    return teams.filter((team) => {
      if (gender !== 'all' && team.gender !== gender) return false;
      if (leagues && !teamOrgs(team).some((key) => leagues.has(key))) return false;
      if (!needle) return true;
      const haystack = [team.name, team.program, team.location.name, LEAGUES[team.league].name]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  function leagueBadge(leagueKey) {
    const league = LEAGUES[leagueKey];
    return `<span class="badge badge--${leagueKey}" title="${escapeHtml(league.fullName)}">${escapeHtml(league.name)}</span>`;
  }

  function orgBadges(team) {
    return teamOrgs(team).map(leagueBadge).join('');
  }

  function genderBadge(genderKey) {
    return `<span class="badge badge--gender">${escapeHtml(GENDERS[genderKey].label)}</span>`;
  }

  function divisionChip(divisionKey) {
    const division = DIVISIONS[divisionKey];
    return `<a class="chip chip--${division.season}" href="${divisionUrl(divisionKey)}">${escapeHtml(division.label)}</a>`;
  }

  /** Adds the shared basemap (soft light-gray base + separate label layer) to a Leaflet map. */
  function addBaseLayer(map) {
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
    const options = { maxZoom: 16, keepBuffer: 4 };
    L.tileLayer(`${esri}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      ...options,
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    }).addTo(map);
    L.tileLayer(`${esri}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, options).addTo(map);
  }

  /** Wires a group of [data-value] toggle buttons that behave like radio buttons. */
  function bindSegmented(container, onChange) {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-value]');
      if (!button) return;
      container.querySelectorAll('button[data-value]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === button));
      });
      onChange(button.dataset.value);
    });
  }

  function renderHeader() {
    const slot = document.querySelector('[data-site-header]');
    if (!slot) return;
    const current = document.body.dataset.page;
    const links = NAV_ITEMS.map(({ href, label, page }) => {
      const active = page === current ? ' aria-current="page"' : '';
      return `<li><a href="${href}"${active}>${label}</a></li>`;
    }).join('');

    slot.innerHTML = `
      <div class="site-header__inner">
        <a class="brand" href="index.html" aria-label="Bay Area HS Ultimate home">
          <span class="brand__disc" aria-hidden="true"></span>
          <span class="brand__text">Bay Area <strong>HS Ultimate</strong></span>
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="visually-hidden">Menu</span><span class="nav-toggle__bars" aria-hidden="true"></span>
        </button>
        <nav id="site-nav" class="site-nav" aria-label="Main">
          <ul>${links}</ul>
        </nav>
      </div>`;

    const toggle = slot.querySelector('.nav-toggle');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      slot.classList.toggle('is-open', !open);
    });
  }

  function renderFooter() {
    const slot = document.querySelector('[data-site-footer]');
    if (!slot) return;
    slot.innerHTML = `
      <div class="site-footer__inner">
        <p>Info gathered from
          <a href="https://bayareadisc.org/youth-leagues" target="_blank" rel="noopener">Bay Area Disc</a>,
          <a href="https://www.bayultimateyouth.org/" target="_blank" rel="noopener">Bay Ultimate Youth</a> and
          <a href="https://www.oakultimate.com/home" target="_blank" rel="noopener">Oakland Ultimate</a>.
          Last checked ${LAST_CHECKED}. Schedules change every year — always confirm with the team.</p>
        <p>Team vibe descriptions are friendly summaries, not official statements.</p>
      </div>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
  });

  return {
    escapeHtml,
    teamUrl,
    orgUrl,
    divisionUrl,
    findTeam,
    teamOrgs,
    orgTeams,
    filterTeams,
    leagueBadge,
    orgBadges,
    genderBadge,
    divisionChip,
    addBaseLayer,
    bindSegmented,
  };
})();
