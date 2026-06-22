// ============================================================
// IMDB Watch History → GitHub Actions (updated selectors)
// Paste this in DevTools console on your IMDB watch history page
// ============================================================

const GITHUB_TOKEN  = "ghp_YOUR_TOKEN_HERE";
const GITHUB_OWNER  = "your-username";
const GITHUB_REPO   = "your-repo";
const WORKFLOW_ID   = "imdb-sync.yml";
const GITHUB_BRANCH = "main";

function scrapeWatchHistory() {
  const items = [];

  // Each movie card is a .dli-parent container
  const cards = document.querySelectorAll(".dli-parent");

  cards.forEach((card) => {
    try {
      // Title
      const titleEl = card.querySelector(".ipc-title__text");
      const title = titleEl?.textContent?.trim() || null;

      // IMDB ID + link
      const linkEl = card.querySelector("a.ipc-lockup-overlay[href*='/title/']");
      const href = linkEl?.getAttribute("href") || "";
      const imdbId = href.match(/tt\d+/)?.[0] || null;

      // Metadata: year, runtime, rating
      const metaItems = card.querySelectorAll(".dli-title-metadata .ipc-inline-list__item");
      const year    = metaItems[0]?.textContent?.trim() || null;
      const runtime = metaItems[1]?.textContent?.trim() || null;
      const ageRating = metaItems[2]?.textContent?.trim() || null;

      // IMDB rating
      const ratingEl = card.querySelector("[data-testid='ratingGroup--imdb-rating'] .ipc-rating-star--rating");
      const imdbRating = ratingEl?.textContent?.trim() || null;

      // Poster image
      const imgEl = card.querySelector(".ipc-poster__poster-image img");
      const poster = imgEl?.src || null;

      // Director
      const directorEl = card.querySelector(".sc-35f5f4fb-3 + .title-description-credit a");
      const director = directorEl?.textContent?.trim() || null;

      // Stars
      const starEls = card.querySelectorAll(".title-description-credit a");
      const stars = Array.from(starEls).map(a => a.textContent.trim());

      // Plot
      const plotEl = card.querySelector(".ipc-html-content-inner-div");
      const plot = plotEl?.textContent?.trim() || null;

      if (title || imdbId) {
        items.push({ imdbId, title, year, runtime, ageRating, imdbRating, director, stars, plot, poster });
      }
    } catch (e) {
      console.warn("Skipped a card:", e);
    }
  });

  return items;
}

async function sendToGitHub(items) {
  const payload = {
    scrapedAt: new Date().toISOString(),
    pageUrl: location.href,
    itemCount: items.length,
    items,
  };

  console.log(`📦 Scraped ${items.length} items. Sending to GitHub...`);

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: GITHUB_BRANCH,
        inputs: { payload: JSON.stringify(payload) },
      }),
    }
  );

  if (response.status === 204) {
    console.log("✅ Workflow triggered!");
    console.log(`👉 https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`);
  } else {
    const err = await response.json().catch(() => ({}));
    console.error("❌ Failed:", response.status, err);
  }
}

(async () => {
  const items = scrapeWatchHistory();

  if (items.length === 0) {
    console.warn("⚠️ No items found.");
    return;
  }

  console.log(`✅ Found ${items.length} items:`);
  console.table(items.map(i => ({ title: i.title, year: i.year, imdbId: i.imdbId })));
  await sendToGitHub(items);
})();
