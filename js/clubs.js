/**
 * Club Teams page:
 *  - fills each [data-club-cards] list with the teams whose program and season
 *    (derived from their divisions) match the list's data attributes;
 *  - fills each [data-registration-links] list with that program's official pages.
 */
(() => {
  'use strict';

  const esc = Site.escapeHtml;

  function teamSeason(team) {
    return DIVISIONS[team.divisions[0]].season;
  }

  function clubCard(team, league) {
    const joint = Site.teamOrgs(team).length > 1 ? '<span class="badge badge--ghost-dark">OAK + BUYA</span>' : '';
    return `
      <li>
        <a class="team-card team-card--${league}" href="${Site.teamUrl(team)}">
          <span class="team-card__badges">${Site.genderBadge(team.gender)}${joint}</span>
          <span class="team-card__name">${esc(team.name)}</span>
          <span class="team-card__meta">${esc(team.ages)}</span>
        </a>
      </li>`;
  }

  document.querySelectorAll('[data-club-cards]').forEach((list) => {
    const { league, season } = list.dataset;
    list.innerHTML = Site.orgTeams(league)
      .filter((team) => teamSeason(team) === season)
      .map((team) => clubCard(team, league))
      .join('');
  });

  document.querySelectorAll('[data-registration-links]').forEach((list) => {
    list.innerHTML = LEAGUES[list.dataset.league].registration
      .map((link) => `<li><a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)} ↗</a></li>`)
      .join('');
  });
})();
