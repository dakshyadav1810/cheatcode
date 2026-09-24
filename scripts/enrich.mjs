// Fetches LeetCode difficulty/tags/statement for every leetcode row. Cached to data/leetcode_cache.json.
// Run: node scripts/enrich.mjs
import fs from "node:fs";

const rows = JSON.parse(fs.readFileSync("data/dsa_dataset.json", "utf8"));
const CACHE = "data/leetcode_cache.json";
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : { list: null, problems: {} };

async function gql(query, variables) {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).data;
}

if (!cache.list) {
  cache.list = [];
  let total = Infinity;
  for (let skip = 0; skip < total; skip += 100) {
    const d = await gql(
      `query($skip:Int,$limit:Int){problemsetQuestionList:questionList(categorySlug:"",limit:$limit,skip:$skip,filters:{}){total:totalNum questions:data{difficulty frontendQuestionId:questionFrontendId title titleSlug topicTags{name slug} isPaidOnly}}}`,
      { skip, limit: 100 },
    );
    total = d.problemsetQuestionList.total;
    cache.list.push(...d.problemsetQuestionList.questions);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("list size", cache.list.length, "of", total);
  fs.writeFileSync(CACHE, JSON.stringify(cache));
}

const byId = new Map(cache.list.map((q) => [Number(q.frontendQuestionId), q]));

for (const r of rows.filter((r) => r.source === "leetcode")) {
  const q = byId.get(r.leetcode_id);
  if (!q) { console.log("NO ID MATCH", r.leetcode_id, r.title); continue; }
  const linkSlug = r.link?.match(/problems\/([^/]+)/)?.[1];
  if (linkSlug !== q.titleSlug) console.log("LINK FIX", r.leetcode_id, linkSlug, "->", q.titleSlug);
  if (cache.problems[q.titleSlug]) continue;
  const entry = { slug: q.titleSlug, difficulty: q.difficulty, tags: q.topicTags.map((t) => t.name), paid: q.isPaidOnly, content: null };
  if (!q.isPaidOnly) {
    try {
      const d = await gql(`query($s:String!){question(titleSlug:$s){content}}`, { s: q.titleSlug });
      entry.content = d.question?.content ?? null;
    } catch (e) { console.log("FETCH FAIL", q.titleSlug, e.message); continue; }
    await new Promise((r) => setTimeout(r, 400));
  }
  cache.problems[q.titleSlug] = entry;
  fs.writeFileSync(CACHE, JSON.stringify(cache));
}
console.log("done", Object.keys(cache.problems).length);
