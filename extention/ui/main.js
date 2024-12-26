import { ChatBox } from "./ChatBox";
import "./style.css";
import { initializeChatBox } from "./ChatBox";

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
