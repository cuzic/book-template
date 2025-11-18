import { $ } from "bun";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const EPUBCHECK_VERSION = "5.1.0";
const EPUBCHECK_URL = `https://github.com/w3c/epubcheck/releases/download/v${EPUBCHECK_VERSION}/epubcheck-${EPUBCHECK_VERSION}.zip`;

async function ensureEpubcheck(): Promise<string> {
  const toolsDir = join(import.meta.dir, "..", ".tools");
  const epubcheckDir = join(toolsDir, `epubcheck-${EPUBCHECK_VERSION}`);
  const jarPath = join(epubcheckDir, `epubcheck.jar`);

  const jarFile = Bun.file(jarPath);
  if (await jarFile.exists()) {
    return jarPath;
  }

  console.log(`Downloading epubcheck v${EPUBCHECK_VERSION}...`);

  await mkdir(toolsDir, { recursive: true });

  const zipPath = join(toolsDir, "epubcheck.zip");
  await $`curl -L -o ${zipPath} ${EPUBCHECK_URL}`;

  console.log("Extracting epubcheck...");
  await $`unzip -q -o ${zipPath} -d ${toolsDir}`;
  await $`rm ${zipPath}`;

  console.log(`epubcheck installed at ${epubcheckDir}`);
  return jarPath;
}

async function main() {
  const epubPath = process.argv[2] || join(import.meta.dir, "..", "dist", "book.epub");

  const epubFile = Bun.file(epubPath);
  if (!(await epubFile.exists())) {
    console.error(`Error: EPUB file not found: ${epubPath}`);
    console.error("Run `bun run build:epub` first.");
    process.exit(1);
  }

  const jarPath = await ensureEpubcheck();

  console.log(`\nChecking: ${epubPath}\n`);

  const result = await $`java -jar ${jarPath} ${epubPath}`.nothrow();

  process.exit(result.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
