// Sociafy AI Extension Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Sociafy AI] Extension successfully installed & ready.');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'OK', version: '1.0.0' });
    return true;
  }

  // Proxies API calls from HTTPS pages (e.g. Myntra/Amazon) to localhost:8000 safely
  if (request.action === 'ANALYZE_POST') {
    fetch('http://localhost:8000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload || {}),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then((data) => {
        sendResponse({ success: true, data: data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }

  return true;
});
