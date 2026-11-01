/**
 * Shared helpers used by every page: site header/footer, HTML escaping,
 * team filtering and small render helpers. Loaded after data.js.
 */
const Site = (() => {
  'use strict';

  const NAV_ITEMS = [
    { href: 'index.html', label: 'Home', page: 'home' },
    { href: 'map.html', label: 'Team Map', page: 'map' },
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

  /** High school teams: 'school' if registered in a 2026 BADA league, otherwise 'inactive'. */
  function schoolStatus(team) {
    return team.inLeague === false ? 'inactive' : 'school';
  }

  function leagueStatusBadge(team) {
    return schoolStatus(team) === 'inactive'
      ? '<span class="badge badge--inactive">Non-league</span>'
      : '<span class="badge badge--school">League</span>';
  }

  /** Color key for a team: 'joint' for shared teams, 'inactive' for non-league BADA teams, else its league. */
  function teamColor(team) {
    if (teamOrgs(team).length > 1) return 'joint';
    if (team.inLeague === false) return 'inactive';
    return team.league;
  }

  const SEASON_ORDER = ['fall', 'winter', 'spring', 'summer'];

  /** The seasons a team plays, in calendar order, e.g. "Fall · Spring". */
  function teamSeasons(team) {
    const seasons = new Set(team.divisions.map((key) => DIVISIONS[key].season));
    return SEASON_ORDER.filter((season) => seasons.has(season))
      .map((season) => season[0].toUpperCase() + season.slice(1))
      .join(' · ');
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

  /** Club teams show their program(s); high school teams show League / Non-league. */
  function orgBadges(team) {
    if (LEAGUES[team.league].category === 'school') return leagueStatusBadge(team);
    return teamOrgs(team).map(leagueBadge).join('');
  }

  function genderBadge(genderKey) {
    return `<span class="badge badge--gender">${escapeHtml(GENDERS[genderKey].label)}</span>`;
  }

  function divisionChip(divisionKey) {
    const division = DIVISIONS[divisionKey];
    return `<a class="chip chip--${division.season}" href="${divisionUrl(divisionKey)}">${escapeHtml(division.label)}</a>`;
  }

  /**
   * Adds the shared basemap: a colored street map. On high-DPI screens Leaflet
   * loads the next zoom level's tiles at half size, so roads and labels stay sharp.
   */
  function addBaseLayer(map) {
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      detectRetina: true,
      keepBuffer: 4,
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    }).addTo(map);
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
          Last checked ${LAST_CHECKED}. Schedules change every year, so check with the team.</p>
        <p>Team descriptions are our own summaries.</p>
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
    schoolStatus,
    teamColor,
    teamSeasons,
    leagueStatusBadge,
    filterTeams,
    leagueBadge,
    orgBadges,
    genderBadge,
    divisionChip,
    addBaseLayer,
    bindSegmented,
  };
})();
