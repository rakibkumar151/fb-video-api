/* ================================================================
   VidSnap – App Logic  |  API: videoapi-c4eq.onrender.com
   ================================================================ */

const API_DIRECT = 'https://videoapi-c4eq.onrender.com/get_video?url=';
// CORS proxy fallback — used if browser blocks the direct call
const CORS_PROXY  = 'https://corsproxy.io/?url=';
const API_BASE_PROXIED = CORS_PROXY + encodeURIComponent('https://videoapi-c4eq.onrender.com/get_video?url=');

// ── DOM refs ──────────────────────────────────────────────────────
const urlInput    = document.getElementById('videoUrl');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn    = document.getElementById('clearBtn');
const resultArea  = document.getElementById('resultArea');
const errorArea   = document.getElementById('errorArea');
const errorMsg    = document.getElementById('errorMsg');

// ── Clear btn toggle ───────────────────────────────────────────────
urlInput.addEventListener('input', () => {
  clearBtn.style.display = urlInput.value ? 'flex' : 'none';
});
clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.style.display = 'none';
  urlInput.focus();
});
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchVideo(); });

// ── Try a fetch and return parsed JSON ─────────────────────────────
async function tryFetch(apiUrl) {
  const res = await fetch(apiUrl, { method: 'GET', mode: 'cors' });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.error || data.message || `Server error ${res.status}`);
  }
  return data;
}

// ── Main fetch — tries direct first, then CORS proxy ──────────────
async function fetchVideo() {

  const rawUrl = urlInput.value.trim();
  if (!rawUrl) { shakeInput(); return; }
  if (!isValidUrl(rawUrl)) { showError('Please enter a valid URL (https://…)'); return; }

  setLoading(true);
  hideAll();

  const encodedUrl = encodeURIComponent(rawUrl);

  try {
    let data;

    // 1️⃣ Try direct call first (works when API has CORS headers)
    try {
      data = await tryFetch(API_DIRECT + encodedUrl);
    } catch (directErr) {
      // 2️⃣ Fallback: route through CORS proxy
      console.warn('[VidSnap] Direct CORS blocked, using proxy…', directErr.message);
      const proxyUrl = CORS_PROXY + encodeURIComponent(API_DIRECT + encodedUrl);
      data = await tryFetch(proxyUrl);
    }

    renderResult(data);

  } catch (err) {
    console.error('[VidSnap]', err);
    showError('আপনার ইন্টারনেট কানেকশন চেক করুন এবং আবার চেষ্টা করুন। Error: ' + err.message);
  } finally {
    setLoading(false);
  }
}

