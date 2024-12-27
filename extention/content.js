// Listener to handle messages from injected.js
import { ChatBox } from "./ui/ChatBox";

const chatBox = new ChatBox();

window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    !event.data ||
    event.data.type !== "apiIntercepted"
  ) {
    return; // Ignore messages not from the injected script
  }

  chrome.runtime.sendMessage(
    {
      type: "apiIntercepted",
      url: event.data.url,
      method: event.data.method,
      response: event.data.response,
    },
    (response) => {
      console.log("Response from background script:", response);
    }
  );
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getUserCode") {
    const { id } = message;

    // Regex to find the relevant key
    const regex = new RegExp(`course_\\d+_${id}_\\w+`);
    let userCode = null;

    // Traverse localStorage to find matching key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (regex.test(key)) {
        userCode = localStorage.getItem(key);
        break; // Stop after finding the first match
      }
    }

    // Respond with the user code or null if not found
    sendResponse({ userCode });
  }
  return true; // Keep the message channel open for async response
});

// Injecting the script into the webpage
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js");
script.onload = function () {
  this.remove(); // Clean up after the script is loaded
};
(document.head || document.documentElement).appendChild(script);

const addChatButtonAsListItem = () => {
  // Check if the URL matches the desired pattern
  const currentUrl = window.location.href;
  const urlPattern = /^https:\/\/maang\.in\/problems\/[\w-]+(\?.*)?$/;

  // Remove existing button to prevent duplicates
  const existingButton = document.querySelector(".chat-ai-button-li");
  if (existingButton) existingButton.remove();

  if (!urlPattern.test(currentUrl)) {
    console.log("Not on a problems page, button not added.");
    return; // Exit if the URL does not match
  }

  // Select the header container's <ul> element
  const ulElement = document.querySelector(".coding_nav_bg__HRkIn ul");
  if (!ulElement) {
    console.warn("Header <ul> element not found. Button not added.");
    return;
  }

  // Create the <li> element
  const liElement = document.createElement("li");
  liElement.className =
    "d-flex flex-row rounded-3 dmsans align-items-center chat-ai-button-li";
  liElement.style.padding = "0.36rem 1rem";

  // Create the button container for the glowing effect
  const buttonContainer = document.createElement("div");
  buttonContainer.style.position = "relative";
  buttonContainer.style.isolation = "isolate"; // Ensures glow doesn't affect other elements

  // Create the button
  const button = document.createElement("button");
  button.textContent = "Ask AI";

  // Add modern AI-themed styles
  button.style.cssText = `
    display: flex;
    align-items: center;
    padding: 0.5rem 1.2rem;
    background: linear-gradient(135deg, rgba(37, 38, 89, 0.9), rgba(63, 76, 119, 0.9));
    color: #fff;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    letter-spacing: 0.3px;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    white-space: nowrap;
  `;

  // Add the shortcut text
  const shortcutSpan = document.createElement("span");
  shortcutSpan.textContent = "(⌘K/ctrl+K)";
  shortcutSpan.style.marginLeft = "8px";
  shortcutSpan.style.fontSize = "0.8em";
  shortcutSpan.style.opacity = "0.8";

  // Add hover effects
  button.addEventListener("mouseover", () => {
    button.style.transform = "translateY(-1px)";
    button.style.background =
      "linear-gradient(135deg, rgba(47, 48, 99, 0.95), rgba(73, 86, 129, 0.95))";
    button.style.boxShadow = `
      0 4px 12px -1px rgba(0, 0, 0, 0.15),
      0 2px 6px -1px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 0 15px rgba(105, 17, 203, 0.3)
    `;
  });

  button.addEventListener("mouseout", () => {
    button.style.transform = "translateY(0)";
    button.style.background =
      "linear-gradient(135deg, rgba(37, 38, 89, 0.9), rgba(63, 76, 119, 0.9))";
    button.style.boxShadow = `
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `;
  });

  // Add active/click effect
  button.addEventListener("mousedown", () => {
    button.style.transform = "translateY(1px)";
    button.style.boxShadow = `
      0 2px 4px -1px rgba(0, 0, 0, 0.1),
      0 1px 2px -1px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `;
  });

  button.addEventListener("mouseup", () => {
    button.style.transform = "translateY(-1px)";
  });

  // Add event listener to open chatbox
  button.addEventListener("click", () => {
    console.log("AI Button clicked, opening chatbox");
    chatBox.show();
  });

  // Assemble all elements

  button.appendChild(shortcutSpan);
  buttonContainer.appendChild(button);
  liElement.appendChild(buttonContainer);
  ulElement.appendChild(liElement);
};

// Set up URL change monitoring using both History API and MutationObserver
const setupUrlChangeMonitoring = () => {
  // Track the last URL to prevent duplicate processing
  let lastUrl = window.location.href;

  // Create MutationObserver to watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      addChatButtonAsListItem();
    }

    // Also check if the navigation container has been added/modified
    mutations.forEach((mutation) => {
      if (
        mutation.target.classList?.contains("coding_nav_bg__HRkIn") ||
        mutation.target.querySelector?.(".coding_nav_bg__HRkIn")
      ) {
        addChatButtonAsListItem();
      }
    });
  });

  // Start observing with a more specific configuration
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  // Listen for back/forward navigation
  window.addEventListener("popstate", addChatButtonAsListItem);

  // Intercept pushState
  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    addChatButtonAsListItem();
  };

  // Intercept replaceState
  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    addChatButtonAsListItem();
  };

  // Listen for URL changes via hash changes
  window.addEventListener("hashchange", addChatButtonAsListItem);
};

// Initial setup with retry mechanism
const initializeWithRetry = () => {
  addChatButtonAsListItem();
  setupUrlChangeMonitoring();

  // Add a brief delay and retry once to catch late-loading elements
  setTimeout(addChatButtonAsListItem, 1000);
};

// Start the initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeWithRetry);
} else {
  initializeWithRetry();
}
