chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "apiIntercepted") {
    console.log("Message received from content script:", message);

    // Store the intercepted context in the background script
    chrome.storage.local.set({
      interceptedContext: {
        url: message.url,
        method: message.method,
        response: message.response,
      },
    });

    sendResponse({ status: "contextStored" }); // Acknowledge that the context is stored
    return true; // Keep the sendResponse channel open for async operations
  }

  if (message.type === "submitQuery") {
    console.log("Query received from user:", message.query);

    chrome.storage.local.get("interceptedContext", (data) => {
      const context = data.interceptedContext;
      if (!context) {
        sendResponse({ status: "error", error: "No context available" });
        return;
      }

      queryExternalAI(message.query, context)
        .then((aiResponse) => {
          console.log("AI Server Response:", aiResponse);
          sendResponse({ status: "success", aiResponse });
        })
        .catch((error) => {
          console.error("Error querying AI server:", error);
          sendResponse({ status: "error", error: error.message });
        });
    });

    return true; // Keep the sendResponse channel open for async operations
  }
});

async function queryExternalAI(query, context) {
  const apiUrl = "http://localhost:3000/query"; // Replace with your deployed server URL

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, context }),
  });

  if (!response.ok) {
    throw new Error(`Server Error: ${response.statusText}`);
  }

  return response.json();
}