// ── Render result from formats_list ───────────────────────────────
function renderResult(data) {
  const formats = data.formats_list || [];
  if (!formats.length) { showError('No downloadable formats found for this URL.'); return; }

  const title    = data.title    || 'Untitled Video';
  const platform = data.platform || 'Unknown';

  // Separate video (with merge_url) vs audio-only
  const videoFormats = formats.filter(f =>
    f.format_type && !f.format_type.toLowerCase().includes('audio only') && f.merge_url
  );
  const audioFormats = formats.filter(f =>
    f.format_type && f.format_type.toLowerCase().includes('audio only') && f.direct_url
  );

  // De-duplicate by resolution — keep highest sl per resolution
  const seen = new Map();
  videoFormats.forEach(f => {
    const key = f.resolution;
    if (!seen.has(key)) seen.set(key, f);
  });
  const uniqueVideo = Array.from(seen.values()).slice(0, 5); // max 5 quality options

  // Build quality cards HTML
  const qualityCards = uniqueVideo.map((f, i) => `
    <div class="quality-card ${i === 0 ? 'quality-best' : ''}">
      <div class="qc-left">
        ${i === 0 ? '<span class="qc-badge">⭐ Best</span>' : ''}
        <div class="qc-res">${f.resolution}</div>
        <div class="qc-meta">
          <span class="qc-ext">${(f.extension || 'mp4').toUpperCase()}</span>
          <span class="qc-size">📦 ${f.size || 'N/A'}</span>
          <span class="qc-type">🎬 With Audio</span>
        </div>
      </div>
      <a class="btn-action btn-primary qc-dl"
         href="${f.merge_url}"
         target="_blank"
         rel="noopener"
         onclick="trackDownload('${f.resolution}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </a>
    </div>
  `).join('');

  const audioCard = audioFormats.length ? `
    <div class="quality-card quality-audio">
      <div class="qc-left">
        <div class="qc-res">🎵 Audio Only</div>
        <div class="qc-meta">
          <span class="qc-ext">${(audioFormats[0].extension || 'm4a').toUpperCase()}</span>
          <span class="qc-size">📦 ${audioFormats[0].size || 'N/A'}</span>
        </div>
      </div>
      <a class="btn-action btn-ghost qc-dl"
         href="${audioFormats[0].direct_url}"
         target="_blank"
         rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </a>
    </div>
  ` : '';

  // Build platform pill
  const platformColors = {
    instagram: 'chip-ig', youtube: 'chip-yt', tiktok: 'chip-tt',
    facebook: 'chip-fb', twitter: 'chip-tw', x: 'chip-tw'
  };
  const pKey  = platform.toLowerCase();
  const pClass = platformColors[pKey] || 'chip-ig';

  document.getElementById('resultArea').innerHTML = `
    <div class="card result-card">
      <div class="result-header">
        <div class="result-icon">✅</div>
        <div class="result-info">
          <div class="result-title">${escHtml(title)}</div>
          <div class="result-meta">
            <span class="chip ${pClass}">${escHtml(platform)}</span>
            <span class="qc-size">${data.total_formats || formats.length} formats found</span>
          </div>
        </div>
      </div>

      <div class="quality-label">Choose Quality</div>
      <div class="quality-list">
        ${qualityCards}
        ${audioCard}
      </div>

      <div class="result-actions" style="margin-top:1.25rem;">
        <button class="btn-action btn-ghost" onclick="resetDownloader()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
          New Download
        </button>
        <button class="btn-action btn-ghost" onclick="copyPageLink()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <span id="copyBtnText">Copy Link</span>
        </button>
      </div>
    </div>
  `;

  resultArea.style.display = 'block';
}

// ── Helpers ────────────────────────────────────────────────────────
function hideAll() {
  resultArea.style.display = 'none';
  errorArea.style.display  = 'none';
}

function showError(msg) {
  errorMsg.textContent        = msg;
  errorArea.style.display     = 'block';
}

function setLoading(on) {
  const txt = downloadBtn.querySelector('.btn-text');
  const ld  = downloadBtn.querySelector('.btn-loading');
  downloadBtn.disabled = on;
  txt.style.display = on ? 'none' : 'flex';
  ld.style.display  = on ? 'flex' : 'none';
}

function resetDownloader() {
  hideAll();
  urlInput.value = '';
  clearBtn.style.display = 'none';
  resultArea.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  urlInput.focus();
}

async function copyPageLink() {
  const src = urlInput.value || location.href;
  try {
    await navigator.clipboard.writeText(src);
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = src; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  }
  const el = document.getElementById('copyBtnText');
  if (el) { el.textContent = '✓ Copied!'; setTimeout(() => { el.textContent = 'Copy Link'; }, 2500); }
}

function trackDownload(res) {
  console.log('[VidSnap] Download started:', res);
}

function isValidUrl(s) {
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch (_) { return false; }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shakeInput() {
  const w = document.querySelector('.input-wrap');
  w.classList.add('shake');
  setTimeout(() => w.classList.remove('shake'), 600);
}

// ── Shake CSS injected ─────────────────────────────────────────────
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)}
  }
  .shake { animation:shake .5s ease; border-color:rgba(239,68,68,.5) !important; }
`;
document.head.appendChild(shakeStyle);

// ── Scroll fade-in ─────────────────────────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.animation = 'fadeSlideUp .55s ease both';
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.step-card,.platform-item,.faq-item').forEach(el => {
  el.style.opacity = '0'; obs.observe(el);
});
