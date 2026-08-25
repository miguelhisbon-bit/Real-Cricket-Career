/*
  Real Cricket Career V9
  Compatibility file for repositories that previously had career.js.

  V9 keeps the live career engine inside game.js so the project can run
  as a simple GitHub Pages static site with no build step.

  IMPORTANT:
  - This file is intentionally not loaded by index.html.
  - You can keep your old career.js in the repository, but V9 does not
    require it for gameplay/career save data.
*/
window.RealCricketCareerV9 = {
  version: "V9",
  storageKey: "real_cricket_career_v9",
  reset() {
    try {
      localStorage.removeItem(this.storageKey);
      location.reload();
    } catch (e) {
      console.warn("Career reset unavailable", e);
    }
  }
};
