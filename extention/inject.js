var s = document.createElement("script");
s.src = chrome.runtime.getURL("injected.js"); // Ensure this file exists
s.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(s);
