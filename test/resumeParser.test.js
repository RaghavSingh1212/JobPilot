const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("../src/shared/resumeParser");

const sampleResume = `
Raghav Singh
raghav@example.com | 415-555-1212 | linkedin.com/in/raghav | github.com/raghav

Summary
Machine learning engineer focused on Python, LLM evaluation, and production APIs.

Skills
Python, PyTorch, FastAPI, PostgreSQL, Docker, AWS, React

Experience
Machine Learning Engineer at Demo AI | Jan 2024 - Present
- Built Python evaluation pipelines for LLM quality checks.
- Shipped FastAPI services used by internal ML teams.

Software Engineer Intern - Tools Co | Jun 2023 - Aug 2023
- Created React dashboards and PostgreSQL reporting workflows.

Education
University of California, Berkeley | Bachelor of Science in Computer Science | Aug 2020 - May 2024
`;

test("parses contact, skills, experience, and education from resume text", () => {
  const profile = parser.parseResume(sampleResume);

  assert.equal(profile.fullName, "Raghav Singh");
  assert.equal(profile.email, "raghav@example.com");
  assert.equal(profile.phone, "415-555-1212");
  assert.ok(profile.skills.includes("Python"));
  assert.ok(profile.skills.includes("PyTorch"));
  assert.equal(profile.experience.length, 2);
  assert.equal(profile.experience[0].company, "Demo AI");
  assert.equal(profile.experience[0].title, "Machine Learning Engineer");
  assert.equal(profile.experience[0].startDate, "Jan 2024");
  assert.equal(profile.experience[0].endDate, "Present");
  assert.match(profile.experience[0].bullets.join(" "), /evaluation pipelines/);
  assert.equal(profile.education.length, 1);
  assert.match(profile.education[0].school, /University of California/);
  assert.match(profile.education[0].degree, /Bachelor/);
});
