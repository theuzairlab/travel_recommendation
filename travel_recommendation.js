/* TravelBloom - Interactive behavior for search, results, and navigation */

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');
const resultsEl = document.getElementById('results');
const searchBtn = document.getElementById('search-btn');

const YEAR_EL = document.getElementById('year');
if (YEAR_EL) YEAR_EL.textContent = new Date().getFullYear();

// Show search bar only on home page (this file is only loaded on home)
if (searchForm) searchForm.style.display = 'flex';

let apiData = null;
let isLoading = false;

function showMessage(text){
  if (!resultsEl) return;
  clearResults();
  const p = document.createElement('p');
  p.textContent = text;
  resultsEl.appendChild(p);
}

async function loadData() {
  try {
    if (location.protocol === 'file:') {
      showMessage('Please run this site via a local server (http/https). The browser blocks fetching JSON from file://.');
      return;
    }
    isLoading = true;
    if (searchBtn) { searchBtn.disabled = true; searchBtn.textContent = 'Loading...'; }
    const res = await fetch('./travel_recommendation_api.json');
    apiData = await res.json();
    console.log('API loaded', apiData);
  } catch (err) {
    console.error('Failed to load API JSON', err);
    showMessage('Unable to load recommendations. Please refresh the page or ensure a local server is running.');
  } finally {
    isLoading = false;
    if (searchBtn) { searchBtn.disabled = false; searchBtn.textContent = 'Search'; }
  }
}

function clearResults() {
  if (!resultsEl) return;
  resultsEl.innerHTML = '';
  resultsEl.setAttribute('aria-busy', 'false');
}

function normalize(str) {
  return (str || '').toString().trim().toLowerCase();
}

function renderCards(items) {
  if (!resultsEl || !items || items.length === 0) return;
  const frag = document.createDocumentFragment();
  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    const img = document.createElement('img');
    img.src = item.imageUrl;
    img.alt = item.name;
    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h4');
    title.className = 'card-title';
    title.textContent = item.name;
    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = item.description;
    const visit = document.createElement('button');
    visit.className = 'btn btn-ghost visit';
    visit.textContent = 'Visit';
    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(visit);
    card.appendChild(img);
    card.appendChild(body);
    frag.appendChild(card);
  });
  resultsEl.appendChild(frag);
}

async function searchRecommendations(keyword) {
  if (!resultsEl) return;
  if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
    if (!isLoading) await loadData();
    if (!apiData || !apiData.length) { return; }
  }

  const root = apiData[0];
  const key = normalize(keyword);
  clearResults();
  resultsEl.setAttribute('aria-busy', 'true');

  const isBeach = /\bbeach(es)?\b/.test(key);
  const isTemple = /\btemple(s)?\b/.test(key);

  if (isBeach) {
    renderCards(root.beaches.slice(0, 2));
  } else if (isTemple) {
    renderCards(root.temples.slice(0, 2));
  } else {
    const countries = root.countries.filter(c => normalize(c.name).includes(key));
    let collected = [];
    if (countries.length) {
      countries.forEach(c => { collected = collected.concat(c.cities.slice(0, 2)); });
    } else {
      root.countries.forEach(c => {
        const cityMatches = c.cities.filter(city => normalize(city.name).includes(key));
        collected = collected.concat(cityMatches);
      });
      if (collected.length === 0) {
        showMessage('No results. Try keywords like beach, temple, or a country name (e.g., Japan).');
        resultsEl.setAttribute('aria-busy', 'false');
        return;
      }
    }
    renderCards(collected.slice(0, 2));

    try {
      const timeHost = collected[0]?.name || '';
      if (timeHost) {
        const timeEl = document.createElement('p');
        timeEl.style.margin = '8px 0 16px';
        const tzMap = { Australia: 'Australia/Sydney', Japan: 'Asia/Tokyo', Brazil: 'America/Sao_Paulo' };
        const tz = Object.entries(tzMap).find(([country]) => normalize(timeHost).includes(normalize(country)))?.[1];
        if (tz) {
          const options = { timeZone: tz, hour12: true, hour: 'numeric', minute: 'numeric', second: 'numeric' };
          const local = new Date().toLocaleTimeString('en-US', options);
          timeEl.textContent = `Local time: ${local} (${tz})`;
          resultsEl.prepend(timeEl);
        }
      }
    } catch(e) {}
  }

  resultsEl.setAttribute('aria-busy', 'false');
}

searchForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = searchInput.value;
  if (!q || !q.trim()) {
    alert('Please enter a valid search keyword.');
    return;
  }
  await searchRecommendations(q);
});

clearBtn?.addEventListener('click', () => {
  if (!searchInput) return;
  searchInput.value = '';
  clearResults();
  searchInput.focus();
});

loadData();
