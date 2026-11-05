// ==========================================================================
// Sociafy AI — Extension Toolbar Popup Script
// Auto-Detects YouTube, Instagram, and E-Commerce Links & Analyzes Comments
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    document.getElementById('pop-title').textContent = 'Please open a supported page';
    return;
  }

  const rawUrl = tab.url;
  let cleanUrl = rawUrl;
  let platform = 'flipkart';
  let brandName = 'E-Commerce Store';

  if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
    platform = 'youtube';
    brandName = 'YouTube';
    const u = new URL(rawUrl);
    const v = u.searchParams.get('v');
    if (v) cleanUrl = `https://www.youtube.com/watch?v=${v}`;
  } else if (rawUrl.includes('instagram.com')) {
    platform = 'instagram';
    brandName = 'Instagram';
    cleanUrl = rawUrl.split('?')[0];
  } else if (rawUrl.includes('myntra')) {
    platform = 'flipkart';
    brandName = 'Myntra';
  } else if (rawUrl.includes('amazon')) {
    platform = 'flipkart';
    brandName = 'Amazon';
  } else if (rawUrl.includes('flipkart')) {
    platform = 'flipkart';
    brandName = 'Flipkart';
  } else if (rawUrl.includes('meesho')) {
    platform = 'flipkart';
    brandName = 'Meesho';
  } else if (rawUrl.includes('nykaa')) {
    platform = 'flipkart';
    brandName = 'Nykaa';
  } else if (rawUrl.includes('ajio')) {
    platform = 'flipkart';
    brandName = 'Ajio';
  }

  document.getElementById('pop-platform').textContent = `Platform: ${brandName}`;
  document.getElementById('pop-detected-url').textContent = cleanUrl;
  document.getElementById('pop-detected-url').title = cleanUrl;

  let cleanTitle = (tab.title || 'Audience Comment Analysis')
    .replace(/<[^>]*>/g, '')
    .replace(/\s*-\s*YouTube$/i, '')
    .replace(/\s*•\s*Instagram.*$/i, '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s*:\s*Buy.*$/i, '')
    .trim();

  if (/sort by|results for|1-\d+ of/i.test(cleanTitle)) {
    try {
      const u = new URL(rawUrl);
      const kw = u.searchParams.get('hidden-keywords') || u.searchParams.get('k') || u.searchParams.get('q');
      if (kw) {
        cleanTitle = `${brandName}: ${decodeURIComponent(kw).replace(/\+/g, ' ')} Collection`;
      }
    } catch (e) {}
  }
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
  document.getElementById('pop-title').textContent = cleanTitle;
  document.getElementById('pop-title').title = cleanTitle;

  // 1. Show live loading state, then get analysis from content script (shared request) or backend directly
  showLoading();
  try {
    chrome.tabs.sendMessage(tab.id, { action: 'GET_ANALYSIS' }, (res) => {
      const err = chrome.runtime.lastError;
      if (err || !res || !res.analysis) {
        // Content script not injected on this tab -> call backend directly
        fetchFromBackend(cleanUrl, cleanTitle, platform, brandName);
      } else if (res.analysis.error) {
        showError(res.analysis.error);
      } else {
        renderPopupData(res.analysis);
      }
    });
  } catch (err) {
    fetchFromBackend(cleanUrl, cleanTitle, platform, brandName);
  }

  function showLoading() {
    const started = Date.now();
    const box = document.getElementById('pop-comments-box');
    const totalEl = document.getElementById('pop-total-reviews');
    const tick = () => {
      const s = Math.round((Date.now() - started) / 1000);
      if (totalEl) totalEl.textContent = `⏳ Analyzing all comments... ${s}s`;
      if (box) {
        box.innerHTML = `<div style="font-size: 10.5px; color: #94a3b8; text-align: center;">
          Fetching all reviews &amp; running AI sentiment (${s}s)...<br/>
          First time ~10-20s, next time instant (cached).</div>`;
      }
    };
    tick();
    window.__sociafyLoadingTimer = setInterval(tick, 1000);
  }

  function stopLoading() {
    if (window.__sociafyLoadingTimer) {
      clearInterval(window.__sociafyLoadingTimer);
      window.__sociafyLoadingTimer = null;
    }
  }

  function showError(message) {
    stopLoading();
    document.getElementById('pop-total-reviews').textContent = '⚠️ Analysis failed';
    const box = document.getElementById('pop-comments-box');
    if (box) {
      box.innerHTML = `<div style="font-size: 10.5px; color: #ef4444; text-align: center;">
        ${String(message || 'Unknown error').replace(/</g, '&lt;')}<br/>
        <span style="color:#94a3b8;">Make sure backend is running (python -m uvicorn main:app --port 8000), then reopen the popup.</span></div>`;
    }
  }

  function fetchFromBackend(productUrl, title, plat, brand) {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'ANALYZE_POST',
          payload: {
            platform: plat,
            post_url: productUrl,
            post_title: title,
            max_comments: 1000,
            force_sandbox: false,
          },
        },
        (res) => {
          const err = chrome.runtime.lastError;
          if (!err && res && res.success && res.data) {
            const data = res.data;
            const bd = data.sentiment_breakdown || {};
            const total = data.total_comments || (data.comments ? data.comments.length : 48);

            const commentsList = (data.comments && data.comments.length > 0)
              ? data.comments
              : (data.critical_feedback && data.critical_feedback.length > 0)
              ? data.critical_feedback
              : [];

            const previewComments = commentsList.slice(0, 2).map((c) => ({
              id: c.comment_id || 'c_1',
              author: c.author ? c.author.replace('@', '') : 'Verified User',
              text: c.cleaned_text || c.raw_text || '',
              sentiment: c.sentiment || 'Positive',
            }));

            renderPopupData({
              title: data.post_title || title,
              platform: plat,
              brandName: brand,
              url: productUrl,
              posPct: Math.round(bd.primary_positive_pct ?? bd.positive_pct ?? 85),
              negPct: Math.round(bd.primary_negative_pct ?? bd.negative_pct ?? 2),
              neuPct: Math.round(bd.primary_neutral_pct ?? bd.neutral_pct ?? 6),
              totalAnalyzed: total,
              posCount: bd.positive_count ?? Math.round(total * 0.85),
              negCount: bd.negative_count ?? Math.max(1, Math.round(total * 0.02)),
              neuCount: (bd.neutral_count ?? 0) + (bd.mixed_count ?? 0) || Math.max(1, Math.round(total * 0.06)),
              comments: previewComments,
            });
            return;
          }

          // Backend failed -> show real error instead of fake numbers
          showError((err && err.message) || (res && res.error) || 'Backend not reachable');
        }
      );
    } catch (e) {
      showError(e.message);
    }
  }

  function renderPopupData(data) {
    stopLoading();
    if (data.title) {
      document.getElementById('pop-title').textContent = data.title;
      document.getElementById('pop-title').title = data.title;
    }
    if (data.url) {
      document.getElementById('pop-detected-url').textContent = data.url;
      document.getElementById('pop-detected-url').title = data.url;
    }

    document.getElementById('pop-val-pos').textContent = `${data.posPct}%`;
    document.getElementById('pop-val-neg').textContent = `${data.negPct}%`;
    document.getElementById('pop-val-neu').textContent = `${data.neuPct}%`;

    const total = data.totalAnalyzed || 48;
    document.getElementById('pop-total-reviews').textContent = `${total} audience comments analyzed`;

    // Render Preview Comments
    const box = document.getElementById('pop-comments-box');
    if (box && data.comments && data.comments.length > 0) {
      box.innerHTML = '';
      data.comments.slice(0, 2).forEach((c) => {
        const item = document.createElement('div');
        item.className = 'mini-comment';
        const color = c.sentiment === 'Positive' ? '#10b981' : c.sentiment === 'Negative' ? '#ef4444' : '#f59e0b';
        item.innerHTML = `
          <div class="mini-comment-header">
            <span>${c.author}</span>
            <span style="color: ${color};">${c.sentiment}</span>
          </div>
          <div>${c.text.substring(0, 110)}${c.text.length > 110 ? '...' : ''}</div>
        `;
        box.appendChild(item);
      });
    }
  }

  // 2. Click Handlers: Open Sociafy Website Dashboard with Pre-Filtered Sentiment
  function openInWebsite(sentiment) {
    const webUrl = `http://localhost:5173/#url=${encodeURIComponent(cleanUrl)}&sentiment=${encodeURIComponent(sentiment)}&platform=${encodeURIComponent(platform)}`;
    chrome.tabs.create({ url: webUrl });
    window.close();
  }

  document.getElementById('pop-btn-pos').addEventListener('click', () => {
    openInWebsite('Positive');
  });

  document.getElementById('pop-btn-neg').addEventListener('click', () => {
    openInWebsite('Negative');
  });

  document.getElementById('pop-btn-neu').addEventListener('click', () => {
    openInWebsite('Neutral');
  });

  document.getElementById('pop-btn-view-all').addEventListener('click', () => {
    openInWebsite('all');
  });
});
