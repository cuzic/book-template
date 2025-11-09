import { GoogleGenAI } from "@google/generative-ai";
import { join } from "node:path";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const batchFilePath = join(import.meta.dir, "..", "batch-requests.jsonl");
  const batchFile = Bun.file(batchFilePath);

  if (!(await batchFile.exists())) {
    console.error("Error: batch-requests.jsonl not found. Run `bun run images:prompts` first.");
    process.exit(1);
  }

  const genAI = new GoogleGenAI({ apiKey });

  console.log("Uploading batch file...");

  const fileContent = await batchFile.text();
  const blob = new Blob([fileContent], { type: "application/jsonl" });

  const uploadResult = await genAI.files.upload({
    file: blob,
    config: {
      mimeType: "application/jsonl",
      displayName: "image-batch-requests",
    },
  });

  console.log(`File uploaded: ${uploadResult.name}`);

  console.log("Creating batch job...");

  const batchJob = await genAI.batches.create({
    model: "gemini-3-pro-image-preview",
    src: uploadResult.uri!,
  });

  console.log(`Batch job created: ${batchJob.name}`);
  console.log(`Status: ${batchJob.state}`);

  const jobInfoPath = join(import.meta.dir, "..", "batch-job.json");
  await Bun.write(
    jobInfoPath,
    JSON.stringify(
      {
        name: batchJob.name,
        state: batchJob.state,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`Job info saved to: ${jobInfoPath}`);
  console.log("\nUse `bun run images:download` to check status and download results.");
}

main().catch(console.error);
