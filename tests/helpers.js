const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJsSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Loads the real index.html markup into jsdom and evaluates the real app.js
// against it, without letting jsdom fetch the <script> tags itself (those
// point at Firebase's CDN and app.js relatively, which we don't want a test
// run reaching out to the network for).
function createApp({ timerStorageValue } = {}) {
  const dom = new JSDOM(indexHtml, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  if (timerStorageValue !== undefined) {
    window.localStorage.setItem('mmg-timer', timerStorageValue);
  }
  window.eval(appJsSource);
  return dom;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { createApp, sleep };
