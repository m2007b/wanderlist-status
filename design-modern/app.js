import { lucideIcon } from './lucide-icons.js';
const PREVIEW = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const REPOSITORY = 'm2007b/wanderlist-status';
const RAW = `https://raw.githubusercontent.com/${REPOSITORY}/master`;
const DAY = 86400000;
const slugs = ['website', 'blog', 'trip-data', 'ai-connections'];
const $ = selector => document.querySelector(selector);
let data;
let range = 90;
let view = 'uptime';
let nextRefresh = Date.now() + 60000;
let calendarMonth = new Date();

function utcDay(value) { return new Date(value).toISOString().slice(0, 10); }
function formatDate(value) { return new Date(value).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
function stateLabel(state) { return ({ up: 'Operational', down: 'Disruption', degraded: 'Degraded', unknown: 'Unconfirmed' })[state] || 'Unconfirmed'; }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function referenceTime() { return PREVIEW ? Date.parse(data.capturedAt) : Date.now(); }
const historyTooltip = element('div', 'history-tooltip');
historyTooltip.id = 'history-tooltip';
historyTooltip.setAttribute('role', 'tooltip');
historyTooltip.hidden = true;
document.body.append(historyTooltip);
let activeHistoryBar;
function hideHistoryTooltip() {
  activeHistoryBar?.removeAttribute('aria-describedby');
  activeHistoryBar = null;
  historyTooltip.hidden = true;
}
function showHistoryTooltip(bar) {
  hideHistoryTooltip();
  activeHistoryBar = bar;
  historyTooltip.dataset.state = bar.dataset.state;
  historyTooltip.replaceChildren(element('strong', 'history-tooltip-date', bar.dataset.dateLabel), element('span', 'history-tooltip-status', bar.dataset.statusLabel), element('span', 'history-tooltip-note', bar.dataset.note));
  historyTooltip.hidden = false;
  bar.setAttribute('aria-describedby', historyTooltip.id);
  const anchor = bar.getBoundingClientRect();
  const box = historyTooltip.getBoundingClientRect();
  const left = Math.max(12, Math.min(innerWidth - box.width - 12, anchor.left + anchor.width / 2 - box.width / 2));
  const top = anchor.top - box.height - 12 >= 12 ? anchor.top - box.height - 12 : anchor.bottom + 12;
  historyTooltip.style.left = left + 'px';
  historyTooltip.style.top = Math.max(12, Math.min(innerHeight - box.height - 12, top)) + 'px';
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideHistoryTooltip(); });
document.addEventListener('pointerdown', event => { if (!event.target.closest('.bar')) hideHistoryTooltip(); });
window.addEventListener('scroll', hideHistoryTooltip, true);
window.addEventListener('resize', hideHistoryTooltip);
function currentState(service) {
  const stamp = Date.parse(service.lastChecked || service.lastUpdated);
  if (!Number.isFinite(stamp) || referenceTime() - stamp > 20 * 60000 || stamp > referenceTime() + 60000) return 'unknown';
  return ['up', 'down', 'degraded'].includes(service.currentStatus) ? service.currentStatus : 'unknown';
}
function dailyState(service, date) {
  const start = Date.parse(service.startTime);
  const end = Date.parse(service.lastUpdated);
  if (!Number.isFinite(start) || !Number.isFinite(end) || date < utcDay(start) || date > utcDay(end)) return 'unknown';
  const minutes = Number(service.dailyMinutesDown?.[date] || 0);
  if (minutes >= 1440) return 'down';
  if (minutes > 0) return 'degraded';
  if (date === utcDay(end)) return currentState(service);
  return 'up';
}
function percentage(service, days) {
  const key = days === 1 ? 'uptimeDay' : days === 7 ? 'uptimeWeek' : days === 30 ? 'uptimeMonth' : null;
  if (key) return Number.parseFloat(service[key]);
  const end = Date.parse(service.lastUpdated);
  const start = Math.max(Date.parse(service.startTime), end - days * DAY);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return Number.parseFloat(service.uptime);
  let downMinutes = 0;
  for (const [date, minutes] of Object.entries(service.dailyMinutesDown || {})) {
    if (Date.parse(date) + DAY > start && Date.parse(date) <= end) downMinutes += Number(minutes) || 0;
  }
  return Math.max(0, Math.min(100, 100 * (1 - downMinutes / ((end - start) / 60000))));
}
function renderOverall() {
  const states = data.services.map(currentState);
  const state = states.includes('down') ? 'down' : states.includes('unknown') ? 'unknown' : states.includes('degraded') ? 'degraded' : 'up';
  $('.overall').dataset.state = state;
  const label = $('#overall-label'); label.replaceChildren();
  if (state === 'up') label.append('All systems ', element('strong', '', 'operational.'));
  else if (state === 'down') label.append('A bump in ', element('strong', '', 'the road.'));
  else if (state === 'degraded') label.append('Taking it ', element('strong', '', 'slow.'));
  else label.append('Checking ', element('strong', '', 'in.'));
  $('#health-label').textContent = state === 'up' ? 'All systems online' : state === 'down' ? 'Service disruption' : state === 'degraded' ? 'Degraded performance' : 'Monitoring results delayed';
  $('#hero-description').textContent = state === 'up' ? 'Everything behind your next adventure is running smoothly.' : state === 'down' ? 'Some services are experiencing issues. Follow the incident journal below for updates.' : state === 'degraded' ? 'Some services are responding slowly. Find the latest details below.' : 'The latest checks are delayed. Current availability is unconfirmed.';
  $('#online-count').replaceChildren(document.createTextNode(String(states.filter(x => x === 'up').length)), element('span', '', '/ 4'));
  document.querySelectorAll('.service-signals i').forEach((node,i)=>{node.style.background=states[i]==='up'?'#73b19b':states[i]==='down'?'#dc7d8b':'#c9cfd9';});
}
function renderServices() {
  hideHistoryTooltip();
  const container = $('#services'); container.replaceChildren();
  $('#range-label').textContent = 'Past ' + range + ' days';
  $('#range-start').textContent = range + ' days ago';
  const names = {website:'Website',blog:'Travel blog','trip-data':'Trip planning','ai-connections':'AI connections'};
  const captions = {website:'The start of every adventure',blog:'Stories, guides & inspiration','trip-data':'Your itineraries, connected','ai-connections':'Wanderlist, wherever you ask'};
  const icons = {website:'globe-2',blog:'file-text','trip-data':'route','ai-connections':'sparkles'};
  data.services.forEach(service => {
    const state = currentState(service);
    const row = element('article', 'service'); row.dataset.slug = service.slug;
    const line = element('div', 'service-line');
    const icon = element('span', 'service-icon');
    icon.innerHTML = lucideIcon(icons[service.slug]);
    const copy = element('div', 'service-copy');
    const link = element('a', 'service-name', names[service.slug] || service.name); link.href = service.url; link.target = '_blank'; link.rel = 'noopener';
    copy.append(link,element('span','service-caption',captions[service.slug]));
    const numbers=element('div','service-numbers');
    const value=percentage(service,range);
    numbers.append(element('span','percentage',Number.isFinite(value)?(value===100?'100%':value.toFixed(3)+'%'):'No data'),element('span','latency',(service.timeDay??service.time??'—')+' ms avg.'));
    const badge=element('span','service-state '+state);badge.append(element('i'),document.createTextNode(stateLabel(state)));
    line.append(icon,copy,numbers,badge);row.append(line);
    if(view==='uptime'){
      const bars=element('div','bars');bars.style.gridTemplateColumns='repeat('+range+',minmax(0,1fr))';bars.setAttribute('role','group');bars.setAttribute('aria-label',service.name+', '+range+' days of history. Use arrow keys to explore dates.');
      const today=Date.parse(utcDay(referenceTime())+'T00:00:00Z');
      for(let i=range-1;i>=0;i--){
        const date=utcDay(today-i*DAY);const state=dailyState(service,date);const bar=element('span','bar '+state);
        const minutes=Number(service.dailyMinutesDown?.[date] || 0);
        const status=state==='unknown'?'No confirmed data':state==='up'?'No downtime recorded':state==='down'?'Service unavailable':'Partial downtime';
        bar.dataset.state=state;bar.dataset.dateLabel=formatDate(date);bar.dataset.statusLabel=status;
        bar.dataset.note=state==='unknown'?'No measurements available · UTC':minutes>0?`${minutes} min of recorded downtime · UTC`:'Daily monitoring history · UTC';
        bar.tabIndex=i===0?0:-1;bar.setAttribute('role','button');bar.setAttribute('aria-label',`${formatDate(date)}: ${status}`);
        bar.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')showHistoryTooltip(bar);});
        bar.addEventListener('pointerleave',()=>{if(document.activeElement!==bar)hideHistoryTooltip();});
        bar.addEventListener('focus',()=>showHistoryTooltip(bar));bar.addEventListener('blur',hideHistoryTooltip);
        bar.addEventListener('click',()=>showHistoryTooltip(bar));
        bar.addEventListener('keydown',event=>{
          let next;
          if(event.key==='ArrowLeft')next=bar.previousElementSibling;
          else if(event.key==='ArrowRight')next=bar.nextElementSibling;
          else if(event.key==='Home')next=bars.firstElementChild;
          else if(event.key==='End')next=bars.lastElementChild;
          else if(event.key==='Enter'||event.key===' '){event.preventDefault();showHistoryTooltip(bar);}
          if(next){event.preventDefault();bars.querySelector('[tabindex="0"]')?.setAttribute('tabindex','-1');next.tabIndex=0;next.focus();}
        });
        bars.append(bar);
      }
      const scale=element('div','history-scale');scale.append(element('span','',range+' days ago'),element('span','','Today'));
      row.append(bars,scale);
    }else{
      const latency=range===7?service.timeWeek:range===30?service.timeMonth:service.time;
      const line=element('div','performance-line');line.append(element('span','','Average response time'),element('strong','',(latency??'?')+' ms'));
      const track=element('div','latency-track');const fill=element('span');fill.style.width=Math.min(100,Math.max(1,(latency||0)/3000*100))+'%';track.append(fill);row.append(line,track);
    }
    const details=element('details','service-details');
    const description={website:'Public website availability, checked against the expected page content.',blog:'Published blog posts and the underlying database read.','trip-data':'Public trip templates and the underlying database read.','ai-connections':'AI connection discovery. This does not test AI trip generation or a complete sign-in.'}[service.slug];
    const detailSummary=element('summary','','What we monitor');detailSummary.insertAdjacentHTML('afterbegin',lucideIcon('chevron-down'));
    details.append(detailSummary,element('p','',description),element('p','','Latest measurement: '+formatDate(service.lastUpdated)+'.'));
    row.append(details);container.append(row);
  });
}
function renderMetrics() {
  $('#metrics').replaceChildren();
  for (const days of [1, 7, 30, 90]) {
    const values = data.services.map(service => percentage(service, days));
    const mean = values.every(Number.isFinite) ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
    const metric = element('div', 'metric');
    metric.append(element('strong', '', Number.isFinite(mean) ? (mean===100?'100%':`${mean.toFixed(3)}%`) : '—'), element('span', '', days === 1 ? 'Last 24 hours' : `Last ${days} days`));
    $('#metrics').append(metric);
  }
  const earliest = Math.min(...data.services.map(service => Date.parse(service.startTime)));
  $('#measurement-note').textContent = `Average across monitored services · available measurements since ${formatDate(earliest)}.`;
}
function renderIncidents() {
  const updates = $('#updates'); updates.replaceChildren();
  if (!Array.isArray(data.incidents)) {
    updates.append(element('p', 'empty', 'Status updates could not be loaded. Please check the incident history.'));
    return;
  }
  const incidents = data.incidents.filter(item => referenceTime() - Date.parse(item.created_at) <= 30 * DAY);
  if (!incidents.length) {
    const wrap=element('div','incident-empty');const check=element('span','incident-check');check.innerHTML=lucideIcon('circle-check');check.setAttribute('aria-hidden','true');
    const copy=element('p','empty');copy.append(element('strong','','No incidents reported.'),element('span','','No status updates in the past 30 days.'));wrap.append(check,copy);updates.append(wrap);return;
  }
  const list = element('div', 'incident-list');
  for (const incident of incidents) {
    const item = element('article', 'incident');
    const link = element('a', '', incident.title); link.href = incident.html_url;
    const time = element('time', '', `${formatDate(incident.created_at)} · ${incident.state === 'closed' ? 'Resolved' : 'Investigating'}`);
    time.dateTime = incident.created_at;
    item.append(link, time); list.append(item);
  }
  updates.append(list);
}
function renderCalendar() {
  if (!data) return;
  const service = data.services.find(item => item.slug === $('#calendar-service').value) || data.services[0];
  const year = calendarMonth.getUTCFullYear(); const month = calendarMonth.getUTCMonth();
  $('#month-label').textContent = calendarMonth.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const grid = $('#calendar-days'); grid.replaceChildren();
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  for (let i = 0; i < offset; i++) grid.append(element('span'));
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let day = 1; day <= count; day++) {
    const stamp = Date.UTC(year, month, day);
    const date = utcDay(stamp);
    const state = date > utcDay(referenceTime()) ? 'future' : dailyState(service, date);
    const cell = element('span', `calendar-day ${state}`, day);
    cell.title = `${date}: ${state === 'unknown' ? 'No data' : stateLabel(state)}`;
    grid.append(cell);
  }
}
async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Could not retrieve monitoring data (${response.status}).`);
  return response.json();
}
async function load() {
  try {
    if (PREVIEW) data = await getJson('data.json');
    else {
      const [services, ...history] = await Promise.all([getJson(`${RAW}/history/summary.json`), ...slugs.map(async slug => {
        const response = await fetch(`${RAW}/history/${slug}.yml`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('Monitoring history unavailable.');
        return response.text();
      })]);
      services.forEach(service => {
        const text = history[slugs.indexOf(service.slug)] || '';
        const read = key => text.split(/\r?\n/).find(line => line.startsWith(key + ':'))?.slice(key.length + 1).trim().replace(/^["']|["']$/g, '');
        service.startTime = read('startTime'); service.lastUpdated = read('lastUpdated'); service.currentStatus = read('status');
      });
      // Read the public snapshot saved after Uptime CI, without visitor API calls.
      let incidents = null;
      try {
        const live = await getJson(`${RAW}/status-live.json`);
        const checkedAt = Date.parse(live.checkedAt);
        if (live.conclusion === 'success' && Number.isFinite(checkedAt) && checkedAt <= Date.now() + 60000) {
          services.forEach(service => {
            const checked = live.services?.find(item => item.slug === service.slug);
            if (checked && ['up', 'down', 'degraded'].includes(checked.status) && checkedAt >= Date.parse(service.lastUpdated)) {
              service.currentStatus = checked.status;
              service.lastChecked = live.checkedAt;
            }
          });
          incidents = Array.isArray(live.incidents) ? live.incidents : null;
        }
      } catch { /* Keep the conservative history-based freshness fallback. */ }
      data = { capturedAt: new Date().toISOString(), services, incidents };
    }
    if (!Array.isArray(data.services) || data.services.length !== 4) throw new Error('Incomplete monitoring data.');
    calendarMonth = new Date(referenceTime());
    renderOverall(); renderServices(); renderMetrics(); renderIncidents();
    $('#calendar-service').replaceChildren(...data.services.map(service => { const option = element('option', '', service.name); option.value = service.slug; return option; }));
    renderCalendar(); nextRefresh = Date.now() + 60000; updateClock();
  } catch {
    $('.overall').dataset.state = 'unknown';
    $('#overall-label').textContent = 'Monitoring data unavailable';
    $('#health-label').textContent = 'Monitoring unavailable';
    $('#hero-description').textContent = 'The latest monitoring results could not be retrieved. Current service availability is unconfirmed.';
    $('#online-count').replaceChildren(document.createTextNode('—'), element('span', '', '/ 4'));
    document.querySelectorAll('.service-signals i').forEach(node=>{node.style.background='#c9cfd9';});
    $('#updated').textContent = 'Unable to retrieve the latest measurements';
    if (data) { data.services.forEach(service => { service.lastUpdated = ''; service.lastChecked = ''; }); renderServices(); }
    else {
      $('#services').replaceChildren(element('p', 'empty', 'Please try again shortly. Current service availability is unconfirmed.'));
      $('#updates').replaceChildren(element('p', 'empty', 'Status updates could not be loaded.'));
    }
  }
}
function updateClock() {
  if (!data) return;
  const oldest = Math.min(...data.services.map(service => Date.parse(service.lastChecked || service.lastUpdated)));
  if (!Number.isFinite(oldest)) return;
  const time = new Date(oldest).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  $('#updated').textContent = PREVIEW ? `Snapshot · ${time}` : `Checked ${time} · refresh in ${Math.max(0, Math.ceil((nextRefresh - Date.now()) / 1000))}s`;
}
document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => {
  range = Number(button.dataset.days);
  document.querySelectorAll('[data-days]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  if (data) renderServices();
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  if (data) renderServices();
}));
$('#open-calendar').addEventListener('click', () => { if (data) { renderCalendar(); $('#calendar').showModal(); } });
$('#close-calendar').addEventListener('click', () => $('#calendar').close());
$('#calendar-service').addEventListener('change', renderCalendar);
$('#previous-month').addEventListener('click', () => { calendarMonth = new Date(Date.UTC(calendarMonth.getUTCFullYear(), calendarMonth.getUTCMonth() - 1, 1)); renderCalendar(); });
$('#next-month').addEventListener('click', () => { calendarMonth = new Date(Date.UTC(calendarMonth.getUTCFullYear(), calendarMonth.getUTCMonth() + 1, 1)); renderCalendar(); });
document.querySelectorAll('[data-lucide]').forEach(node=>{node.innerHTML=lucideIcon(node.dataset.lucide);});
$('#preview-note').hidden = !PREVIEW;
load();
if (!PREVIEW) setInterval(load, 60000);
setInterval(updateClock, 1000);
