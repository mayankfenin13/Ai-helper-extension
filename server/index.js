const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI("AIzaSyAlpoa5Qieqp9_L_imOQ2AHomYdAMqogGk"); // Replace with your API key
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post("/query", async (req, res) => {
  const { query, context } = req.body;

  console.log("Received query:", query);
  console.log("Received context:", context);

  try {
    const prompt = `${query}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (error) {
    console.error("Error querying Gemini AI:", error);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
