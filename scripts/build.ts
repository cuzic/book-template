import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import EPub from "epub-gen-memory";
import { readdir, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";

interface BookConfig {
  title: string;
  author: string;
  language: string;
  identifier: string;
  publisher: string;
  description: string;
  cover: string;
}

interface Chapter {
  title: string;
  content: string;
  filename: string;
}

type OutputFormat = "html" | "xhtml" | "epub" | "all";

async function loadBookConfig(): Promise<BookConfig> {
  const configPath = join(import.meta.dir, "..", "book.json");
  const file = Bun.file(configPath);
  return await file.json();
}

async function getChapterFiles(): Promise<string[]> {
  const chaptersDir = join(import.meta.dir, "..", "src", "chapters");
  const files = await readdir(chaptersDir);
  return files
    .filter((f) => extname(f) === ".md")
    .sort()
    .map((f) => join(chaptersDir, f));
}

function createHtmlProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCjkFriendly)
    .use(remarkCjkFriendlyGfmStrikethrough)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify);
}

function createXhtmlProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCjkFriendly)
    .use(remarkCjkFriendlyGfmStrikethrough)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, {
      closeSelfClosing: true,
      tightSelfClosing: false,
      upperDoctype: true,
    });
}

async function processMarkdown(
  filePath: string,
  processor: ReturnType<typeof createHtmlProcessor>
): Promise<Chapter> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const result = await processor.process(content);

  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : basename(filePath, ".md");

  return {
    title,
    content: String(result),
    filename: basename(filePath, ".md"),
  };
}

function wrapHtml(content: string, title: string, isXhtml: boolean): string {
  if (isXhtml) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja">
<head>
  <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
${content}
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${content}
</body>
</html>`;
}

const defaultCss = `
body {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
  line-height: 1.8;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.4;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

h1 { font-size: 2rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }

p { margin: 1rem 0; }

pre {
  background: #f5f5f5;
  padding: 1rem;
  overflow-x: auto;
  border-radius: 4px;
}

code {
  font-family: "Source Code Pro", Consolas, monospace;
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
}

pre code {
  background: none;
  padding: 0;
}

blockquote {
  border-left: 4px solid #ddd;
  margin: 1rem 0;
  padding-left: 1rem;
  color: #666;
}

ul, ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 2rem 0;
}
`;

async function buildHtml(chapters: Chapter[], config: BookConfig): Promise<void> {
  const distDir = join(import.meta.dir, "..", "dist", "html");
  await mkdir(distDir, { recursive: true });

  const processor = createHtmlProcessor();

  for (const chapterPath of await getChapterFiles()) {
    const chapter = await processMarkdown(chapterPath, processor);
    const html = wrapHtml(chapter.content, chapter.title, false);
    const outputPath = join(distDir, `${chapter.filename}.html`);
    await Bun.write(outputPath, html);
    console.log(`Generated: ${outputPath}`);
  }

  await Bun.write(join(distDir, "style.css"), defaultCss);
  console.log(`Generated: ${join(distDir, "style.css")}`);
}

async function buildXhtml(chapters: Chapter[], config: BookConfig): Promise<void> {
  const distDir = join(import.meta.dir, "..", "dist", "xhtml");
  await mkdir(distDir, { recursive: true });

  const processor = createXhtmlProcessor();

  for (const chapterPath of await getChapterFiles()) {
    const chapter = await processMarkdown(chapterPath, processor);
    const xhtml = wrapHtml(chapter.content, chapter.title, true);
    const outputPath = join(distDir, `${chapter.filename}.xhtml`);
    await Bun.write(outputPath, xhtml);
    console.log(`Generated: ${outputPath}`);
  }

  await Bun.write(join(distDir, "style.css"), defaultCss);
  console.log(`Generated: ${join(distDir, "style.css")}`);
}

async function buildEpub(chapters: Chapter[], config: BookConfig): Promise<void> {
  const distDir = join(import.meta.dir, "..", "dist");
  await mkdir(distDir, { recursive: true });

  const processor = createXhtmlProcessor();
  const epubChapters: Array<{ title: string; content: string }> = [];

  for (const chapterPath of await getChapterFiles()) {
    const chapter = await processMarkdown(chapterPath, processor);
    epubChapters.push({
      title: chapter.title,
      content: chapter.content,
    });
  }

  const coverPath = join(import.meta.dir, "..", config.cover);
  const coverFile = Bun.file(coverPath);
  const coverExists = await coverFile.exists();

  const epubOptions: Parameters<typeof EPub>[0] = {
    title: config.title,
    author: config.author,
    language: config.language,
    identifier: config.identifier,
    publisher: config.publisher,
    description: config.description,
    css: defaultCss,
  };

  if (coverExists) {
    epubOptions.cover = coverPath;
  }

  const epub = await EPub(epubOptions, epubChapters);

  const outputPath = join(distDir, "book.epub");
  await Bun.write(outputPath, epub);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  let format: OutputFormat = "all";

  const formatIndex = args.indexOf("--format");
  if (formatIndex !== -1 && args[formatIndex + 1]) {
    const requestedFormat = args[formatIndex + 1] as OutputFormat;
    if (["html", "xhtml", "epub", "all"].includes(requestedFormat)) {
      format = requestedFormat;
    }
  }

  console.log(`Building book (format: ${format})...`);

  const config = await loadBookConfig();
  const chapters: Chapter[] = [];

  if (format === "all" || format === "html") {
    await buildHtml(chapters, config);
  }

  if (format === "all" || format === "xhtml") {
    await buildXhtml(chapters, config);
  }

  if (format === "all" || format === "epub") {
    await buildEpub(chapters, config);
  }

  console.log("Build complete!");
}

main().catch(console.error);
