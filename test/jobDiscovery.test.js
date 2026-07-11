const test = require("node:test");
const assert = require("node:assert/strict");
const discovery = require("../src/shared/jobDiscovery");

test("normalizes Greenhouse jobs", () => {
  const job = discovery.normalizeGreenhouse(
    { company: "DoorDash" },
    {
      id: 123,
      title: "Software Engineer",
      absolute_url: "https://boards.greenhouse.io/doordash/jobs/123",
      location: { name: "San Francisco" },
      departments: [{ name: "Engineering" }],
      content: "<p>Python APIs</p>"
    }
  );

  assert.equal(job.company, "DoorDash");
  assert.equal(job.platform, "greenhouse");
  assert.equal(job.title, "Software Engineer");
  assert.match(job.description, /Python APIs/);
});

test("normalizes Lever jobs", () => {
  const job = discovery.normalizeLever(
    { company: "Palantir" },
    {
      id: "abc",
      text: "Software Engineer, New Grad",
      hostedUrl: "https://jobs.lever.co/palantir/abc",
      categories: { location: "New York, NY", team: "Dev", commitment: "Full-Time" },
      description: "Build systems with Python."
    }
  );

  assert.equal(job.platform, "lever");
  assert.equal(job.location, "New York, NY");
  assert.equal(job.employmentType, "Full-Time");
});

test("parses SimplifyJobs markdown rows and keeps direct application links", () => {
  const markdown = `
| Company | Role | Location | Application | Age |
| --- | --- | --- | --- | --- |
| [Acme](https://simplify.jobs/c/Acme) | Software Engineer, New Grad | San Francisco, CA | [Apply](https://jobs.ashbyhq.com/acme/123) | 1d |
| OldCo | Software Engineer | Remote | [Apply](https://jobs.lever.co/oldco/abc) | 2mo |
`;
  const jobs = discovery.parseSimplifyMarkdown(markdown, {
    name: "SimplifyJobs New Grad",
    roleType: "new-grad",
    maxAgeDays: 14
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].company, "Acme");
  assert.equal(jobs[0].title, "Software Engineer, New Grad");
  assert.equal(jobs[0].url, "https://jobs.ashbyhq.com/acme/123");
  assert.equal(jobs[0].roleType, "new-grad");
});

test("parses current SimplifyJobs HTML table rows", () => {
  const markdown = `
<table>
<tbody>
<tr>
<td><strong><a href="https://simplify.jobs/c/Pylon?utm_source=GHList&utm_medium=company">Pylon</a></strong></td>
<td>Software Engineer New Grad</td>
<td>SF</td>
<td><div align="center"><a href="https://jobs.ashbyhq.com/pylon-labs/38814ce7/application?utm_source=Simplify&ref=Simplify"><img src="https://i.imgur.com/fbjwDvo.png" width="52" alt="Apply"></a> <a href="https://simplify.jobs/p/4d8e38cd"><img src="https://i.imgur.com/aVnQdox.png" width="28" alt="Simplify"></a></div></td>
<td>0d</td>
</tr>
<tr>
<td>↳</td>
<td>Software Engineer New Grad - Backend</td>
<td>SF</td>
<td><div align="center"><a href="https://job-boards.greenhouse.io/pylon/jobs/123?utm_source=Simplify&ref=Simplify"><img src="https://i.imgur.com/fbjwDvo.png" width="52" alt="Apply"></a></div></td>
<td>1d</td>
</tr>
</tbody>
</table>
`;
  const jobs = discovery.parseSimplifyMarkdown(markdown, {
    name: "SimplifyJobs New Grad",
    roleType: "new-grad",
    maxAgeDays: 14
  });

  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].company, "Pylon");
  assert.equal(jobs[0].url, "https://jobs.ashbyhq.com/pylon-labs/38814ce7/application?utm_source=Simplify&ref=Simplify");
  assert.equal(jobs[1].company, "Pylon");
  assert.equal(jobs[1].url, "https://job-boards.greenhouse.io/pylon/jobs/123?utm_source=Simplify&ref=Simplify");
});
