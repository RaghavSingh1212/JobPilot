(function initLlmAssistant(global) {
  const DEFAULT_SYSTEM_PROMPT = [
    "You are helping a candidate draft truthful job application answers.",
    "Use only the supplied candidate profile and job posting.",
    "Do not invent degrees, employers, links, immigration status, or experience.",
    "Return strict JSON with keys: whyCompany, aiExperience, coverNote, matchSummary, keywords."
  ].join(" ");

  function compactText(value, maxLength = 6000) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function profileSnapshot(profile = {}) {
    const experience = (profile.experience || []).slice(0, 4).map((entry) => ({
      company: entry.company || "",
      title: entry.title || "",
      bullets: (entry.bullets || []).slice(0, 4)
    }));
    const education = (profile.education || []).slice(0, 3).map((entry) => ({
      school: entry.school || "",
      degree: entry.degree || "",
      major: entry.major || "",
      endDate: entry.endDate || ""
    }));

    return {
      headline: profile.headline || "",
      summary: profile.summary || "",
      skills: (profile.skills || []).slice(0, 40),
      experience,
      education,
      links: [profile.linkedin, profile.github, profile.portfolio].filter(Boolean)
    };
  }

  function buildDraftPrompt({ profile = {}, job = {}, tone = "concise, specific, and confident" } = {}) {
    const candidate = profileSnapshot(profile);
    const posting = {
      company: job.company || "",
      title: job.title || "",
      location: job.location || "",
      description: compactText(job.description, 8000)
    };

    return [
      `Tone: ${tone}.`,
      "Candidate profile JSON:",
      JSON.stringify(candidate, null, 2),
      "Job posting JSON:",
      JSON.stringify(posting, null, 2),
      "Draft concise answers that can be reviewed before submission.",
      "Return strict JSON only.",
      "whyCompany: 90 words max.",
      "aiExperience: 120 words max, focused on LLM/AI work only when supported by the profile.",
      "coverNote: 140 words max.",
      "matchSummary: 3 short bullets explaining fit and any gaps.",
      "keywords: 8-12 relevant skills or concepts from the posting that the profile supports."
    ].join("\n");
  }

  function extractJsonObject(text) {
    const clean = String(text || "").trim();
    if (!clean) return {};
    try {
      return JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try {
        return JSON.parse(match[0]);
      } catch {
        return {};
      }
    }
  }

  function normalizeDrafts(value) {
    const data = typeof value === "string" ? extractJsonObject(value) : value || {};
    return {
      whyCompany: compactText(data.whyCompany, 900),
      aiExperience: compactText(data.aiExperience, 1200),
      coverNote: compactText(data.coverNote, 1400),
      matchSummary: Array.isArray(data.matchSummary)
        ? data.matchSummary.map((item) => compactText(item, 220)).filter(Boolean).slice(0, 5)
        : compactText(data.matchSummary, 1200),
      keywords: Array.isArray(data.keywords)
        ? data.keywords.map((item) => compactText(item, 80)).filter(Boolean).slice(0, 16)
        : []
    };
  }

  async function generateDrafts({ settings = {}, profile = {}, job = {} } = {}) {
    if (!settings.enabled) {
      throw new Error("LLM drafting is disabled.");
    }
    if (!settings.apiKey) {
      throw new Error("Add an API key before generating drafts.");
    }

    const endpoint = settings.endpoint || "https://api.openai.com/v1/chat/completions";
    const model = settings.model || "gpt-4.1-mini";
    const body = {
      model,
      temperature: Number(settings.temperature ?? 0.3),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: buildDraftPrompt({ profile, job, tone: settings.tone }) }
      ]
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.output_text || "";
    return normalizeDrafts(content);
  }

  const api = {
    DEFAULT_SYSTEM_PROMPT,
    compactText,
    profileSnapshot,
    buildDraftPrompt,
    extractJsonObject,
    normalizeDrafts,
    generateDrafts
  };

  global.JobCopilotLlmAssistant = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
