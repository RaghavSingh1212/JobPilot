# JobPilot

A Next.js job search copilot that discovers early-career software roles, ranks them against your profile, parses your resume into structured data, and optionally uses an LLM to draft tailored application answers.

## What works

- Runs as a Next.js app with API routes for discovery and LLM drafting.
- Parses resume text into a structured profile: experience, education, skills, summary, and contact details.
- Scores jobs against enabled search profiles.
- Applies hard filters for required keywords, excluded keywords, seniority, maximum experience requirement, location, employment type, and salary minimum.
- Keeps profile matching separate from application decisions, so you can review jobs manually.
- Optionally calls an OpenAI-compatible LLM endpoint to generate tailored "why company", AI experience, cover note, match summary, and keyword drafts.
- Discovers jobs from configured public Greenhouse, Lever, and Ashby company boards and ranks them.
- Discovers new-grad and internship roles from the SimplifyJobs GitHub lists, similar to SWEList.
- Optionally searches the broader web from your enabled search profiles through SerpAPI or Google Custom Search, then normalizes and ranks those results with the same matching engine.
- Stores local app state in browser localStorage during development.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Use

1. Open the Profile tab and paste resume text.
2. Parse the resume into a structured candidate profile.
3. Open Search and configure web-search or ATS discovery settings.
4. Click "Find jobs" to run discovery through the Next.js API route.
5. Review ranked jobs in the Jobs tab.
6. Add an OpenAI-compatible API key in Drafts, select a job, and generate tailored answers.

## APIs Used

- Greenhouse Board API for public Greenhouse job boards.
- Lever Postings API for Lever-hosted roles.
- Ashby Job Board API for Ashby-hosted roles.
- SimplifyJobs GitHub README feeds for new-grad and internship lists.
- SerpAPI or Google Custom Search API for broader web discovery.
- OpenAI-compatible Chat Completions API for tailored application drafts.

## Company Sources

Paste JSON like this into the Company Sources box:

```json
[
  { "company": "Notion", "platform": "ashby", "slug": "notion", "enabled": true },
  { "company": "Palantir", "platform": "lever", "slug": "palantir", "enabled": true },
  { "company": "DoorDash", "platform": "greenhouse", "slug": "doordashusa", "enabled": true }
]
```

The Next app calls these sources from `/api/discover` when you click "Find jobs".

## New-Grad and Internship Feed

The settings page includes SimplifyJobs feeds:

- New grad: `SimplifyJobs/New-Grad-Positions`
- Internships: `SimplifyJobs/Summer2026-Internships`

Set "max age days" to control freshness. For example, `3` shows roles marked around 0d-3d old, while `14` gives a wider list.

## Web Job Search

Web Job Search is optional and needs either a SerpAPI key or a Google Custom Search API key plus search engine ID. JobPilot generates search queries from enabled Search Profiles, combines them with any extra queries you add, prefers direct career/ATS domains, excludes noisy aggregator sites, and converts search results into the same job format used by Greenhouse, Lever, Ashby, and Simplify.

## LLM Layer

The LLM integration is deliberately a drafting layer, not an autopilot. It builds a compact prompt from your local profile and the target job description, asks for strict JSON, and returns editable drafts. This makes the project more than normal CRUD/web UI work: it combines resume parsing, retrieval from public job feeds, deterministic matching, profile-driven web search, and guarded LLM generation.

## Safety rules

JobPilot does not submit applications for you. It ranks jobs, opens application links, and drafts text for review. Matching is deterministic and used for ranking/recommendations, while LLM output is kept as editable draft content.

## Resume / Interview Framing

**JobPilot | AI-powered Job Discovery Platform**

Built a Next.js job discovery platform that turns a resume into a structured candidate profile, discovers new-grad/internship roles from ATS APIs, SimplifyJobs feeds, and profile-based web search, then ranks opportunities with deterministic fit rules.

Integrated an optional OpenAI-compatible LLM drafting layer that generates tailored "why company", AI experience, cover-note, match-summary, and keyword suggestions from the candidate profile plus job description, with JSON-constrained outputs and editable review before reuse.

**Tech:** Next.js, React, JavaScript, Next API routes, localStorage, Greenhouse Board API, Lever Postings API, Ashby Job Board API, SimplifyJobs feeds, SerpAPI / Google Custom Search, OpenAI-compatible chat completions, deterministic scoring, resume parsing.

## Verify

```bash
npm test
```
