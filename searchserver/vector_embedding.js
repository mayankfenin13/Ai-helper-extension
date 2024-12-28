import fs from "fs";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();
// Step 1: Initialize Pinecone client
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = "maang";
const batchSize = 40; // Number of items to process per batch

// Step 2: Load the JSON file
const loadJsonFile = (filePath) => {
  try {
    const rawData = fs.readFileSync(filePath, "utf8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    process.exit(1);
  }
};

// Step 3: Prepare text for embedding
const prepareTextForEmbedding = (problem) => {
  const { body, hints, input_format, output_format, title, editorial_code } =
    problem.data;

  // Combine relevant fields into a single string
  return [
    title || "",
    body || "",
    hints?.hint1 || "",
    hints?.hint2 || "",
    hints?.solution_approach || "",
    input_format || "",
    output_format || "",
    editorial_code?.code || "",
  ].join("\n");
};

// Step 4: Generate embeddings in batches
const generateEmbeddings = async (texts, model) => {
  try {
    return await pc.inference.embed(model, texts, {
      inputType: "passage",
      truncate: "END",
    });
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return [];
  }
};

// Step 5: Upsert embeddings into Pinecone in batches
const upsertEmbeddings = async (index, records) => {
  try {
    await index.upsert(records);
  } catch (error) {
    console.error("Error upserting embeddings:", error);
  }
};

// Step 6: Process large JSON file in batches
const processJsonFile = async (filePath, model) => {
  const problemData = loadJsonFile(filePath);

  console.log(`Loaded ${problemData.length} problems from file.`);
  const index = pc.index(indexName);

  for (let i = 0; i < problemData.length; i += batchSize) {
    const batch = problemData.slice(i, i + batchSize);
    console.log(
      `Processing batch ${i / batchSize + 1} (${i} to ${i + batchSize})...`
    );

    const texts = batch.map((problem) => ({
      id: problem.data.id.toString(),
      text: prepareTextForEmbedding(problem),
    }));

    // Generate embeddings
    const embeddings = await generateEmbeddings(
      texts.map((t) => t.text),
      model
    );

    if (!embeddings || embeddings.length === 0) {
      console.error("No embeddings generated. Skipping batch.");
      continue;
    }

    // Prepare data for upsertion
    const records = texts.map((text, index) => ({
      id: text.id,
      values: embeddings[index]?.values || [],
      metadata: { text: text.text },
    }));

    // Upsert data into Pinecone
    await upsertEmbeddings(index, records);
    console.log(`Batch ${i / batchSize + 1} processed successfully.`);
  }

  console.log("All batches processed successfully.");
};

// Step 7: Execute the process
(async () => {
  const filePath = "problems_details.json"; // Path to your JSON file
  const model = "multilingual-e5-large"; // Embedding model name

  console.log("Starting process...");
  await processJsonFile(filePath, model);
  console.log("Process completed.");
})();
