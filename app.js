/* ================================================================
   VidSnap – Application Logic
   API base: https://videoapi-c4eq.onrender.com/get_video?url=
   ================================================================ */

const API_BASE = 'https://videoapi-c4eq.onrender.com/get_video?url=';

// ── DOM refs ──────────────────────────────────────────────────────
const urlInput      = document.getElementById('videoUrl');
const downloadBtn   = document.getElementById('downloadBtn');
const clearBtn      = document.getElementById('clearBtn');
const resultArea    = document.getElementById('resultArea');
const errorArea     = document.getElementById('errorArea');
const errorMsg      = document.getElementById('errorMsg');
const videoSource   = document.getElementById('videoSource');
const videoPreview  = document.getElementById('videoPreview');
const directDl      = document.getElementById('directDownload');
const copyBtnText   = document.getElementById('copyBtnText');

// ── Show/hide clear button ─────────────────────────────────────────
urlInput.addEventListener('input', () => {
  clearBtn.style.display = urlInput.value ? 'flex' : 'none';
});
clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.style.display = 'none';
  urlInput.focus();
});

// Allow pressing Enter to trigger download
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fetchVideo();
});

// ── Main fetch logic ───────────────────────────────────────────────
async function fetchVideo() {
  const rawUrl = urlInput.value.trim();

  if (!rawUrl) {
    shakeInput();
    return;
  }

  if (!isValidUrl(rawUrl)) {
    showError('Please enter a valid URL (must start with https://).');
    return;
  }

  setLoading(true);
  hideAll();

  const apiUrl = API_BASE + encodeURIComponent(rawUrl);

  try {
    const res = await fetch(apiUrl);

    if (!res.ok) {
      let detail = '';
      try {
        const json = await res.json();
        detail = json.error || json.detail || JSON.stringify(json);
      } catch (_) {
        detail = `Server returned status ${res.status}.`;
      }
      throw new Error(detail || `Request failed (${res.status}).`);
    }

    const contentType = res.headers.get('content-type') || '';

    // ── Case 1: API returns a JSON object with a video URL field ──
    if (contentType.includes('application/json')) {
      const data = await res.json();

      // Try common fields: url, video_url, download_url, link
      const videoUrl = data.url || data.video_url || data.download_url
                    || data.link || data.direct_url || data.hdurl || data.sdurl;

      if (videoUrl) {
        showResult(videoUrl);
      } else {
        throw new Error('The API responded with JSON but no video URL was found.');
      }

    // ── Case 2: API streams the video directly ────────────────────
    } else if (contentType.includes('video/') || contentType.includes('application/octet-stream')) {
      // Stream → Blob → Object URL
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      showResult(objUrl, true /* isBlob */);

    // ── Case 3: Redirect or other – use raw API URL as src ────────
    } else {
      // Fallback: just point video tag at the API URL directly
      showResult(apiUrl);
    }

  } catch (err) {
    console.error('[VidSnap] fetchVideo error:', err);
    showError(err.message || 'An unexpected error occurred. Please try again.');
  } finally {
    setLoading(false);
  }
}

// ── Show result ────────────────────────────────────────────────────
function showResult(videoUrl, isBlob = false) {
  videoSource.src  = videoUrl;
  directDl.href    = videoUrl;
  directDl.setAttribute('download', isBlob ? 'vidsnap_video.mp4' : getFilename(videoUrl));

  videoPreview.load();
  resultArea.style.display = 'block';
}

// ── Show error ─────────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorArea.style.display = 'block';
}

function hideAll() {
  resultArea.style.display = 'none';
  errorArea.style.display  = 'none';
}

// ── Toggle loading state ───────────────────────────────────────────
function setLoading(loading) {
  const textEl    = downloadBtn.querySelector('.btn-text');
  const loadingEl = downloadBtn.querySelector('.btn-loading');
  downloadBtn.disabled = loading;

  if (loading) {
    textEl.style.display    = 'none';
    loadingEl.style.display = 'flex';
  } else {
    textEl.style.display    = 'flex';
    loadingEl.style.display = 'none';
  }
}

// ── Reset ──────────────────────────────────────────────────────────
function resetDownloader() {
  hideAll();
  urlInput.value = '';
  clearBtn.style.display = 'none';
  videoSource.src = '';
  videoPreview.load();
  copyBtnText.textContent = 'Copy Link';
  urlInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Copy link ──────────────────────────────────────────────────────
async function copyLink() {
  const url = videoSource.src;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    copyBtnText.textContent = '✓ Copied!';
    setTimeout(() => { copyBtnText.textContent = 'Copy Link'; }, 3000);
  } catch (_) {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    copyBtnText.textContent = '✓ Copied!';
    setTimeout(() => { copyBtnText.textContent = 'Copy Link'; }, 3000);
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function getFilename(url) {
  try {
    const path = new URL(url).pathname;
    const name = path.split('/').pop();
    return name && name.includes('.') ? name : 'vidsnap_video.mp4';
  } catch (_) {
    return 'vidsnap_video.mp4';
  }
}

function shakeInput() {
  const wrap = document.querySelector('.input-wrap');
  wrap.classList.add('shake');
  setTimeout(() => wrap.classList.remove('shake'), 600);
}

// ── Shake animation (injected CSS) ────────────────────────────────
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px); }
    40%     { transform: translateX(8px); }
    60%     { transform: translateX(-6px); }
    80%     { transform: translateX(6px); }
  }
  .shake { animation: shake 0.5s ease; border-color: rgba(239,68,68,0.5) !important; }
`;
document.head.appendChild(shakeStyle);

// ── Intersection Observer for scroll animations ───────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeSlideUp 0.55s ease both';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.step-card, .platform-item, .faq-item').forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});
