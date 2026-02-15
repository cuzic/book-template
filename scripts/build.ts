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

type OutputFormat = "html" | "xhtml" | "epub" | "site" | "all";

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

async function buildSite(config: BookConfig): Promise<void> {
  const distDir = join(import.meta.dir, "..", "dist", "site");
  const chaptersDir = join(distDir, "chapters");
  await mkdir(distDir, { recursive: true });
  await mkdir(chaptersDir, { recursive: true });

  const processor = createHtmlProcessor();
  const chapterFiles = await getChapterFiles();
  const chapters: Chapter[] = [];

  for (const chapterPath of chapterFiles) {
    const chapter = await processMarkdown(chapterPath, processor);
    chapters.push(chapter);
  }

  // Generate individual chapter pages
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const prevChapter = i > 0 ? chapters[i - 1] : null;
    const nextChapter = i < chapters.length - 1 ? chapters[i + 1] : null;

    const nav = `
<nav class="chapter-nav">
  ${prevChapter ? `<a href="${prevChapter.filename}.html" class="prev">&larr; ${prevChapter.title}</a>` : '<span class="prev"></span>'}
  <a href="../index.html" class="toc">目次</a>
  ${nextChapter ? `<a href="${nextChapter.filename}.html" class="next">${nextChapter.title} &rarr;</a>` : '<span class="next"></span>'}
</nav>`;

    const html = wrapHtmlWithNav(chapter.content, chapter.title, nav, config.title);
    const outputPath = join(chaptersDir, `${chapter.filename}.html`);
    await Bun.write(outputPath, html);
    console.log(`Generated: ${outputPath}`);
  }

  // Generate single-page version
  const allContent = chapters.map((ch) => `<article id="${ch.filename}">\n${ch.content}\n</article>`).join("\n<hr class=\"chapter-break\">\n");
  const singlePageHtml = wrapHtmlWithNav(allContent, `${config.title} - 全章`, '', config.title);
  const singlePagePath = join(distDir, "single.html");
  await Bun.write(singlePagePath, singlePageHtml);
  console.log(`Generated: ${singlePagePath}`);

  // Generate index page
  const tocItems = chapters
    .map((ch) => `    <li><a href="chapters/${ch.filename}.html">${ch.title}</a></li>`)
    .join("\n");

  const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="book-header">
    <h1>${config.title}</h1>
    <p class="author">${config.author}</p>
    <p class="description">${config.description}</p>
  </header>

  <nav class="book-nav">
    <a href="single.html" class="single-page-link">全章を1ページで読む</a>
    <a href="book.epub" class="epub-link" download>EPUBをダウンロード</a>
  </nav>

  <main>
    <h2>目次</h2>
    <ol class="toc">
${tocItems}
    </ol>
  </main>

  <footer>
    <p>${config.publisher}</p>
  </footer>
</body>
</html>`;

  const indexPath = join(distDir, "index.html");
  await Bun.write(indexPath, indexHtml);
  console.log(`Generated: ${indexPath}`);

  // Copy CSS and EPUB
  await Bun.write(join(distDir, "style.css"), siteCss);
  await Bun.write(join(chaptersDir, "style.css"), siteCss);
  console.log(`Generated: ${join(distDir, "style.css")}`);

  // Copy EPUB if exists
  const epubSrc = join(import.meta.dir, "..", "dist", "book.epub");
  const epubFile = Bun.file(epubSrc);
  if (await epubFile.exists()) {
    const epubDest = join(distDir, "book.epub");
    await Bun.write(epubDest, epubFile);
    console.log(`Copied: ${epubDest}`);
  }

  // Copy images
  await copyImages(distDir);
}

async function copyImages(siteDir: string): Promise<void> {
  const srcImagesDir = join(import.meta.dir, "..", "src", "chapters", "images");
  const destImagesDir = join(siteDir, "images");
  const chapterImagesDir = join(siteDir, "chapters", "images");

  try {
    const files = await readdir(srcImagesDir);
    if (files.length > 0) {
      await mkdir(destImagesDir, { recursive: true });
      await mkdir(chapterImagesDir, { recursive: true });

      for (const file of files) {
        const srcPath = join(srcImagesDir, file);
        const srcFile = Bun.file(srcPath);

        // Copy to site root images dir
        await Bun.write(join(destImagesDir, file), srcFile);
        // Copy to chapters/images for relative paths from chapter pages
        await Bun.write(join(chapterImagesDir, file), srcFile);

        console.log(`Copied image: ${file}`);
      }
    }
  } catch {
    // No images directory, skip
  }
}

function wrapHtmlWithNav(content: string, title: string, nav: string, bookTitle: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${bookTitle}</title>
  <link rel="stylesheet" href="${nav ? '' : ''}style.css">
</head>
<body>
${nav}
<main>
${content}
</main>
${nav}
</body>
</html>`;
}

const siteCss = `
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

hr.chapter-break {
  margin: 4rem 0;
  border-top: 3px double #333;
}

/* Navigation */
.chapter-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #ddd;
  margin-bottom: 2rem;
}

.chapter-nav:last-of-type {
  border-bottom: none;
  border-top: 1px solid #ddd;
  margin-top: 2rem;
  margin-bottom: 0;
}

.chapter-nav a {
  color: #0066cc;
  text-decoration: none;
}

.chapter-nav a:hover {
  text-decoration: underline;
}

.chapter-nav .prev,
.chapter-nav .next {
  flex: 1;
}

.chapter-nav .next {
  text-align: right;
}

.chapter-nav .toc {
  flex: 0 0 auto;
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

/* Book header */
.book-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #333;
}

.book-header h1 {
  border: none;
  font-size: 2.5rem;
}

.book-header .author {
  font-size: 1.2rem;
  color: #666;
}

.book-header .description {
  margin-top: 1rem;
  color: #666;
}

/* Book navigation */
.book-nav {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.book-nav a {
  padding: 0.75rem 1.5rem;
  background: #0066cc;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}

.book-nav a:hover {
  background: #0052a3;
}

.book-nav .epub-link {
  background: #28a745;
}

.book-nav .epub-link:hover {
  background: #218838;
}

/* TOC */
.toc {
  list-style: decimal;
  padding-left: 2rem;
}

.toc li {
  margin: 0.5rem 0;
}

.toc a {
  color: #0066cc;
  text-decoration: none;
}

.toc a:hover {
  text-decoration: underline;
}

/* Footer */
footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #ddd;
  text-align: center;
  color: #666;
}

/* Article */
article {
  margin-bottom: 2rem;
}
`;

async function main() {
  const args = process.argv.slice(2);
  let format: OutputFormat = "all";

  const formatIndex = args.indexOf("--format");
  if (formatIndex !== -1 && args[formatIndex + 1]) {
    const requestedFormat = args[formatIndex + 1] as OutputFormat;
    if (["html", "xhtml", "epub", "site", "all"].includes(requestedFormat)) {
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

  if (format === "all" || format === "site") {
    await buildSite(config);
  }

  console.log("Build complete!");
}

main().catch(console.error);
