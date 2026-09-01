import { pageContracts } from "./page-contracts.mjs";

const liveOrigin = "https://nuvopilot.com";
const livePages = new Map([
  ["/", "index.html"],
  ["/apps/fridge-menu/", "apps/fridge-menu/index.html"],
  ["/apps/fridge-menu/privacy/", "apps/fridge-menu/privacy/index.html"],
  ["/apps/fridge-menu/support/", "apps/fridge-menu/support/index.html"],
  ["/apps/fridge-menu/delete-data/", "apps/fridge-menu/delete-data/index.html"],
]);
const missingPath = "/__verify-live-nonexistent-page-404-check__/";

async function fetchBody(pathname) {
  const url = new URL(pathname, liveOrigin);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    return {
      body: await response.text(),
      status: response.status,
      url: url.href,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      url: url.href,
    };
  }
}

const pageResults = await Promise.all(
  [...livePages].map(async ([pathname, contractPath]) => {
    const requiredText = pageContracts.get(contractPath);
    if (!requiredText) throw new Error(`Missing page contract: ${contractPath}`);

    const result = await fetchBody(pathname);
    if (result.error) return result;

    return {
      ...result,
      missing: requiredText.filter((expected) => !result.body.includes(expected)),
    };
  }),
);
const missingPageResult = await fetchBody(missingPath);

let failed = false;

for (const result of pageResults) {
  if (result.error) {
    console.error(`LIVE_PAGE_REQUEST_FAILED url=${result.url} error=${JSON.stringify(result.error)}`);
    failed = true;
  } else if (result.missing.length > 0) {
    console.error(`LIVE_PAGE_MISMATCH url=${result.url} status=${result.status} missing=${JSON.stringify(result.missing)}`);
    failed = true;
  } else {
    console.log(`LIVE_PAGE_OK url=${result.url} status=${result.status}`);
  }
}

if (missingPageResult.error) {
  console.error(`SOFT_404_REQUEST_FAILED url=${missingPageResult.url} error=${JSON.stringify(missingPageResult.error)}`);
  failed = true;
} else if (missingPageResult.status === 200) {
  console.error(`SOFT_404_DETECTED url=${missingPageResult.url} status=${missingPageResult.status}`);
  failed = true;
} else {
  console.log(`SOFT_404_OK url=${missingPageResult.url} status=${missingPageResult.status}`);
}

if (failed) {
  console.error("LIVE_VERIFY_FAILED");
  process.exitCode = 1;
} else {
  console.log(`LIVE_VERIFY_OK pages=${livePages.size}`);
}
