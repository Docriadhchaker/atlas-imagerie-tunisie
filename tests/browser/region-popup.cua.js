// Browser regression check using the documented CUA tab client (no DOM mutation).
// Run checkSingleRegionPopup(tab) on an open atlas tab after its data has loaded.
// The original bug fails with { popups: 1, tooltips: 1 } after the React redraw.
async function checkSingleRegionPopup(tab) {
  await tab.playwright.getByRole('button', { name: 'Réinitialiser les filtres', exact: true }).click();
  await tab.playwright.getByRole('combobox', { name: 'Gouvernorat', exact: true }).selectOption({ label: 'Médenine' });
  await tab.playwright.locator('.leaflet-overlay-pane path[stroke="#143f37"]').click();
  const counts = await tab.playwright.evaluate(() => ({
    popups: document.querySelectorAll('.territory-popup').length,
    tooltips: document.querySelectorAll('.territory-tooltip').length,
  }));
  if (counts.popups !== 1 || counts.tooltips !== 0) {
    throw new Error(`Chevauchement : ${JSON.stringify(counts)} ; une seule fenêtre de région attendue.`);
  }
  return counts;
}
