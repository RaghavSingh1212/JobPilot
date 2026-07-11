const test = require("node:test");
const assert = require("node:assert/strict");
const matcher = require("../src/shared/matcher");

const profile = {
  name: "AI Engineer",
  enabled: true,
  desiredTitles: ["AI Engineer", "ML Engineer", "Machine Learning Engineer"],
  requiredKeywords: ["Python"],
  preferredKeywords: ["PyTorch", "LLM", "evaluation"],
  excludedKeywords: ["Staff", "Principal", "Manager", "PhD required"],
  maxExperienceYears: 3,
  seniority: ["entry", "junior", "mid"],
  locations: ["Remote", "San Francisco"],
  employmentTypes: ["Full-time"],
  minimumScoreToApply: 70
};

test("accepts a job that matches title, required keywords, location, and experience limits", () => {
  const result = matcher.evaluateJob({
    title: "Machine Learning Engineer",
    company: "Example AI",
    location: "Remote - US",
    employmentType: "Full-time",
    description: "Build Python and PyTorch systems for LLM evaluation. 2+ years of experience preferred."
  }, profile);

  assert.equal(result.shouldApply, true);
  assert.equal(result.hardRejectReasons.length, 0);
  assert.ok(result.score >= 70);
});

test("blocks jobs above the configured experience constraint", () => {
  const result = matcher.evaluateJob({
    title: "Machine Learning Engineer",
    company: "Example AI",
    location: "Remote - US",
    employmentType: "Full-time",
    description: "Python, PyTorch, and LLM evaluation. 6+ years of experience required."
  }, profile);

  assert.equal(result.shouldApply, false);
  assert.match(result.hardRejectReasons.join(" "), /Requires 6\+ years/);
  assert.ok(result.score < 50);
});

test("blocks excluded seniority keywords even with strong technical matches", () => {
  const result = matcher.evaluateJob({
    title: "Staff ML Engineer",
    company: "Example AI",
    location: "Remote - US",
    employmentType: "Full-time",
    description: "Python, PyTorch, LLM evaluation, inference, and platform ownership."
  }, profile);

  assert.equal(result.shouldApply, false);
  assert.match(result.hardRejectReasons.join(" "), /Staff/);
});

test("rejects missing required keywords", () => {
  const result = matcher.evaluateJob({
    title: "Machine Learning Engineer",
    company: "Example AI",
    location: "Remote - US",
    employmentType: "Full-time",
    description: "Build analytics dashboards with SQL."
  }, profile);

  assert.equal(result.shouldApply, false);
  assert.match(result.hardRejectReasons.join(" "), /Missing required keyword: Python/);
});
