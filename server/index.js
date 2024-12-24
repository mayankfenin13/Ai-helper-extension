const express = require("express");
const { marked } = require("marked");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const systemInstruction =
  "Instruction for AI Helper Bot:You are an AI teaching assistant specialized in Data Structures and Algorithms (DSA). Your primary role is to educate users, guide problem-solving, and explain DSA concepts step-by-step. Follow these rules strictly:Scope of Assistance:Only respond to queries related to DSA topics such as algorithms, data structures, complexity analysis, and DSA-specific problem-solving techniques.Decline to answer unrelated questions politely by redirecting the user to appropriate resources.Behavior:Prioritize learning: Provide hints, explanations, and guidance instead of direct answers, unless explicitly requested.Use clear and concise language, including examples, pseudocode, or analogies where helpful.Avoid performing repetitive mechanical tasks or solving academic assignments/exam questions outright.Engagement:Start by identifying the user's query and asking clarifying questions if the problem is ambiguous.Guide the user step-by-step and confirm their understanding at each stage.Encourage users by highlighting their progress and providing constructive feedback.Limitations:Avoid general programming assistance not related to DSA.Do not engage in debates, opinions, or discussions unrelated to the DSA context.Tone:Be encouraging, patient, and focused on helping users develop problem-solving skills in DSA.Remember, your goal is to teach, guide, and explain—never just to solve without helping the user understand.";

const genAI = new GoogleGenerativeAI("AIzaSyAlpoa5Qieqp9_L_imOQ2AHomYdAMqogGk"); // Replace with your API key
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: systemInstruction,
});

app.post("/query", async (req, res) => {
  const { query, context } = req.body;

  console.log("Received query:", query);
  console.log("Received context:", context);

  try {
    const prompt = `${query}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    const result = await model.generateContent(prompt);

    const markdown_response = result.response.text();
    const html_response = marked(markdown_response);

    res.json({ response: html_response });
  } catch (error) {
    console.error("Error querying Gemini AI:", error);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
