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

// Injecting the script into the webpage
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js");
script.onload = function () {
  this.remove(); // Clean up after the script is loaded
};
(document.head || document.documentElement).appendChild(script);

// Function to add the new UI button
const addChatButton = () => {
  const button = document.createElement("button");
  button.textContent = "Open Chat (⌘K)";
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.left = "50%";
  button.style.transform = "translateX(-50%)";
  button.style.padding = "10px 20px";
  button.style.backgroundColor = "#4CAF50";
  button.style.color = "white";
  button.style.border = "none";
  button.style.borderRadius = "5px";
  button.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  button.style.cursor = "pointer";
  button.style.zIndex = "1000";

  // Ensure button calls the `show` method of the `chatBox` instance
  button.addEventListener("click", () => {
    console.log("Button clicked, opening chatbox");
    chatBox.show();
  });

  document.body.appendChild(button);
};

// Ensure the button is added after the DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addChatButton);
} else {
  addChatButton();
}
