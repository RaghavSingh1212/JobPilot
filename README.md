# Job Application Copilot

A local Chrome extension that discovers early-career software roles, ranks them against your search profile, uses your resume to autofill ATS applications, and optionally uses an LLM to draft tailored application answers without ever submitting for you.

## What works

- Extracts job title, company, location, salary hints, employment type, and description from live posting pages.
- Scores the posting against enabled search profiles.
- Applies hard filters for required keywords, excluded keywords, seniority, maximum experience requirement, location, employment type, and salary minimum.
- Keeps matching and autofill separate, so a strict score never blocks you from filling the current application.
- Imports resume text into a structured local profile: experience, education, skills, summary, and contact details.
- Fills common Greenhouse, Lever, and Ashby fields from your local profile and saved answers.
- Drafts basic answers for fields like "why this company" and AI experience from your resume/profile and job description.
- Optionally calls an OpenAI-compatible LLM endpoint to generate tailored "why company", AI experience, cover note, match summary, and keyword drafts.
- Discovers jobs from configured public Greenhouse, Lever, and Ashby company boards and ranks them.
- Discovers new-grad and internship roles from the SimplifyJobs GitHub lists, similar to SWEList.
- Shows an on-page review overlay listing unknown fields before you submit anything.
- Tracks scanned/application candidates in local extension storage.

## Install locally

1. Open Chrome or Edge.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click "Load unpacked".
5. Select this folder: `/Users/raghavsingh/Copilot`.

## Use

1. Open the extension settings and fill in your candidate profile.
2. Paste resume text or upload a text resume and click "Create profile".
3. Fill the Application Answers section for legal, school, preference, and voluntary EEO questions.
4. Edit or add search profiles for the job types you actually want.
5. Enable the New-grad or Internship feed, add company sources if you want, and click "Run discovery".
6. Optional: enable AI Drafting, add an OpenAI-compatible API key/model endpoint, paste a target job description, and generate tailored application drafts.
7. Open a discovered job, click the extension icon, and choose "Autofill application".
8. Review the page yourself, attach required files, complete unknown fields, and submit manually only if everything is true.

## Company Sources

Paste JSON like this into the Company Sources box:

```json
[
  { "company": "Notion", "platform": "ashby", "slug": "notion", "enabled": true },
  { "company": "Palantir", "platform": "lever", "slug": "palantir", "enabled": true },
  { "company": "DoorDash", "platform": "greenhouse", "slug": "doordashusa", "enabled": true }
]
```

The extension also schedules discovery about twice per day with Chrome alarms. Use "Run discovery" for manual runs.

## New-Grad and Internship Feed

The settings page includes SimplifyJobs feeds:

- New grad: `SimplifyJobs/New-Grad-Positions`
- Internships: `SimplifyJobs/Summer2026-Internships`

Set "max age days" to control freshness. For example, `3` shows roles marked around 0d-3d old, while `14` gives a wider list.

## LLM Layer

The LLM integration is deliberately a drafting layer, not an autopilot. It builds a compact prompt from your local profile and the target job description, asks for strict JSON, and stores the generated answers back into your editable Application Answers fields. This makes the project more than normal CRUD/web UI work: it combines resume parsing, retrieval from public job feeds, ATS-specific DOM automation, deterministic matching, and guarded LLM generation.

## Safety rules

This extension does not click submit. It cannot silently attach local resume files because browsers block programmatic file upload for security. It flags unknown or sensitive fields for review. Matching is deterministic and used for ranking/recommendations, while autofill remains available for the current page so you can decide after review.

## Resume / Interview Framing

**Job Application Copilot | AI-powered Chrome Extension**

Built a local MV3 Chrome extension that turns a resume into a structured candidate profile, discovers new-grad/internship roles from ATS boards and SimplifyJobs feeds, ranks opportunities with deterministic fit rules, and autofills Greenhouse, Lever, and Ashby applications while preserving a manual submit boundary.

Integrated an optional OpenAI-compatible LLM drafting layer that generates tailored "why company", AI experience, cover-note, match-summary, and keyword suggestions from the candidate profile plus job description, with JSON-constrained outputs and editable review before reuse.

**Tech:** JavaScript, Chrome Extension MV3, content scripts, service workers, Chrome Storage, DOM automation, ATS APIs, OpenAI-compatible chat completions, deterministic scoring, resume parsing.

## Verify

```bash
npm test
```
