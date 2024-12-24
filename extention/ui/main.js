import { ChatBox } from "./ChatBox";
import "./style.css";

// Initialize the chat box
const chatBox = new ChatBox();

// Add a button to show the chat
const button = document.createElement("button");
button.textContent = "Open Chat (⌘K)";
button.style.position = "fixed";
button.style.bottom = "20px";
button.style.left = "50%";
button.style.transform = "translateX(-50%)";
button.addEventListener("click", () => chatBox.show());
document.body.appendChild(button);
