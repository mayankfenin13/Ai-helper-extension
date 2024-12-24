chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "apiIntercepted") {
    console.log("Message received from content script:", message);

    let parsedResponse;
    try {
      // Parse the stringified JSON
      parsedResponse = JSON.parse(message.response);
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
      sendResponse({
        status: "error",
        error: "Invalid JSON format in response",
      });
      return;
    }

    // Extract DSA problem details
    const extractedDetails = extractDSAProblemDetails(parsedResponse);

    // Store the intercepted context in the background script
    chrome.storage.local.set({
      interceptedContext: {
        url: message.url,
        method: message.method,
        extractedDetails, // Store the structured context
      },
    });

    sendResponse({ status: "contextStored", message: extractedDetails }); // Acknowledge that the context is stored
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

      queryExternalAI(message.query, context.extractedDetails)
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

// Extraction function
function extractDSAProblemDetails(data) {
  return {
    title: data.data.title,
    description: data.data.body,
    constraints: data.data.constraints,
    inputFormat: data.data.input_format,
    outputFormat: data.data.output_format,
    hints: data.data.hints,
    samples: data.data.samples.map((sample) => ({
      input: sample.input,
      output: sample.output,
    })),
    languagesSupported: data.data.languages,
    editorialCode: data.data.editorial_code.map((code) => ({
      language: code.language,
      code: code.code,
    })),
    solutionApproach: data.data.hints.solution_approach,
  };
}
