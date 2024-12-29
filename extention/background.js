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
      if (tabs.length === 0) {
        sendResponse({ status: "error", error: "No active tab found" });
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "getUserCode", id },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error in getUserCode message:",
              chrome.runtime.lastError.message
            );
            sendResponse({
              status: "error",
              error: chrome.runtime.lastError.message,
            });
            return;
          }

          const userCode = response?.userCode || null;

          const extractedDetails = {
            problemTitle: parsedResponse.data?.title,
            context: {
              ...extractDSAProblemDetails(parsedResponse),
              id: parsedResponse.data?.id, // Include problem ID
              code_written_by_user: userCode,
            },
          };

          chrome.storage.local.set(
            { interceptedContext: extractedDetails },
            () => {
              sendResponse({
                status: "contextStored",
                message: extractedDetails,
              });
            }
          );
        }
      );
    });

    return true; // Keeps the port open for async response
  }

  if (message.type === "get_user_code") {
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
      if (tabs.length === 0) {
        sendResponse({ status: "error", error: "No active tab found" });
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "getUserCode", id },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error in getUserCode message:",
              chrome.runtime.lastError.message
            );
            sendResponse({
              status: "error",
              error: chrome.runtime.lastError.message,
            });
            return;
          }

          const userCode = response?.userCode || null;

          console.log("User code received from content script:", userCode);
          chrome.storage.local.get("interceptedContext", (data) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error accessing interceptedContext:",
                chrome.runtime.lastError.message
              );
              sendResponse({
                status: "error",
                error: chrome.runtime.lastError.message,
              });
              return;
            }

            const interceptedContext = data.interceptedContext || {};
            const code_before = interceptedContext.context.code_written_by_user;

            if (interceptedContext.context) {
              interceptedContext.context.code_written_by_user =
                userCode || code_before;
            } else {
              console.warn(
                "No context found in interceptedContext; creating new context."
              );
              interceptedContext.context = { code_written_by_user: userCode };
            }

            chrome.storage.local.set({ interceptedContext }, () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error setting interceptedContext:",
                  chrome.runtime.lastError.message
                );
                sendResponse({
                  status: "error",
                  error: chrome.runtime.lastError.message,
                });
                return;
              }

              sendResponse({ status: "contextStored", message: userCode });
            });
          });
        }
      );
    });

    return true; // Keeps the port open for async response
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
