export class VectorSearchBox {
  static instance = null;

  constructor() {
    if (VectorSearchBox.instance) {
      return VectorSearchBox.instance;
    }
    VectorSearchBox.instance = this;

    this.isVisible = false;
    this.results = [];
    this.messages = [];
    this.isLoading = false;

    this.boundKeydownHandler = this.handleKeydown.bind(this);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.createElements();
    this.setupEventListeners();
    this.autoFetchQueryById(); // Fetch query by ID on initialization
  }

  autoFetchQueryById() {
    chrome.storage.local.get("interceptedContext", (data) => {
      const { interceptedContext } = data || {};
      if (interceptedContext?.context?.id) {
        console.log(
          "Fetching query by ID from interceptedContext:",
          interceptedContext.context.id
        );
        // Show loading state for auto-fetch
        this.setLoading(true);
        this.fetchQueryById(interceptedContext.context.id);
      } else {
        console.log("No query ID found in interceptedContext.");
        this.addMessage({
          type: "system",
          content: "No query ID available to fetch data.",
          timestamp: new Date(),
        });
      }
    });
  }

  fetchQueryById(id) {
    if (!id) {
      this.addMessage({
        type: "system",
        content: "Error: Query ID is missing.",
        timestamp: new Date(),
      });
      return;
    }

    fetch("https://ai-helper-extention-searchserver.vercel.app/queryById", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, topK: 5 }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch query by ID");
        return response.json();
      })
      .then((data) => {
        this.setLoading(false); // Remove loading state after auto-fetch
        if (data.results.length === 0) {
          this.addMessage({
            type: "system",
            content: `No results found for ID: ${id}`,
            timestamp: new Date(),
          });
        } else {
          this.results = data.results;
          data.results.forEach((result) => {
            const title =
              extractTitle(result.metadata).replace(" ", "-") || "Untitled";
            this.addMessage({
              type: "system",
              content: `Title: ${
                extractTitle(result.metadata) || "Untitled"
              }<br>
                Link: <a href="https://www.maang.in/problems/${title}-${
                result.id
              }" target="_blank">View Problem</a><br>
                        <br>
                        Similarity Score: ${result.score.toFixed(2)}`,
              timestamp: new Date(),
            });
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching query by ID:", error);
        this.setLoading(false);
        this.addMessage({
          type: "system",
          content: "Something went wrong. Please try again later.",
          timestamp: new Date(),
        });
      });
  }

  createElements() {
    this.overlay = document.createElement("div");
    this.overlay.className = "vector-overlay";
    document.body.appendChild(this.overlay);

    this.modal = document.createElement("div");
    this.modal.className = "vector-modal";

    const header = document.createElement("div");
    header.className = "vector-header";

    const title = document.createElement("div");
    title.className = "vector-title";
    title.textContent = "Vector Search (Similar questions in AZ Problemset)";

    const closeButton = document.createElement("button");
    closeButton.className = "close-button";
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => this.hide());

    header.appendChild(title);
    header.appendChild(closeButton);
    this.modal.appendChild(header);

    this.messagesContainer = document.createElement("div");
    this.messagesContainer.className = "vector-messages";
    this.modal.appendChild(this.messagesContainer);

    const inputContainer = document.createElement("div");
    inputContainer.className = "vector-input-container";

    this.searchInput = document.createElement("input");
    this.searchInput.className = "vector-input";
    this.searchInput.placeholder =
      "Enter keyworks to find related questions...";

    const sendButton = document.createElement("button");
    sendButton.className = "vector-send-button";
    sendButton.innerHTML = "→";
    sendButton.addEventListener("click", () => this.handleUserQuery());

    const searchButton = document.createElement("button");
    searchButton.className = "vector-search-button";
    searchButton.textContent = "→";
    searchButton.addEventListener("click", () => this.handleUserQuery());

    inputContainer.appendChild(this.searchInput);
    inputContainer.appendChild(searchButton);

    this.modal.appendChild(inputContainer);

    document.body.appendChild(this.modal);
  }

  setupEventListeners() {
    document.removeEventListener("keydown", this.boundKeydownHandler);
    this.overlay?.removeEventListener("click", this.hide.bind(this));

    document.addEventListener("keydown", this.boundKeydownHandler);
    this.overlay?.addEventListener("click", this.hide.bind(this));

    this.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.handleUserQuery();
      }
    });
  }

  handleKeydown(e) {
    if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.toggle();
    }
    if (this.isVisible && e.key === "Escape") {
      this.hide();
    }
  }

  handleUserQuery() {
    const query = this.searchInput.value.trim();
    if (!query) return;

    // Clear previous messages and results
    this.clearState();

    // Add the user's new query as a message
    this.addMessage({
      type: "user",
      content: query,
      timestamp: new Date(),
    });

    this.searchInput.value = ""; // Clear input field

    // Don't show loading state for manual queries
    this.performSearch(query);
  }
  performSearch(query) {
    console.log("Performing search for:", query);

    fetch("https://ai-helper-extention-searchserver.vercel.app/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, topK: 5 }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Server error");
        return response.json();
      })
      .then((data) => {
        this.results = data.results;

        if (this.results.length === 0) {
          this.addMessage({
            type: "system",
            content: "No results found for your query.",
            timestamp: new Date(),
          });
        } else {
          this.results.forEach((result) => {
            this.addMessage({
              type: "system",
              content: `Title: ${
                extractTitle(result.metadata) || "Untitled"
              }<br>
                        Similarity Score: ${result.score.toFixed(2)}`,
              timestamp: new Date(),
            });
          });
        }
      })
      .catch((error) => {
        console.error("Error performing vector search:", error);
        this.addMessage({
          type: "system",
          content: "Something went wrong. Please try again later.",
          timestamp: new Date(),
        });
      });
  }

  addMessage(message) {
    this.messages.push(message);
    this.renderMessages();
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;

    if (isLoading) {
      const loadingMessage = {
        type: "system",
        content: `
          <div class="message-content loading">
            Searching
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        `,
        timestamp: new Date(),
      };
      this.addMessage(loadingMessage);
    } else {
      this.messages = this.messages.filter(
        (msg) => !msg.content.includes("loading-dots")
      );
      this.renderMessages();
    }
  }

  renderMessages() {
    this.messagesContainer.innerHTML = "";

    this.messages.forEach((message) => {
      const messageElement = document.createElement("div");
      messageElement.className = `message ${message.type}`;

      const contentElement = document.createElement("div");
      contentElement.className = "message-content";

      if (message.type === "system") {
        contentElement.innerHTML = message.content;
      } else {
        contentElement.textContent = message.content;
      }

      messageElement.appendChild(contentElement);

      this.messagesContainer.appendChild(messageElement);
    });

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  show() {
    if (!this.overlay || !this.modal) {
      this.createElements();
      this.setupEventListeners();
    }
    this.isVisible = true;
    this.overlay.classList.add("visible");
    this.modal.classList.add("visible");
    this.searchInput.focus();
  }

  hide() {
    this.isVisible = false;
    this.overlay?.classList.remove("visible");
    this.modal?.classList.remove("visible");
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  clearState() {
    // Reset messages and results
    this.messages = [];
    this.results = [];

    // Clear the UI
    this.renderMessages();
  }
  reset() {
    console.log("Resetting VectorSearchBox...");

    // Clear messages and results
    this.clearState();

    // Reset search input field
    this.searchInput.value = "";

    // Fetch new context data after a short delay
    setTimeout(() => {
      console.log("Attempting to auto-fetch query by ID...");
      this.autoFetchQueryById(); // Re-fetch context data for the new question
    }, 1500); // Adjust delay as necessary based on your app's loading behavior

    console.log("Reset complete.");
  }
}

function extractTitle(metadata) {
  if (!metadata || !metadata.text) {
    return null;
  }
  const text = metadata.text;
  const firstNewlineIndex = text.indexOf("\n");
  return firstNewlineIndex === -1
    ? text.trim()
    : text.substring(0, firstNewlineIndex).trim();
}
