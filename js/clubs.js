/**
 * Club Teams page: fills each [data-club-cards] list with the teams whose
 * league and season (derived from their divisions) match the list's data attributes.
 */
(() => {
  'use strict';

  const esc = Site.escapeHtml;

  function teamSeason(team) {
    return DIVISIONS[team.divisions[0]].season;
  }

  function clubCard(team) {
    return `
      <li>
        <a class="team-card team-card--${team.league}" href="${Site.teamUrl(team)}">
          <span class="team-card__badges">${Site.genderBadge(team.gender)}</span>
          <span class="team-card__name">${esc(team.name)}</span>
          <span class="team-card__meta">${esc(team.ages)}</span>
        </a>
      </li>`;
  }

  document.querySelectorAll('[data-club-cards]').forEach((list) => {
    const { league, season } = list.dataset;
    list.innerHTML = TEAMS
      .filter((team) => team.league === league && teamSeason(team) === season)
      .map(clubCard)
      .join('');
  });
})();
