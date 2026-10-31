/**
 * Club program page (org.html?org=buya|oak): every team in the program,
 * grouped by season, with ages front and center.
 */
(() => {
  'use strict';

  const root = document.querySelector('[data-org-root]');
  const esc = Site.escapeHtml;

  const SEASON_GROUPS = [
    { season: 'winter', title: 'Winter high school club', when: 'Tryouts in October · season November – early March' },
    { season: 'summer', title: 'Summer club (YCC)', when: 'Tryouts January – February · season June – August' },
    { season: 'fall', title: 'Fall development', when: 'September – October · no tryout' },
  ];

  function teamSeason(team) {
    return DIVISIONS[team.divisions[0]].season;
  }

  function teamCard(team, orgKey) {
    const partners = Site.teamOrgs(team).filter((key) => key !== orgKey);
    const joint = partners.length
      ? `<span class="badge badge--ghost-dark">with ${partners.map((key) => esc(LEAGUES[key].name)).join(' & ')}</span>`
      : '';
    return `
      <li>
        <a class="team-card team-card--${orgKey}" href="${Site.teamUrl(team)}">
          <span class="team-card__badges">${Site.genderBadge(team.gender)}${joint}</span>
          <span class="team-card__name">${esc(team.name)}</span>
          <span class="team-card__ages">${esc(team.ages)}</span>
          <span class="team-card__meta">${esc(DIVISIONS[team.divisions[0]].label)}</span>
        </a>
      </li>`;
  }

  function seasonSection(group, teams, orgKey) {
    if (!teams.length) return '';
    return `
      <section class="club-season" aria-labelledby="season-${group.season}">
        <header class="club-season__header">
          <div>
            <p class="eyebrow">${esc(group.when)}</p>
            <h2 id="season-${group.season}">${esc(group.title)}</h2>
          </div>
          <a class="chip chip--${group.season}" href="${SEASON_LINKS[group.season]}">How this season works</a>
        </header>
        <ul class="card-grid">${teams.map((team) => teamCard(team, orgKey)).join('')}</ul>
      </section>`;
  }

  function renderOrg(orgKey) {
    const org = LEAGUES[orgKey];
    const teams = Site.orgTeams(orgKey);
    document.title = `${org.fullName} teams · Bay Area HS Ultimate`;

    root.innerHTML = `
      <section class="hero hero--${orgKey}">
        <div class="container">
          <a class="back-link" href="index.html">← Back to map</a>
          <div class="hero__badges">${Site.leagueBadge(orgKey)}<span class="badge badge--ghost">Club program</span></div>
          <h1>${esc(org.fullName)}</h1>
          <p class="hero__lead">${esc(org.about)}</p>
        </div>
      </section>

      <div class="container team-layout">
        <div class="team-main">
          <p class="result-count">${teams.length} teams · tap a team for practice schedule, vibe and contact</p>
          ${SEASON_GROUPS.map((group) =>
            seasonSection(group, teams.filter((team) => teamSeason(team) === group.season), orgKey)).join('')}
        </div>

        <aside class="team-side">
          <section class="panel">
            <h2 class="panel__title">Main practice area</h2>
            <div id="org-map" class="team-map" role="img" aria-label="Map showing ${esc(org.spot.name)}"></div>
            <p class="location-name">📍 ${esc(org.spot.name)}</p>
            <p class="muted">${esc(org.spot.note)}</p>
          </section>

          <section class="panel">
            <h2 class="panel__title">Register &amp; try out</h2>
            <ul class="register-list">
              ${org.registration.map((link) => `<li><a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)} ↗</a></li>`).join('')}
            </ul>
          </section>

          <section class="panel panel--contact">
            <h2 class="panel__title">Contact</h2>
            ${org.contacts.map((c) => `
              <p class="muted">${esc(c.label)}</p>
              <a class="btn btn--block org-contact" href="mailto:${esc(c.email)}">✉ ${esc(c.email)}</a>`).join('')}
            <p><a class="text-link" href="${esc(org.url)}" target="_blank" rel="noopener">${esc(org.name)} website ↗</a></p>
          </section>
        </aside>
      </div>`;

    const miniMap = L.map('org-map', { scrollWheelZoom: false }).setView([org.spot.lat, org.spot.lng], 13);
    Site.addBaseLayer(miniMap);
    L.marker([org.spot.lat, org.spot.lng], {
      icon: L.divIcon({
        className: 'pin-anchor',
        html: `<span class="pin pin--club pin--org">${esc(org.name)}</span>`,
        iconSize: [58, 30],
        iconAnchor: [29, 15],
      }),
      alt: org.spot.name,
    }).addTo(miniMap);
  }

  function renderNotFound() {
    const clubs = Object.keys(LEAGUES).filter((key) => LEAGUES[key].category === 'club');
    root.innerHTML = `
      <div class="container empty-state">
        <h1>Program not found</h1>
        <p>Pick a club program:</p>
        <div class="link-buttons link-buttons--center">
          ${clubs.map((key) => `<a class="btn" href="${Site.orgUrl(key)}">${esc(LEAGUES[key].fullName)}</a>`).join('')}
        </div>
      </div>`;
  }

  const orgKey = new URLSearchParams(window.location.search).get('org');
  if (LEAGUES[orgKey]?.category === 'club') renderOrg(orgKey);
  else renderNotFound();
})();
