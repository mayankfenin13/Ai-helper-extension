chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "apiIntercepted") {
    console.log("Message received from content script:", message);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(message.response);
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
      sendResponse({ status: "error", error: "Invalid JSON format" });
      return;
    }

    const id = parsedResponse.data?.id;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "getUserCode", id },
        (response) => {
          const userCode = response?.userCode || null;

          // Extract problem details, including user code
          const extractedDetails = {
            problemTitle: parsedResponse.data?.title,
            context: {
              ...extractDSAProblemDetails(parsedResponse),
              code_written_by_use: userCode,
            },
          };

          // Store in Chrome storage
          chrome.storage.local.set({
            interceptedContext: extractedDetails,
          });

          sendResponse({ status: "contextStored", message: extractedDetails });
        }
      );
    });

    return true;
  }
});

// Helper function to extract problem details
function extractDSAProblemDetails(data) {
  return {
    id: data.data?.id,
    title: data.data?.title || "No Problem Title",
    description: data.data?.body || "No Problem Description",
    constraints: data.data?.constraints || "No Constraints",
    inputFormat: data.data?.input_format || "No Input Format",
    outputFormat: data.data?.output_format || "No Output Format",
    hints: data.data?.hints || [],
    solution: data.data?.editorial_code || "No Editorial Code",
    samples: data.data?.samples.map((sample) => ({
      input: sample.input || "No Sample Input",
      output: sample.output || "No Sample Output",
    })),
    languagesSupported: data.data?.languages || [],
  };
}
