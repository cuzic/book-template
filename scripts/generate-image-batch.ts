import { join } from "node:path";

interface ImageDefinition {
  name: string;
  prompt: string;
  aspectRatio: "3:4" | "1:1" | "4:3";
}

interface ImagesConfig {
  images: ImageDefinition[];
}

interface BatchRequest {
  customId: string;
  request: {
    model: string;
    contents: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    generationConfig: {
      responseModalities: string[];
      aspectRatio: string;
      resolution: string;
    };
  };
}

async function main() {
  const configPath = join(import.meta.dir, "..", "src", "images.json");
  const file = Bun.file(configPath);
  const config: ImagesConfig = await file.json();

  const batchRequests: string[] = [];

  for (const image of config.images) {
    const request: BatchRequest = {
      customId: image.name,
      request: {
        model: "gemini-3-pro-image-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: image.prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["image"],
          aspectRatio: image.aspectRatio,
          resolution: "2K",
        },
      },
    };

    batchRequests.push(JSON.stringify(request));
  }

  const outputPath = join(import.meta.dir, "..", "batch-requests.jsonl");
  await Bun.write(outputPath, batchRequests.join("\n") + "\n");

  console.log(`Generated batch requests: ${outputPath}`);
  console.log(`Total images: ${config.images.length}`);
}

main().catch(console.error);
