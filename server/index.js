require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const { marked } = require("marked");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
const { User } = require("./model/user/user.mongo");
const { Conversation } = require("./model/conversation/conversation.mongo");

const app = express();
app.use(cors());
app.use(express.json());

const systemInstruction =
  "Instruction for AI Helper Bot: You are an AI teaching assistant specialized in Data Structures and Algorithms (DSA). Your primary role is to educate users, guide problem-solving, and explain DSA concepts step-by-step. Your goal is to foster understanding and empower users to solve problems independently, providing direct solutions only when explicitly requested or absolutely necessary.Scope of Assistance:Relevant Topics: Respond only to queries related to DSA topics suchas algorithms, data structures, complexity analysis, andDSA-specific problem-solving techniques.Redirect When Needed: Politely decline to answer unrelatedquestions and direct users to appropriate resources.Behavior:Step-by-Step Guidance:Prioritize Teaching:Lead users through the problem-solving process step-by-step.Confirm their understanding at each stage before moving forward.Encourage Problem Solving:Guide the user to reach the solution independently by askingquestions, providing hints, or breaking the problem into smallerparts.Offer explanations of key concepts, examples, pseudocode, oranalogies to clarify difficult topics.Avoid Giving Away the Answer:Unless explicitly asked for the final solution, refrain fromdirectly providing it. Instead, encourage exploration and reasoning.Solution Presentation:Explicit Requests:Provide the solution directly only when the user explicitly asksfor it or when it’s clear they’re stuck and need help progressing.Comparison with User Code:When relevant, compare the user’s code (code_written_by_user) withthe correct solution, highlighting key differences and areas ofimprovement.Learning Approach:Interactive Learning:Start by identifying the user’s specific query or issue.Ask clarifying questions if the problem is ambiguous.Constructive Feedback:Highlight progress and achievements to encourage users.Provide specific feedback on improvements where necessary.Focus on Understanding:Use plain and concise language for explanations.Offer examples or simplified steps to make concepts digestible.Limitations:Restrict to DSA:Avoid general programming assistance unrelated to DSA.No Academic Assignments:Avoid solving academic assignments or exams outright unless guidingthe user’s learning process.Engagement and Tone:Be encouraging, patient, and focused on teaching.Empower users to develop problem-solving skills while beingflexible enough to provide solutions when explicitly requested.";

if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in environment variables.");
  process.exit(1); // Exit the application if the API key is missing
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: systemInstruction,
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1); // Exit process with failure
  }
};

connectDB();

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.post("/query", async (req, res) => {
  const { query, context, db_data } = req.body;

  console.log("Received query:", query);
  console.log("Context:", context);
  console.log("DB Data:", db_data);

  if (!query || !db_data || !db_data.user_name || !db_data.problem_title) {
    return res.status(400).json({
      status: "failed",
      error:
        "Invalid request data. Ensure query, user_name, and problem_title are provided.",
    });
  }

  const user_name_from_db = db_data.user_name;
  const problem_title_from_db = db_data.problem_title;

  try {
    let user = await User.findOne({ username: user_name_from_db });
    if (!user) {
      user = await new User({
        username: user_name_from_db,
        conversations: [],
      }).save();
    }

    let conversation = await Conversation.findOne({
      owner: user._id,
      title: problem_title_from_db,
    });

    if (!conversation) {
      conversation = await new Conversation({
        title: problem_title_from_db,
        owner: user._id,
        messages: [],
      }).save();
      user.conversations.push(conversation._id);
      await user.save();
    }

    const history = conversation.messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));

    const chat = model.startChat({ history });
    const prompt = `${query}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    const result = await chat.sendMessage(prompt);
    const aiResponse = result.response.text();

    const marked_response = marked(aiResponse);

    conversation.messages.push(
      { role: "user", parts: query },
      { role: "model", parts: marked_response }
    );
    await conversation.save();

    res.status(200).json({
      status: "success",
      response: marked_response,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("Error querying Gemini AI or database operations:", error);
    res.status(500).json({
      status: "failed",
      error: error.message,
    });
  }
});

// New /history endpoint
app.get("/history", async (req, res) => {
  const { user_name, problem_title } = req.query;

  if (!user_name || !problem_title) {
    return res.status(400).json({
      status: "failed",
      error: "Missing user_name or problem_title in query parameters.",
    });
  }

  try {
    // Check if the user exists
    let user = await User.findOne({ username: user_name });
    if (!user) {
      // Create a new user if not found
      user = new User({ username: user_name });
      await user.save();
    }

    // Find the conversation associated with the user and problem_title
    const conversation = await Conversation.findOne({
      owner: user._id,
      title: problem_title,
    });

    if (!conversation) {
      // Return an empty conversation if none exists for this problem
      return res.status(200).json({
        status: "success",
        conversation: [],
      });
    }

    res.status(200).json({
      status: "success",
      conversation: conversation.messages,
    });
  } catch (error) {
    console.error("Error retrieving or creating user/conversation:", error);
    res.status(500).json({
      status: "failed",
      error: error.message,
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
