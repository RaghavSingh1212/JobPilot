const test = require("node:test");
const assert = require("node:assert/strict");
const llm = require("../src/shared/llmAssistant");

test("buildDraftPrompt includes profile and job context", () => {
  const prompt = llm.buildDraftPrompt({
    profile: {
      headline: "Software Engineer",
      skills: ["JavaScript", "LLM", "RAG"],
      experience: [{ company: "Acme", title: "AI Intern", bullets: ["Built LLM eval tooling."] }]
    },
    job: {
      company: "Notion",
      title: "AI Engineer",
      description: "Build AI workflows and evaluate model quality."
    }
  });

  assert.match(prompt, /Notion/);
  assert.match(prompt, /AI Engineer/);
  assert.match(prompt, /Built LLM eval tooling/);
  assert.match(prompt, /strict JSON/i);
});

test("normalizeDrafts parses JSON and caps arrays", () => {
  const drafts = llm.normalizeDrafts(`Here is JSON:
    {"whyCompany":"Because it matches my work.","aiExperience":"LLM evals.","coverNote":"Hello.","matchSummary":["Fit","Gap"],"keywords":["LLM","RAG"]}`);

  assert.equal(drafts.whyCompany, "Because it matches my work.");
  assert.deepEqual(drafts.matchSummary, ["Fit", "Gap"]);
  assert.deepEqual(drafts.keywords, ["LLM", "RAG"]);
});
