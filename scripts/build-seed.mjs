// Merges dataset + LeetCode cache + reference solutions into data/seed.json.
// Run: node scripts/build-seed.mjs
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const rows = JSON.parse(fs.readFileSync("data/dsa_dataset.json", "utf8"));
const cache = JSON.parse(fs.readFileSync("data/leetcode_cache.json", "utf8"));
const byId = new Map(cache.list.map((q) => [Number(q.frontendQuestionId), q]));

const solutions = {};
for (const f of fs.readdirSync("data/solutions").sort()) {
  const text = fs.readFileSync(`data/solutions/${f}`, "utf8");
  for (const chunk of text.split(/^### (\d+)\n/m).slice(1).reduce((a, x, i, arr) => (i % 2 ? a : [...a, [arr[i], arr[i + 1]]]), [])) {
    solutions[chunk[0]] = chunk[1].trimEnd();
  }
}

// Non-leetcode rows have no fetched tags
const manualTags = {
  65: ["Dynamic Programming"],
  130: ["Bit Manipulation"],
  135: ["Greedy", "Sorting"],
  136: ["Prefix Sum", "Array"],
  137: ["Math"],
  138: ["Binary Search", "Dynamic Programming"],
  140: ["Dynamic Programming", "Math"],
  141: ["Union-Find", "Graph Theory"],
  143: ["Greedy", "Sorting"],
};

const sanitize = (html) =>
  html
    .replace(/<(script|iframe|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

const cards = [];
const problems = [];
for (const r of rows) {
  const code = solutions[r.row];
  if (!code) problems.push(`no solution for row ${r.row} ${r.title}`);
  else {
    try {
      execFileSync("python3", ["-c", "import sys;compile(sys.stdin.read(),'x','exec')"], { input: code, stdio: ["pipe", "pipe", "pipe"] });
    } catch (e) {
      problems.push(`syntax error in row ${r.row} ${r.title}: ${e.stderr.toString().trim().split("\n").pop()}`);
    }
  }

  let prompt = "", tags = manualTags[r.row] ?? [], difficulty = null;
  let core = r.core_question;
  if (r.source === "leetcode") {
    const q = byId.get(r.leetcode_id);
    const e = q && cache.problems[q.titleSlug];
    if (!e) problems.push(`no LeetCode data for row ${r.row}`);
    else {
      difficulty = e.difficulty;
      tags = e.tags;
      prompt = e.content ? sanitize(e.content) : "";
      if (!e.content) problems.push(`no statement (paid?) row ${r.row} ${r.title}`);
    }
  } else if (r.source === "company_oa") {
    prompt = r.core_question; // no public statement exists; the notes ARE the prompt
    core = "";
  }

  cards.push({
    key: `dsa:row-${r.row}`,
    kind: "dsa",
    title: r.title,
    prompt,
    tags,
    difficulty,
    category: r.category,
    revised: r.revised,
    meta: clean({
      source: r.source,
      oa_label: r.oa_label,
      leetcode_id: r.leetcode_id,
      link: r.link,
      core_question: core,
      solution_idea: r.solution_idea,
      learnings: r.learnings,
      code,
    }),
  });
}

fs.writeFileSync("data/seed.json", JSON.stringify(cards));
console.log(`${cards.length} cards written`);
console.log(problems.length ? problems.join("\n") : "no problems");
