const test = require("node:test");
const assert = require("node:assert/strict");
const answers = require("../src/shared/applicationAnswers");

const profile = {
  fullName: "Raghav Singh",
  email: "raghav@example.com",
  phone: "415-555-1212",
  cityState: "San Francisco, CA",
  linkedin: "https://linkedin.com/in/raghav",
  github: "https://github.com/raghav",
  portfolio: "https://raghav.dev",
  headline: "Machine Learning Engineer",
  summary: "ML engineer focused on Python and LLM evaluation.",
  skills: ["Python", "PyTorch", "LLM evaluation"],
  experience: [{ company: "Demo AI", title: "ML Engineer", bullets: ["Built LLM evaluation pipelines."] }],
  education: [{ school: "UC Berkeley", degree: "Bachelor of Science", major: "Computer Science", endDate: "May 2024" }],
  applicationAnswers: {
    authorizedToWorkUS: "Yes",
    sponsorshipNow: "No",
    sponsorshipFuture: "No",
    howHeard: "LinkedIn",
    graduationYear: "2024",
    gpa: "3.8",
    gender: "Decline to self-identify",
    languages: ["English (ENG)"]
  }
};

test("maps common Greenhouse work authorization questions", () => {
  assert.equal(answers.getAnswer("Are you legally authorized to work in the United States?", profile), "Yes");
  assert.equal(answers.getAnswer("Will you now require immigration sponsorship?", profile), "No");
});

test("maps education and Lever language questions", () => {
  assert.equal(answers.getAnswer("Which university are you currently attending?", profile), "UC Berkeley");
  assert.equal(answers.getAnswer("If currently enrolled, please indicate your most recent GPA", profile), "3.8");
  assert.deepEqual(answers.getAnswer("Language Skill(s) (Check all that apply)", profile), ["English (ENG)"]);
});

test("drafts why-company answer from job and profile when no saved answer exists", () => {
  const text = answers.getAnswer("Why do you want to work at Notion?", profile, { company: "Notion", title: "Software Engineer" });
  assert.match(text, /Notion/);
  assert.match(text, /Software Engineer/);
  assert.match(text, /Python/);
});
