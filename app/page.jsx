"use client";

import React from "react";
import defaults from "../src/shared/defaults";
import resumeParser from "../src/shared/resumeParser";

const STORAGE_KEY = "jobpilot-next-state";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function listToText(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function textToList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function initialState() {
  return {
    ...clone(defaults),
    discoveredJobs: [],
    todayJobs: [],
    lastDiscoveryAt: "",
    selectedJob: null,
    aiDrafts: null
  };
}

function mergeStored(stored) {
  const base = initialState();
  return {
    ...base,
    ...stored,
    profile: {
      ...base.profile,
      ...(stored.profile || {}),
      applicationAnswers: {
        ...base.profile.applicationAnswers,
        ...((stored.profile || {}).applicationAnswers || {})
      }
    },
    webSearchSettings: {
      ...base.webSearchSettings,
      ...(stored.webSearchSettings || {})
    },
    aiSettings: {
      ...base.aiSettings,
      ...(stored.aiSettings || {})
    }
  };
}

function scoreTone(score) {
  if (score >= 70) return "good";
  if (score >= 45) return "warn";
  return "bad";
}

function Field({ label, value, onChange, type = "text", wide = false, textarea = false, placeholder = "" }) {
  return (
    <label className={wide ? "wide" : ""}>
      {label}
      {textarea ? (
        <textarea value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export default function App() {
  const [state, setState] = React.useState(initialState);
  const [resumeText, setResumeText] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("dashboard");

  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setState(mergeStored(JSON.parse(saved)));
      } catch {
        setState(initialState());
      }
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function updateProfile(key, value) {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [key]: key === "salaryMinimum" ? Number(value || 0) : value
      }
    }));
  }

  function updateWebSearch(key, value) {
    setState((current) => ({
      ...current,
      webSearchSettings: {
        ...current.webSearchSettings,
        [key]: value
      }
    }));
  }

  function updateAi(key, value) {
    setState((current) => ({
      ...current,
      aiSettings: {
        ...current.aiSettings,
        [key]: value
      }
    }));
  }

  function parseResume() {
    if (!resumeText.trim()) {
      setStatus("Paste resume text first.");
      return;
    }
    const parsed = resumeParser.parseResume(resumeText);
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        ...Object.fromEntries(Object.entries(parsed).filter(([, value]) => value && (!Array.isArray(value) || value.length))),
        applicationAnswers: current.profile.applicationAnswers
      }
    }));
    setStatus("Resume parsed into your profile.");
  }

  async function runDiscovery() {
    setStatus("Finding jobs from ATS feeds, Simplify, and optional web search...");
    const response = await fetch("/api/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companySources: state.companySources,
        simplifySources: state.simplifySources,
        webSearchSettings: state.webSearchSettings,
        searchProfiles: state.searchProfiles
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Discovery failed.");
      return;
    }
    setState((current) => ({
      ...current,
      discoveredJobs: data.discoveredJobs || [],
      todayJobs: data.todayJobs || [],
      lastDiscoveryAt: data.lastDiscoveryAt || ""
    }));
    setStatus(`Discovery complete: ${(data.discoveredJobs || []).length} jobs ranked.`);
    setActiveTab("jobs");
  }

  async function generateDrafts(job = state.selectedJob) {
    if (!job) {
      setStatus("Select a job first.");
      return;
    }
    setStatus("Generating tailored drafts...");
    const response = await fetch("/api/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        settings: state.aiSettings,
        profile: state.profile,
        job
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Draft generation failed.");
      return;
    }
    setState((current) => ({ ...current, selectedJob: job, aiDrafts: data.drafts }));
    setStatus("Drafts ready for review.");
    setActiveTab("drafts");
  }

  const jobs = state.discoveredJobs || [];
  const selectedJob = state.selectedJob || jobs[0] || null;

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">AI job search copilot</p>
          <h1>JobPilot</h1>
        </div>
        <button type="button" onClick={runDiscovery}>Find jobs</button>
      </header>

      <nav className="tabs">
        {["dashboard", "profile", "search", "jobs", "drafts"].map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>

      {status ? <p className="status">{status}</p> : null}

      {activeTab === "dashboard" ? (
        <section className="dashboard">
          <div className="metric"><strong>{jobs.length}</strong><span>ranked jobs</span></div>
          <div className="metric"><strong>{jobs.filter((job) => job.shouldApply).length}</strong><span>strong matches</span></div>
          <div className="metric"><strong>{state.searchProfiles.filter((profile) => profile.enabled !== false).length}</strong><span>active profiles</span></div>
          <div className="metric"><strong>{state.webSearchSettings.enabled ? "On" : "Off"}</strong><span>web search</span></div>
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section>
          <div className="section-head">
            <h2>Candidate profile</h2>
            <button type="button" onClick={parseResume}>Parse resume</button>
          </div>
          <div className="grid">
            <Field label="Full name" value={state.profile.fullName} onChange={(value) => updateProfile("fullName", value)} />
            <Field label="Email" value={state.profile.email} onChange={(value) => updateProfile("email", value)} />
            <Field label="Phone" value={state.profile.phone} onChange={(value) => updateProfile("phone", value)} />
            <Field label="City / state" value={state.profile.cityState} onChange={(value) => updateProfile("cityState", value)} />
            <Field label="LinkedIn" value={state.profile.linkedin} onChange={(value) => updateProfile("linkedin", value)} />
            <Field label="GitHub" value={state.profile.github} onChange={(value) => updateProfile("github", value)} />
            <Field label="Portfolio" value={state.profile.portfolio} onChange={(value) => updateProfile("portfolio", value)} />
            <Field label="Headline" value={state.profile.headline} onChange={(value) => updateProfile("headline", value)} />
            <Field label="Skills" value={listToText(state.profile.skills)} textarea wide onChange={(value) => updateProfile("skills", textToList(value))} />
            <Field label="Summary" value={state.profile.summary} textarea wide onChange={(value) => updateProfile("summary", value)} />
            <Field label="Paste resume text" value={resumeText} textarea wide placeholder="Paste resume text here" onChange={setResumeText} />
          </div>
        </section>
      ) : null}

      {activeTab === "search" ? (
        <section>
          <h2>Discovery settings</h2>
          <div className="grid">
            <label><span><input type="checkbox" checked={state.webSearchSettings.enabled} onChange={(event) => updateWebSearch("enabled", event.target.checked)} /> Search the web from my profile</span></label>
            <label>Provider<select value={state.webSearchSettings.provider} onChange={(event) => updateWebSearch("provider", event.target.value)}><option value="serpapi">SerpAPI</option><option value="google-cse">Google Custom Search</option></select></label>
            <Field label="Search API key" value={state.webSearchSettings.apiKey} type="password" wide onChange={(value) => updateWebSearch("apiKey", value)} />
            <Field label="Google search engine ID" value={state.webSearchSettings.searchEngineId} wide onChange={(value) => updateWebSearch("searchEngineId", value)} />
            <Field label="Results per query" value={state.webSearchSettings.resultsPerQuery} type="number" onChange={(value) => updateWebSearch("resultsPerQuery", Number(value || 10))} />
            <Field label="Max queries" value={state.webSearchSettings.maxQueries} type="number" onChange={(value) => updateWebSearch("maxQueries", Number(value || 8))} />
            <Field label="Freshness days" value={state.webSearchSettings.freshnessDays} type="number" onChange={(value) => updateWebSearch("freshnessDays", Number(value || 0))} />
            <Field label="Extra search queries" value={listToText(state.webSearchSettings.includeQueries)} textarea wide onChange={(value) => updateWebSearch("includeQueries", textToList(value))} />
            <Field label="Preferred sites" value={listToText(state.webSearchSettings.preferredSites)} textarea wide onChange={(value) => updateWebSearch("preferredSites", textToList(value))} />
            <Field label="Excluded sites" value={listToText(state.webSearchSettings.excludedSites)} textarea wide onChange={(value) => updateWebSearch("excludedSites", textToList(value))} />
          </div>
        </section>
      ) : null}

      {activeTab === "jobs" ? (
        <section>
          <div className="section-head">
            <h2>Ranked jobs</h2>
            <span className="hint">{state.lastDiscoveryAt ? `Last checked ${state.lastDiscoveryAt}` : "Run discovery to populate jobs."}</span>
          </div>
          <div className="jobs">
            {jobs.slice(0, 80).map((job) => (
              <article key={`${job.platform}:${job.externalId || job.url}`} className="job">
                <div>
                  <span className={`score ${scoreTone(job.score)}`}>{job.score ?? 0}</span>
                  <strong>{job.title || "Untitled role"}</strong>
                  <p>{job.company || "Unknown company"} · {job.location || job.platform}</p>
                </div>
                <div className="actions">
                  <a href={job.url || "#"} target="_blank" rel="noreferrer">Open</a>
                  <button type="button" onClick={() => generateDrafts(job)}>Draft</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "drafts" ? (
        <section>
          <h2>AI drafts</h2>
          <div className="grid">
            <Field label="LLM API endpoint" value={state.aiSettings.endpoint} wide onChange={(value) => updateAi("endpoint", value)} />
            <Field label="Model" value={state.aiSettings.model} onChange={(value) => updateAi("model", value)} />
            <Field label="LLM API key" value={state.aiSettings.apiKey} type="password" wide onChange={(value) => updateAi("apiKey", value)} />
            <label><span><input type="checkbox" checked={state.aiSettings.enabled} onChange={(event) => updateAi("enabled", event.target.checked)} /> Enable LLM drafts</span></label>
          </div>
          {selectedJob ? <p className="hint">Selected: {selectedJob.company} · {selectedJob.title}</p> : null}
          {state.aiDrafts ? (
            <div className="drafts">
              <h3>Why company</h3><p>{state.aiDrafts.whyCompany}</p>
              <h3>AI experience</h3><p>{state.aiDrafts.aiExperience}</p>
              <h3>Cover note</h3><p>{state.aiDrafts.coverNote}</p>
              <h3>Match summary</h3><p>{Array.isArray(state.aiDrafts.matchSummary) ? state.aiDrafts.matchSummary.join(" ") : state.aiDrafts.matchSummary}</p>
            </div>
          ) : <p className="hint">Select a job and generate drafts.</p>}
        </section>
      ) : null}
    </main>
  );
}
