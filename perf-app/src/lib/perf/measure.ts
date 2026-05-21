/**
 * Pojedynczy run pomiarowy:
 *   - launch Chrome (headless)
 *   - aplikuj throttling
 *   - inject observers
 *   - nawiguj, czekaj, zbierz dane
 *   - zwróć Sample
 */
import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';
import { installObserversInPage, collectFromPage } from './observers.js';
import type { Profile, Sample } from './types.js';

let cachedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.connected) return cachedBrowser;
  cachedBrowser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  return cachedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (cachedBrowser) {
    try {
      await cachedBrowser.close();
    } catch {
      /* ignore */
    }
    cachedBrowser = null;
  }
}

/**
 * Pojedynczy pomiar URL z danym profilem.
 */
export async function runSingleMeasurement(
  url: string,
  profile: Profile,
): Promise<Sample> {
  const startedAt = Date.now();
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(profile.userAgent);
    await page.setViewport({
      width: profile.viewport.width,
      height: profile.viewport.height,
      deviceScaleFactor: profile.viewport.deviceScaleFactor,
      isMobile: profile.viewport.isMobile,
      hasTouch: profile.viewport.hasTouch,
    });

    const client = await page.createCDPSession();

    // CPU throttling
    if (profile.cpuThrottle > 1) {
      await client.send('Emulation.setCPUThrottlingRate', {
        rate: profile.cpuThrottle,
      });
    }

    // Network throttling (gdy ustawiony)
    if (profile.network.downloadThroughput > 0) {
      await client.send('Network.emulateNetworkConditions', profile.network);
    }

    // Czysty start
    await client.send('Network.clearBrowserCache');
    await client.send('Network.clearBrowserCookies');

    // Inject observers przed nawigacją - kluczowe dla LCP/CLS buffered:true
    await page.evaluateOnNewDocument(installObserversInPage);

    // Nawiguj i zbierz response headers głównego dokumentu
    const responseHeaders: Record<string, string> = {};
    page.on('response', (response) => {
      if (response.url() === url || response.url() === url + '/') {
        const h = response.headers();
        for (const [k, v] of Object.entries(h)) {
          responseHeaders[k.toLowerCase()] = v;
        }
      }
    });

    const navResponse = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Final URL po redirectach
    const finalUrl = page.url();
    const httpStatus = navResponse?.status() ?? 0;

    // Jeśli nie złapaliśmy headers w listenerze (np. cache) - bierzemy z response
    if (Object.keys(responseHeaders).length === 0 && navResponse) {
      for (const [k, v] of Object.entries(navResponse.headers())) {
        responseHeaders[k.toLowerCase()] = v;
      }
    }

    // Daj observers czas dokończyć (LCP czeka aż user wchodzi w stronę)
    await new Promise((r) => setTimeout(r, 2000));

    // Wyciągnij wszystko ze strony
    const collected = await page.evaluate(collectFromPage);

    const perf = collected.perf;
    const nav = collected.navigation;
    const fcp = perf?.fcp ?? 0;

    // TBT* (proxy) = suma (duration - 50) dla long tasks po FCP
    const longTasks = (perf?.longTasks ?? []) as Array<{
      startTime: number;
      duration: number;
    }>;
    const tbtProxy = longTasks.reduce((sum, t) => {
      if (t.startTime < fcp) return sum;
      return sum + Math.max(0, t.duration - 50);
    }, 0);

    return {
      url,
      finalUrl,
      httpStatus,
      lcp: perf?.lcp ?? 0,
      cls: perf?.cls ?? 0,
      fcp,
      ttfb: nav?.ttfb ?? 0,
      tbtProxy,
      longTasksCount: longTasks.length,
      longTasksTotalMs: longTasks.reduce((s, t) => s + t.duration, 0),
      domContentLoaded: nav?.domContentLoaded ?? 0,
      loadComplete: nav?.loadComplete ?? 0,
      transferSize: nav?.transferSize ?? 0,
      decodedBodySize: nav?.decodedBodySize ?? 0,
      resourcesCount: collected.resources.length,
      resources: collected.resources.slice(0, 200), // cap
      lcpElement: perf?.lcpElement ?? undefined,
      responseHeaders,
      runDurationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await page.close();
  }
}
