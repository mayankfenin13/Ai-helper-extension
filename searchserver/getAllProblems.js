import axios from "axios";
import fs from "fs/promises";

const auth = "Bearer " + "auth_token_from_maan.in";

async function fetchAllProblems() {
  try {
    const api = "https://api2.maang.in/problems/user?page=1&page_size=507";

    const res = await axios.get(api, {
      headers: {
        Authorization: auth,
      },
    });

    return res.data.data.problems; // Return the list of problems
  } catch (err) {
    console.error("Error fetching all problems:", err.message);
    return [];
  }
}

async function fetchProblemDetails(problemId) {
  try {
    const api = `https://api2.maang.in/problems/user/${problemId}`;

    const res = await axios.get(api, {
      headers: {
        Authorization: auth,
      },
    });

    return res.data; // Return detailed information about the problem
  } catch (err) {
    console.error(
      `Error fetching url https://api2.maang.in/problems/user/${problemId} `,
      err.message
    );
    return null;
  }
}

async function fetchProblemDetailsParallel(problems) {
  // Fetch details for each problem ID in parallel
  const promises = problems.map((problem) => fetchProblemDetails(problem.id));

  const results = await Promise.all(promises);
  return results.filter((details) => details !== null); // Filter out any failed requests
}

async function saveToFile(data, filename) {
  try {
    await fs.writeFile(filename, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Data successfully saved to ${filename}`);
  } catch (err) {
    console.error("Error saving data to file:", err.message);
  }
}

async function main() {
  // Step 1: Fetch all problems
  const problems = await fetchAllProblems();

  if (!problems.length) {
    console.error("No problems fetched.");
    return;
  }

  console.log("Total problems fetched:", problems.length);

  //Fetch detailed information for all problems in parallel
  const detailedProblems = await fetchProblemDetailsParallel(problems);

  console.log("Fetched details for all problems.");

  // Save detailed problems to a file
  await saveToFile(detailedProblems, "problems_details.json");
}

main();
