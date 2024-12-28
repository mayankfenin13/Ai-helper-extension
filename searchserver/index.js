import express from "express";
import bodyParser from "body-parser";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = "maang";
const model = "multilingual-e5-large";

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Endpoint: Query for a user-specified text
app.post("/query", async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;

    if (!query) {
      return res
        .status(400)
        .json({ error: "Query is required in the request body." });
    }

    // Generate embedding for the query
    const queryEmbedding = await pc.inference.embed(model, [query], {
      inputType: "query",
    });

    // Fetch the Pinecone index
    const index = pc.index(indexName);

    // Search the index for the top K most similar vectors
    const queryResponse = await index.query({
      topK: topK,
      vector: queryEmbedding[0].values,
      includeValues: false,
      includeMetadata: true,
    });

    // Return the results to the client
    res.json({
      query,
      results: queryResponse.matches.map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      })),
    });
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    res.status(500).json({ error: "Failed to process the query." });
  }
});

app.post("/queryById", async (req, res) => {
  try {
    const { id, topK = 5 } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: "ID is required in the request body." });
    }

    // Fetch the Pinecone index
    const index = pc.index(indexName);

    // Fetch the embedding for the specified ID
    const fetchResponse = await index.fetch([id]);

    // Handle cases where the response is empty or the ID is not found
    if (
      !fetchResponse ||
      !fetchResponse.records ||
      !fetchResponse.records[id]
    ) {
      return res
        .status(404)
        .json({ error: `No vector found for the specified ID: ${id}` });
    }

    const embeddingVector = fetchResponse.records[id].values;

    if (!embeddingVector || embeddingVector.length === 0) {
      return res
        .status(404)
        .json({ error: `No vector data found for the specified ID: ${id}` });
    }

    // Search the index for the top K most similar vectors
    const queryResponse = await index.query({
      topK: topK,
      vector: embeddingVector,
      includeValues: false,
      includeMetadata: true,
    });

    // Return the results to the client
    res.json({
      id,
      results: queryResponse.matches.map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      })),
    });
  } catch (error) {
    console.error("Error querying Pinecone by ID:", error);
    res.status(500).json({ error: "Failed to process the query by ID." });
  }
});

// Start the server
app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
