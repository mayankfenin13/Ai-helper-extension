// Listener to handle messages from injected.js
import { ChatBox } from "./ui/ChatBox";
import { VectorSearchBox } from "./ui/vectorsearchbox";

const chatBox = new ChatBox();
const vectorSearchBox = new VectorSearchBox();

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

  // Remove existing buttons to prevent duplicates
  const existingChatButton = document.querySelector(".chat-ai-button-li");
  const existingVectorButton = document.querySelector(
    ".vector-search-button-li"
  );
  if (existingChatButton) existingChatButton.remove();
  if (existingVectorButton) existingVectorButton.remove();

  if (!urlPattern.test(currentUrl)) {
    console.log("Not on a problems page, buttons not added.");
    return; // Exit if the URL does not match
  }

  // Select the header container's <ul> element
  const ulElement = document.querySelector(".coding_nav_bg__HRkIn ul");
  if (!ulElement) {
    console.warn("Header <ul> element not found. Buttons not added.");
    return;
  }

  // Reusable function to create buttons
  const createButton = (text, shortcut, clickHandler, customClass) => {
    const liElement = document.createElement("li");
    liElement.className = `d-flex flex-row rounded-3 dmsans align-items-center ${customClass}`;
    liElement.style.padding = "0.36rem 1rem";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.position = "relative";
    buttonContainer.style.isolation = "isolate";

    const button = document.createElement("button");
    button.textContent = text;

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

    const shortcutSpan = document.createElement("span");
    shortcutSpan.textContent = shortcut;
    shortcutSpan.style.marginLeft = "8px";
    shortcutSpan.style.fontSize = "0.8em";
    shortcutSpan.style.opacity = "0.8";

    button.addEventListener("click", clickHandler);

    button.appendChild(shortcutSpan);
    buttonContainer.appendChild(button);
    liElement.appendChild(buttonContainer);

    return liElement;
  };

  // Chat AI button
  const chatButton = createButton(
    "Ask AI",
    "(⌘K/ctrl+K)",
    () => {
      console.log("AI Button clicked, opening chatbox");
      chatBox.show();
    },
    "chat-ai-button-li"
  );

  // Vector Search button
  const vectorButton = createButton(
    "Vector Search",
    "(⌘D/ctrl+D)",
    () => {
      console.log("Vector Search Button clicked");
      vectorSearchBox.show(); // Show the modal for Vector Search
    },
    "vector-search-button-li"
  );

  // Add buttons to the navigation
  ulElement.appendChild(chatButton);
  ulElement.appendChild(vectorButton);
};

// Set up URL change monitoring using both History API and MutationObserver
const setupUrlChangeMonitoring = () => {
  let lastUrl = window.location.href;

  const observer = new MutationObserver((mutations) => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      addChatButtonAsListItem();
      vectorSearchBox.reset(); // Reset and autofetch for the new problem
    }

    mutations.forEach((mutation) => {
      if (
        mutation.target.classList?.contains("coding_nav_bg__HRkIn") ||
        mutation.target.querySelector?.(".coding_nav_bg__HRkIn")
      ) {
        addChatButtonAsListItem();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  window.addEventListener("popstate", () => {
    addChatButtonAsListItem();
    vectorSearchBox.reset(); // Reset and autofetch on back/forward navigation
  });

  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    addChatButtonAsListItem();
    vectorSearchBox.reset(); // Reset and autofetch on pushState
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    addChatButtonAsListItem();
    vectorSearchBox.reset(); // Reset and autofetch on replaceState
  };

  window.addEventListener("hashchange", () => {
    addChatButtonAsListItem();
    vectorSearchBox.reset(); // Reset and autofetch on hash change
  });
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
