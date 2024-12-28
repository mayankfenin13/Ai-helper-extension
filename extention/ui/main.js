import { ChatBox } from "./ChatBox";
import "./style.css";
import { initializeChatBox } from "./ChatBox";

import { VectorSearchBox } from "./vectorsearchbox";

const vectorSearchBox = new VectorSearchBox();

// Add a button to trigger the Vector Search modal
const vectorButton = document.createElement("button");
vectorButton.textContent = "Vector Search (⌘D)";
vectorButton.style.position = "fixed";
vectorButton.style.bottom = "80px";
vectorButton.style.left = "50%";
vectorButton.style.transform = "translateX(-50%)";
vectorButton.addEventListener("click", () => {
  vectorSearchBox.show();
});
document.body.appendChild(vectorButton);

// Optional: Add keyboard shortcut for toggling Vector Search
document.addEventListener("keydown", (e) => {
  if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    vectorSearchBox.toggle();
  }
});

initializeChatBox();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeChatBox);
} else {
  initializeChatBox();
}

const button = document.createElement("button");
button.textContent = "Open Chat (⌘K)";
button.style.position = "fixed";
button.style.bottom = "20px";
button.style.left = "50%";
button.style.transform = "translateX(-50%)";
button.addEventListener("click", () => {
  const userName = localStorage.getItem("az_user_tracking_id");
  const problemTitle = "Example Problem"; // Replace with actual problem title logic
  chatBox.show(userName, problemTitle);
});
document.body.appendChild(button);
