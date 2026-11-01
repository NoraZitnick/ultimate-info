/**
 * Team Lookup page.
 *  - team.html            -> searchable directory of every team
 *  - team.html?id=<id>    -> detail page for one team
 */
(() => {
  'use strict';

  const root = document.querySelector('[data-team-root]');
  const esc = Site.escapeHtml;

  function asList(value) {
    return Array.isArray(value) ? value : [value];
  }

  /* ---------- Directory ---------- */

  function teamCard(team) {
    return `
      <li>
        <a class="team-card team-card--${Site.teamColor(team)}" href="${Site.teamUrl(team)}">
          <span class="team-card__badges">${Site.orgBadges(team)}${Site.genderBadge(team.gender)}</span>
          <span class="team-card__name">${esc(team.name)}</span>
          <span class="team-card__meta">${esc(Site.teamSeasons(team))}</span>
        </a>
      </li>`;
  }

  function renderDirectory() {
    document.title = 'Team Lookup · Bay Area HS Ultimate';
    root.innerHTML = `
      <section class="hero hero--compact">
        <div class="container">
          <p class="eyebrow">Team Lookup</p>
          <h1>Every Bay Area high school team</h1>
          <p class="hero__lead">Search by team, school or city.</p>
        </div>
      </section>
      <div class="container">
        <div class="directory-controls">
          <input class="search-input" type="search" placeholder="Search teams…" aria-label="Search teams" data-search>
          <div class="segmented" role="group" aria-label="Division" data-gender>
            <button type="button" data-value="all" aria-pressed="true">All</button>
            <button type="button" data-value="girls" aria-pressed="false">Girls</button>
            <button type="button" data-value="open" aria-pressed="false">Open</button>
            <button type="button" data-value="mixed" aria-pressed="false">Mixed</button>
          </div>
        </div>
        <p class="result-count" aria-live="polite" data-count></p>
        ${Object.keys(LEAGUES).map((key) => `
          <section class="directory-group" data-group="${key}">
            <h2 class="directory-group__title">${Site.leagueBadge(key)} ${esc(LEAGUES[key].fullName)}</h2>
            <p class="directory-group__blurb">${esc(LEAGUES[key].blurb)}
              ${LEAGUES[key].category === 'club' ? `<a class="text-link" href="${Site.orgUrl(key)}">See all ${esc(LEAGUES[key].name)} teams &amp; ages →</a>` : ''}</p>
            <ul class="card-grid" data-cards></ul>
          </section>`).join('')}
      </div>`;

    const state = { gender: 'all', query: '' };
    const search = root.querySelector('[data-search]');
    const count = root.querySelector('[data-count]');

    function update() {
      const visible = Site.filterTeams(TEAMS, state);
      count.textContent = `Showing ${visible.length} of ${TEAMS.length} teams`;
      root.querySelectorAll('[data-group]').forEach((group) => {
        const teams = visible.filter((team) => Site.teamOrgs(team).includes(group.dataset.group));
        group.hidden = teams.length === 0;
        group.querySelector('[data-cards]').innerHTML = teams.map(teamCard).join('');
      });
    }

    Site.bindSegmented(root.querySelector('[data-gender]'), (value) => {
      state.gender = value;
      update();
    });
    search.addEventListener('input', () => {
      state.query = search.value;
      update();
    });
    update();
  }

  /* ---------- Detail ---------- */

  function factRow(label, valueHtml) {
    return `<div class="fact"><dt>${label}</dt><dd>${valueHtml}</dd></div>`;
  }

  /** Club programs link to their org page; BADA links to its league site. */
  function orgLinks(team) {
    return Site.teamOrgs(team)
      .map((key) => {
        const org = LEAGUES[key];
        return org.category === 'club'
          ? `<a href="${Site.orgUrl(key)}">${esc(org.fullName)}</a>`
          : `${esc(org.fullName)} (<a href="${esc(org.url)}" target="_blank" rel="noopener">site ↗</a>)`;
      })
      .join(' &amp; ');
  }

  function leagueStatus(team) {
    const note = team.inLeague === false
      ? 'Not registered in the 2026 BADA leagues. Email the team to ask if they’re playing this season.'
      : team.leagueNote ?? 'Registered in the 2026 BADA leagues.';
    return `${Site.leagueStatusBadge(team)} <span class="muted">${esc(note)}</span>`;
  }

  function seasonList(team) {
    return team.divisions
      .map((key) => `<li>${Site.divisionChip(key)}<span class="season-when">${esc(DIVISIONS[key].when)}</span></li>`)
      .join('');
  }

  function linksHtml(team) {
    if (!team.links?.length) return '';
    return `
      <section class="panel">
        <h2 class="panel__title">Sign up &amp; links</h2>
        <div class="link-buttons">
          ${team.links.map((link) => `<a class="btn" href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)} ↗</a>`).join('')}
        </div>
      </section>`;
  }

  function renderDetail(team) {
    document.title = `${team.name} · Bay Area HS Ultimate`;
    const { location, contact } = team;
    const directions = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    const mailSubject = encodeURIComponent(`Interested in ${team.name}`);

    root.innerHTML = `
      <section class="hero hero--team hero--${Site.teamColor(team)}">
        <div class="container">
          <a class="back-link" href="team.html">← All teams</a>
          <div class="hero__badges">${Site.orgBadges(team)}${Site.genderBadge(team.gender)}<span class="badge badge--ghost">${esc(team.type)}</span></div>
          <h1>${esc(team.name)}</h1>
          <p class="hero__lead">${esc(team.program)}</p>
        </div>
      </section>

      <div class="container team-layout">
        <div class="team-main">
          <section class="panel">
            <h2 class="panel__title">About</h2>
            <p class="vibe">${esc(team.vibe)}</p>
            ${team.squads ? `<p class="muted"><strong>Squads:</strong> ${esc(team.squads)}</p>` : ''}
          </section>

          <section class="panel">
            <h2 class="panel__title">Division &amp; season</h2>
            <p class="muted">Click a division to see that season.</p>
            <ul class="season-list">${seasonList(team)}</ul>
          </section>

          <section class="panel">
            <h2 class="panel__title">Practice schedule</h2>
            <ul class="check-list">${asList(team.practice).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          </section>

          ${linksHtml(team)}
        </div>

        <aside class="team-side">
          <section class="panel">
            <h2 class="panel__title">Where they meet</h2>
            <div id="team-map" class="team-map" role="img" aria-label="Map showing ${esc(location.name)}"></div>
            <p class="location-name">📍 ${esc(location.name)}</p>
            ${location.note ? `<p class="muted">${esc(location.note)}</p>` : ''}
            <a class="text-link" href="${directions}" target="_blank" rel="noopener">Open in Google Maps ↗</a>
          </section>

          <section class="panel">
            <h2 class="panel__title">Quick facts</h2>
            <dl class="facts">
              ${factRow('Division', esc(GENDERS[team.gender].label) + ` <span class="muted">(${esc(GENDERS[team.gender].note)})</span>`)}
              ${factRow('Type', esc(team.type))}
              ${factRow('Ages', esc(team.ages))}
              ${factRow(LEAGUES[team.league].category === 'club' ? 'Program' : 'League', orgLinks(team))}
              ${LEAGUES[team.league].category === 'school' ? factRow('League status', leagueStatus(team)) : ''}
              ${team.joining ? factRow('Who can join', esc(team.joining)) : ''}
            </dl>
          </section>

          <section class="panel panel--contact">
            <h2 class="panel__title">Contact</h2>
            ${contact.name ? `<p><strong>${esc(contact.name)}</strong></p>` : ''}
            <a class="btn btn--block" href="mailto:${esc(contact.email)}?subject=${mailSubject}">✉ ${esc(contact.email)}</a>
            ${contact.coaches ? `<p class="muted">Coaches: ${esc(contact.coaches)}</p>` : ''}
          </section>
        </aside>
      </div>`;

    const miniMap = L.map('team-map', { scrollWheelZoom: false, attributionControl: true })
      .setView([location.lat, location.lng], 14);
    Site.addBaseLayer(miniMap);
    L.marker([location.lat, location.lng], {
      icon: L.divIcon({
        className: 'pin-anchor',
        html: `<span class="pin pin--${LEAGUES[team.league].category === 'club' ? Site.teamColor(team) : Site.schoolStatus(team)}">${GENDERS[team.gender].short}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
      alt: location.name,
    }).addTo(miniMap);
  }

  function renderNotFound(id) {
    root.innerHTML = `
      <div class="container empty-state">
        <h1>Team not found</h1>
        <p>We couldn’t find a team called “${esc(id)}”.</p>
        <a class="btn" href="team.html">Browse all teams</a>
      </div>`;
  }

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) renderDirectory();
  else {
    const team = Site.findTeam(id);
    if (team) renderDetail(team);
    else renderNotFound(id);
  }
})();
