// Sociafy AI Extension Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Sociafy AI] Extension successfully installed & ready on Flipkart, Amazon, Myntra, etc.');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'OK', version: '1.0.0' });
  }
  return true;
});
