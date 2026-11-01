/**
 * Seasons page: fills each [data-season-facts] list from SEASON_FACTS so every
 * season shows the same facts in the same order.
 */
(() => {
  'use strict';

  const esc = Site.escapeHtml;

  document.querySelectorAll('[data-season-facts]').forEach((list) => {
    const facts = SEASON_FACTS[list.dataset.seasonFacts];
    list.innerHTML = Object.entries(SEASON_FACT_LABELS)
      .map(([key, label]) => `<li><span class="fact-pills__label">${esc(label)}</span> ${esc(facts[key])}</li>`)
      .join('');
  });
})();
