import { GoogleGenAI } from "@google/generative-ai";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

interface BatchJobInfo {
  name: string;
  state: string;
  createdAt: string;
}

interface BatchResult {
  customId: string;
  response: {
    candidates: Array<{
      content: {
        parts: Array<{
          inlineData?: {
            mimeType: string;
            data: string;
          };
        }>;
      };
    }>;
  };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const jobInfoPath = join(import.meta.dir, "..", "batch-job.json");
  const jobInfoFile = Bun.file(jobInfoPath);

  if (!(await jobInfoFile.exists())) {
    console.error("Error: batch-job.json not found. Run `bun run images:submit` first.");
    process.exit(1);
  }

  const jobInfo: BatchJobInfo = await jobInfoFile.json();
  const genAI = new GoogleGenAI({ apiKey });

  console.log(`Checking batch job: ${jobInfo.name}`);

  const batch = await genAI.batches.get({ name: jobInfo.name });

  console.log(`Status: ${batch.state}`);

  if (batch.state !== "JOB_STATE_SUCCEEDED") {
    if (batch.state === "JOB_STATE_FAILED") {
      console.error("Batch job failed.");
      process.exit(1);
    }
    console.log("Batch job is still processing. Please try again later.");
    process.exit(0);
  }

  if (!batch.destGcsUri) {
    console.error("Error: No output destination found in batch job.");
    process.exit(1);
  }

  console.log("Downloading results...");

  const outputDir = join(import.meta.dir, "..", "src", "chapters", "images");
  await mkdir(outputDir, { recursive: true });

  const response = await fetch(batch.destGcsUri);
  const resultsText = await response.text();
  const results = resultsText
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as BatchResult);

  for (const result of results) {
    const imageName = result.customId;
    const candidates = result.response?.candidates;

    if (!candidates || candidates.length === 0) {
      console.warn(`No image generated for: ${imageName}`);
      continue;
    }

    const parts = candidates[0].content?.parts;
    if (!parts) {
      console.warn(`No content parts for: ${imageName}`);
      continue;
    }

    for (const part of parts) {
      if (part.inlineData) {
        const { mimeType, data } = part.inlineData;
        const extension = mimeType.split("/")[1] || "png";
        const outputPath = join(outputDir, `${imageName}.${extension}`);

        const imageBuffer = Buffer.from(data, "base64");
        await Bun.write(outputPath, imageBuffer);

        console.log(`Saved: ${outputPath}`);
      }
    }
  }

  console.log("Download complete!");
}

main().catch(console.error);
