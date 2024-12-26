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

    const extractedDetails = {
      problemTitle: parsedResponse.data?.title,
      context: extractDSAProblemDetails(parsedResponse),
    };

    chrome.storage.local.set({
      interceptedContext: extractedDetails,
    });

    sendResponse({ status: "contextStored", message: extractedDetails });
    return true;
  }
});

// Helper function to extract context
function extractDSAProblemDetails(data) {
  return {
    title: data.data?.title,
    description: data.data?.body,
    constraints: data.data?.constraints,
    inputFormat: data.data?.input_format,
    outputFormat: data.data?.output_format,
    hints: data.data?.hints,
    samples: data.data?.samples.map((sample) => ({
      input: sample.input,
      output: sample.output,
    })),
    languagesSupported: data.data?.languages,
  };
}
