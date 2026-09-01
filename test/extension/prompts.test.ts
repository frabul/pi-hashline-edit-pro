import { readFileSync, readdirSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { loadGuide } from "../../src/prompts";
import { regRead } from "../../src/read";
import { makeFakePiRegistry } from "../support/fixtures";

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

const replacePrompt = readFileSync(
  new URL("../../prompts/replace.md", import.meta.url),
  "utf-8",
);

describe("prompts/replace.md (model-facing contract)", () => {
  it("declares the tool purpose", () => {
    expect(replacePrompt).toMatch(/Replace a range of lines \(or a single line\) in a text file.*anchors/);
  });
});

const readPrompt = readFileSync(
  new URL("../../prompts/read.md", import.meta.url),
  "utf-8",
);

describe("prompts/read.md (model-facing contract)", () => {
  it("declares the HASH|content output format", () => {
    expect(readPrompt).toMatch(/anchor│content/);
    expect(readPrompt).toMatch(/3-char/);
  });

  it("specifies the alphanumeric anchor alphabet", () => {
    expect(readPrompt).toMatch(/3-char/);
    expect(readPrompt).toContain("alphanumeric");
  });

  it("documents pagination support", () => {
    expect(readPrompt).toContain("offset/limit");
  });

  it("documents file-kind handling", () => {
    expect(readPrompt).toMatch(/Images/);
    expect(readPrompt).toMatch(/Binary/);
    expect(readPrompt).toMatch(/directory/);
  });
});

describe("prompt guidelines", () => {
  const guidelinesFiles: Array<[string, string]> = [
    ["read_with_anchors", "read-guidelines.md"],
    ["anchor_grep", "grep-guidelines.md"],
    ["replace", "replace-guidelines.md"],
    ["insert", "insert-guidelines.md"],
    ["undo_last_change", "undo-last-change-guidelines.md"],
  ];

  it("every per-tool guidelines file loads without template variables", () => {
    for (const [, file] of guidelinesFiles) {
      const content = readFileSync(
        new URL(`../../prompts/${file}`, import.meta.url),
        "utf-8",
      );
      expect(content).toContain("- ");
      expect(content).not.toContain("{{");
      expect(content).not.toContain("hash_bounds");
      expect(content).not.toContain("new_content");
    }
  });

  it("each tool's guidelines name their owning tool", () => {
    for (const [tool, file] of guidelinesFiles) {
      const guidelines = loadGuide(`../prompts/${file}`);
      expect(guidelines.length).toBeGreaterThan(0);
      expect(guidelines.every((g) => g.includes("`" + tool + "`"))).toBe(true);
    }
  });
});

describe("read tool guidelines", () => {
  it("always includes the re-read note for fresh anchors after edits", () => {
    const { pi, getTool } = makeFakePiRegistry();
    regRead(pi);
    const tool = getTool("read_with_anchors");
    const guidelines = tool.promptGuidelines as string[];
    expect(guidelines.some((g) => g.includes("call again after an edit"))).toBe(true);
    expect(guidelines.some((g) => g.includes("before `replace`"))).toBe(true);
  });

  it("keeps read_with_anchors guidelines scoped to read_with_anchors (regression: shared suite file leaked inactive tools)", () => {
    const { pi, getTool } = makeFakePiRegistry();
    regRead(pi);
    const tool = getTool("read_with_anchors");
    const guidelines = tool.promptGuidelines as string[];
    expect(guidelines.some((g) => g.includes("run `anchor_grep` for that exact snippet"))).toBe(false);
    expect(guidelines.some((g) => g.includes("`undo_last_change`: a successful"))).toBe(false);
  });
});

describe("prompt file packaging", () => {
  it("every loadP/loadGuide reference resolves to a prompt file shipped in the package", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
    ) as { files: string[] };
    expect(pkg.files).toContain("prompts");
    expect(pkg.files).toContain("src");

    const srcDir = fileURLToPath(new URL("../../src", import.meta.url));
    let refs = 0;
    for (const file of collectTsFiles(srcDir)) {
      const content = readFileSync(file, "utf-8");
      for (const match of content.matchAll(/load(?:P|Guide)\("((?:\.\.\/)+prompts\/[^"]+)"\)/g)) {
        refs++;
        const promptPath = match[1]!;
        expect(existsSync(resolve(dirname(file), promptPath))).toBe(true);
      }
    }
    expect(refs).toBeGreaterThan(0);
  });
});