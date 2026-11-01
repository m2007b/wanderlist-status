const services = ['website', 'blog', 'trip-data', 'ai-connections'];
const historyRoot = 'https://raw.githubusercontent.com/m2007b/wanderlist-status/master/history';
const maximumAge = 20 * 60 * 1000;

export function measurementState(measurements, now = Date.now()) {
  if (measurements.length !== services.length || measurements.some(item => !Number.isFinite(item.updatedAt))) {
    return { state: 'unavailable', message: 'Monitoring data is unavailable or still being set up. Current availability is unconfirmed.' };
  }
  const oldest = Math.min(...measurements.map(item => item.updatedAt));
  if (measurements.some(item => item.updatedAt > now + 60000) || now - oldest > maximumAge) {
    return { state: 'stale', message: 'Monitoring updates are delayed. The results below may be out of date.' };
  }
  const down = measurements.filter(item => item.status === 'down').length;
  if (down) return { state: 'down', message: `${down} of 4 monitored endpoints reported a failure. See incident updates below.` };
  const degraded = measurements.filter(item => item.status === 'degraded').length;
  if (degraded) return { state: 'stale', message: `${degraded} of 4 monitored endpoints reported degraded performance.` };
  if (measurements.some(item => item.status !== 'up')) {
    return { state: 'unavailable', message: 'Some monitoring results could not be interpreted. Current availability is unconfirmed.' };
  }
  const minutes = Math.max(0, Math.floor((now - oldest) / 60000));
  return { state: 'fresh', message: `All 4 monitored endpoints passed. Oldest check: ${minutes < 1 ? 'less than a minute' : `${minutes} minutes`} ago. Checks cover the endpoints described below.` };
}

async function refresh() {
  const banner = document.getElementById('wanderlist-freshness');
  if (!banner) return;
  try {
    const measurements = await Promise.all(services.map(async slug => {
      const response = await fetch(`${historyRoot}/${slug}.yml`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('History is unavailable.');
      const text = await response.text();
      const date = text.match(/^lastUpdated:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
      return { updatedAt: Date.parse(date || ''), status: text.match(/^status:\s*(\w+)\s*$/m)?.[1] };
    }));
    const result = measurementState(measurements);
    banner.dataset.state = result.state;
    banner.textContent = result.message;
  } catch {
    const result = measurementState([]);
    banner.dataset.state = result.state;
    banner.textContent = result.message;
  }
}

if (typeof document !== 'undefined') {
  refresh();
  setInterval(refresh, 60000);
}
