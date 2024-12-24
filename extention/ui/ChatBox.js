export class ChatBox {
  constructor() {
    this.messages = [];
    this.isVisible = false;
    this.init();
  }

  init() {
    this.createElements();
    this.setupEventListeners();
    this.addInitialMessage();
  }

  createElements() {
    this.overlay = document.createElement("div");
    this.overlay.className = "overlay";
    document.body.appendChild(this.overlay);

    this.chatbox = document.createElement("div");
    this.chatbox.className = "chat-box";

    // Messages container
    this.messagesContainer = document.createElement("div");
    this.messagesContainer.className = "messages";

    // Input container
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";

    this.messageInput = document.createElement("input");
    this.messageInput.className = "message-input";
    this.messageInput.placeholder = "Type a message...";

    const sendButton = document.createElement("button");
    sendButton.className = "send-button";
    sendButton.innerHTML = "→";
    sendButton.addEventListener("click", () => this.sendMessage());

    inputContainer.appendChild(this.messageInput);
    inputContainer.appendChild(sendButton);

    this.chatbox.appendChild(this.messagesContainer);
    this.chatbox.appendChild(inputContainer);
    document.body.appendChild(this.chatbox);

    this.renderMessages();
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.toggle();
      }
      if (this.isVisible && e.key === "Escape") {
        this.hide();
      }
      if (this.isVisible && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.overlay.addEventListener("click", () => this.hide());
  }

  addInitialMessage() {
    const initialMessage = {
      id: Date.now(),
      type: "system",
      content: "Hello! How can I help you today?",
      timestamp: new Date(),
    };
    this.messages.push(initialMessage);
    this.renderMessages();
  }

  sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content,
      timestamp: new Date(),
    };
    this.messages.push(userMessage);
    this.messageInput.value = "";

    this.renderMessages();

    // Send the query to the background script
    chrome.runtime.sendMessage(
      { type: "submitQuery", query: content },
      (response) => {
        if (response && response.status === "success") {
          const aiMessage = {
            id: Date.now(),
            type: "system",
            content: response.aiResponse.response, // This is HTML content
            timestamp: new Date(),
          };
          this.messages.push(aiMessage);
          this.renderMessages();
        } else {
          const errorMessage = {
            id: Date.now(),
            type: "system",
            content: "Error: " + (response.error || "Unknown error occurred"),
            timestamp: new Date(),
          };
          this.messages.push(errorMessage);
          this.renderMessages();
        }
      }
    );
  }

  renderMessages() {
    this.messagesContainer.innerHTML = "";

    this.messages.forEach((message) => {
      const messageElement = document.createElement("div");
      messageElement.className = `message ${message.type}`;

      const contentElement = document.createElement("div");
      contentElement.className = "message-content";

      // Use innerHTML for system messages to render HTML
      if (message.type === "system") {
        contentElement.innerHTML = message.content;
      } else {
        contentElement.textContent = message.content; // User input remains text-only
      }

      const timeElement = document.createElement("div");
      timeElement.className = "message-time";
      timeElement.textContent = message.timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      messageElement.appendChild(contentElement);
      messageElement.appendChild(timeElement);
      this.messagesContainer.appendChild(messageElement);
    });

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  show() {
    this.isVisible = true;
    this.overlay.classList.add("visible");
    this.chatbox.classList.add("visible");
    this.messageInput.focus();
  }

  hide() {
    this.isVisible = false;
    this.overlay.classList.remove("visible");
    this.chatbox.classList.remove("visible");
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
