const fields = ["fullName", "email", "phone", "cityState", "linkedin", "github", "portfolio", "salaryMinimum", "headline", "summary"];
let state = structuredClone(window.JobCopilotDefaults);

function listToText(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function textToList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function load() {
  chrome.storage.local.get(["profile", "searchProfiles", "answers", "applications", "companySources", "simplifySources", "digestSettings", "aiSettings", "discoveredJobs", "todayJobs", "lastDiscoveryAt"], (stored) => {
    state = {
      ...structuredClone(window.JobCopilotDefaults),
      ...stored,
      profile: {
        ...window.JobCopilotDefaults.profile,
        ...(stored.profile || {}),
        applicationAnswers: {
          ...window.JobCopilotDefaults.profile.applicationAnswers,
          ...((stored.profile || {}).applicationAnswers || {})
        }
      },
      searchProfiles: stored.searchProfiles || window.JobCopilotDefaults.searchProfiles,
      answers: stored.answers || window.JobCopilotDefaults.answers,
      applications: stored.applications || [],
      companySources: stored.companySources || window.JobCopilotDefaults.companySources,
      simplifySources: stored.simplifySources || window.JobCopilotDefaults.simplifySources,
      digestSettings: {
        ...window.JobCopilotDefaults.digestSettings,
        ...(stored.digestSettings || {})
      },
      aiSettings: {
        ...window.JobCopilotDefaults.aiSettings,
        ...(stored.aiSettings || {})
      },
      discoveredJobs: stored.discoveredJobs || [],
      todayJobs: stored.todayJobs || [],
      lastDiscoveryAt: stored.lastDiscoveryAt || ""
    };
    render();
  });
}

function render() {
  for (const field of fields) {
    document.getElementById(field).value = state.profile[field] || "";
  }
  renderProfiles();
  renderGeneratedProfile();
  renderApplicationAnswers();
  renderSources();
  renderDigestSettings();
  renderAiSettings();
  renderTodayDigest();
  renderDiscoveredJobs();
  renderApplications();
}

function renderAiSettings() {
  const settings = state.aiSettings || {};
  document.getElementById("aiEnabled").checked = Boolean(settings.enabled);
  document.getElementById("aiEndpoint").value = settings.endpoint || "";
  document.getElementById("aiModel").value = settings.model || "";
  document.getElementById("aiApiKey").value = settings.apiKey || "";
  document.getElementById("aiTemperature").value = settings.temperature ?? 0.3;
  document.getElementById("aiTone").value = settings.tone || "";
}

function renderProfiles() {
  const root = document.getElementById("profiles");
  root.innerHTML = "";
  state.searchProfiles.forEach((profile, index) => {
    const card = document.createElement("article");
    card.className = "profile-card";
    card.innerHTML = `
      <div class="profile-title">
        <input type="checkbox" data-key="enabled" ${profile.enabled !== false ? "checked" : ""}>
        <label>Profile name<input data-key="name" value="${escapeAttr(profile.name)}"></label>
      </div>
      <div class="grid">
        <label>Desired titles<textarea data-key="desiredTitles">${escapeHtml(listToText(profile.desiredTitles))}</textarea></label>
        <label>Required keywords<textarea data-key="requiredKeywords">${escapeHtml(listToText(profile.requiredKeywords))}</textarea></label>
        <label>Preferred keywords<textarea data-key="preferredKeywords">${escapeHtml(listToText(profile.preferredKeywords))}</textarea></label>
        <label>Excluded keywords<textarea data-key="excludedKeywords">${escapeHtml(listToText(profile.excludedKeywords))}</textarea></label>
        <label>Allowed seniority<textarea data-key="seniority">${escapeHtml(listToText(profile.seniority))}</textarea></label>
        <label>Locations<textarea data-key="locations">${escapeHtml(listToText(profile.locations))}</textarea></label>
        <label>Employment types<textarea data-key="employmentTypes">${escapeHtml(listToText(profile.employmentTypes))}</textarea></label>
        <label>Max required experience<input data-key="maxExperienceYears" type="number" min="0" value="${Number(profile.maxExperienceYears || 0)}"></label>
        <label>Minimum score<input data-key="minimumScoreToApply" type="number" min="0" max="100" value="${Number(profile.minimumScoreToApply || 70)}"></label>
      </div>
    `;
    card.addEventListener("input", (event) => updateProfile(index, event.target));
    card.addEventListener("change", (event) => updateProfile(index, event.target));
    root.appendChild(card);
  });
}

function renderGeneratedProfile() {
  document.getElementById("skills").value = listToText(state.profile.skills || []);
  renderExperience();
  renderEducation();
}

function renderApplicationAnswers() {
  const app = state.profile.applicationAnswers || {};
  document.querySelectorAll("[data-answer]").forEach((field) => {
    const key = field.dataset.answer;
    field.value = listToText(app[key]);
  });
}

function renderSources() {
  document.getElementById("companySources").value = JSON.stringify(state.companySources || [], null, 2);
  const newGrad = (state.simplifySources || []).find((source) => source.roleType === "new-grad") || {};
  const internship = (state.simplifySources || []).find((source) => source.roleType === "internship") || {};
  document.getElementById("newGradEnabled").checked = newGrad.enabled !== false;
  document.getElementById("newGradMaxAge").value = newGrad.maxAgeDays ?? 14;
  document.getElementById("internshipEnabled").checked = internship.enabled !== false;
  document.getElementById("internshipMaxAge").value = internship.maxAgeDays ?? 14;
}

function renderDigestSettings() {
  const settings = state.digestSettings || {};
  document.getElementById("digestEmail").value = settings.recipientEmail || state.profile.email || "";
  document.getElementById("digestMaxJobs").value = settings.maxJobsInEmail || 60;
  document.getElementById("digestStrongOnly").checked = Boolean(settings.includeOnlyStrongMatches);
}

function todayJobsForDigest() {
  const source = (state.todayJobs && state.todayJobs.length ? state.todayJobs : state.discoveredJobs || []);
  const today = source.filter(isTodayJob);
  if (state.digestSettings?.includeOnlyStrongMatches) {
    return today.filter((job) => job.shouldApply);
  }
  return today;
}

function renderTodayDigest() {
  const jobs = todayJobsForDigest();
  document.getElementById("todayDigestSummary").textContent = `${jobs.length} jobs posted today${state.lastDiscoveryAt ? ` · last checked ${state.lastDiscoveryAt}` : ""}.`;
  document.getElementById("todayJobs").innerHTML = jobs.slice(0, 100).map((job) => `
    <tr>
      <td>${escapeHtml(job.score ?? "")}</td>
      <td>${escapeHtml(job.company || "")}</td>
      <td>${escapeHtml(job.title || "")}</td>
      <td>${escapeHtml(job.age || "")}</td>
      <td><a href="${escapeAttr(job.url || "#")}" target="_blank" rel="noreferrer">Open</a></td>
    </tr>
  `).join("");
}

function renderDiscoveredJobs() {
  document.getElementById("lastDiscovery").textContent = state.lastDiscoveryAt ? `Last discovery: ${state.lastDiscoveryAt}` : "Discovery has not run yet.";
  document.getElementById("discoveredJobs").innerHTML = (state.discoveredJobs || []).slice(0, 100).map((job) => `
    <tr>
      <td>${escapeHtml(job.score ?? "")}</td>
      <td>${escapeHtml(job.company || "")}</td>
      <td><a href="${escapeAttr(job.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(job.title || "")}</a></td>
      <td>${escapeHtml(job.platform || "")}</td>
      <td><a href="${escapeAttr(job.url || "#")}" target="_blank" rel="noreferrer">Open</a></td>
    </tr>
  `).join("");
}

function renderExperience() {
  const root = document.getElementById("experience");
  root.innerHTML = "";
  (state.profile.experience || []).forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "entry-card";
    card.innerHTML = `
      <div class="grid">
        <label>Company<input data-kind="experience" data-index="${index}" data-key="company" value="${escapeAttr(entry.company || "")}"></label>
        <label>Job title<input data-kind="experience" data-index="${index}" data-key="title" value="${escapeAttr(entry.title || "")}"></label>
        <label>Start<input data-kind="experience" data-index="${index}" data-key="startDate" value="${escapeAttr(entry.startDate || "")}"></label>
        <label>End<input data-kind="experience" data-index="${index}" data-key="endDate" value="${escapeAttr(entry.endDate || "")}"></label>
        <label>Skills used<textarea data-kind="experience" data-index="${index}" data-key="skills">${escapeHtml(listToText(entry.skills || []))}</textarea></label>
        <label>Experience points<textarea data-kind="experience" data-index="${index}" data-key="bullets">${escapeHtml(listToText(entry.bullets || []))}</textarea></label>
      </div>
    `;
    card.addEventListener("input", updateGeneratedEntry);
    root.appendChild(card);
  });
}

function renderEducation() {
  const root = document.getElementById("education");
  root.innerHTML = "";
  (state.profile.education || []).forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "entry-card";
    card.innerHTML = `
      <div class="grid">
        <label>School<input data-kind="education" data-index="${index}" data-key="school" value="${escapeAttr(entry.school || "")}"></label>
        <label>Degree<input data-kind="education" data-index="${index}" data-key="degree" value="${escapeAttr(entry.degree || "")}"></label>
        <label>Major<input data-kind="education" data-index="${index}" data-key="major" value="${escapeAttr(entry.major || "")}"></label>
        <label>Start<input data-kind="education" data-index="${index}" data-key="startDate" value="${escapeAttr(entry.startDate || "")}"></label>
        <label>End<input data-kind="education" data-index="${index}" data-key="endDate" value="${escapeAttr(entry.endDate || "")}"></label>
      </div>
    `;
    card.addEventListener("input", updateGeneratedEntry);
    root.appendChild(card);
  });
}

function updateGeneratedEntry(event) {
  const { kind, index, key } = event.target.dataset;
  if (!kind || !key) return;
  const value = event.target.tagName === "TEXTAREA" ? textToList(event.target.value) : event.target.value;
  state.profile[kind][Number(index)][key] = value;
}

function updateProfile(index, input) {
  const key = input.dataset.key;
  if (!key) return;
  if (input.type === "checkbox") {
    state.searchProfiles[index][key] = input.checked;
  } else if (["maxExperienceYears", "minimumScoreToApply"].includes(key)) {
    state.searchProfiles[index][key] = Number(input.value || 0);
  } else if (input.tagName === "TEXTAREA") {
    state.searchProfiles[index][key] = textToList(input.value);
  } else {
    state.searchProfiles[index][key] = input.value;
  }
}

function renderApplications() {
  const root = document.getElementById("applications");
  root.innerHTML = state.applications.slice(0, 50).map((app) => `
    <tr>
      <td>${escapeHtml((app.date || "").slice(0, 10))}</td>
      <td>${escapeHtml(app.company || "")}</td>
      <td><a href="${escapeAttr(app.url || "#")}">${escapeHtml(app.title || "")}</a></td>
      <td>${escapeHtml(app.score ?? "")}</td>
      <td>${escapeHtml(app.decision || "")}</td>
    </tr>
  `).join("");
}

function save(afterSave) {
  for (const field of fields) {
    const value = document.getElementById(field).value;
    state.profile[field] = field === "salaryMinimum" ? Number(value || 0) : value;
  }
  state.profile.skills = textToList(document.getElementById("skills").value);
  state.profile.applicationAnswers = state.profile.applicationAnswers || {};
  document.querySelectorAll("[data-answer]").forEach((field) => {
    const key = field.dataset.answer;
    const listKeys = ["languages", "preferredLocations", "palantirProductPreference"];
    state.profile.applicationAnswers[key] = listKeys.includes(key) ? textToList(field.value) : field.value;
  });
  try {
    state.companySources = JSON.parse(document.getElementById("companySources").value || "[]");
  } catch {
    document.getElementById("status").textContent = "Company sources JSON is invalid.";
    return;
  }
  state.simplifySources = updateSimplifySourcesFromForm(state.simplifySources || window.JobCopilotDefaults.simplifySources);
  state.digestSettings = {
    recipientEmail: document.getElementById("digestEmail").value || state.profile.email || "",
    maxJobsInEmail: Number(document.getElementById("digestMaxJobs").value || 60),
    includeOnlyStrongMatches: document.getElementById("digestStrongOnly").checked
  };
  state.aiSettings = {
    enabled: document.getElementById("aiEnabled").checked,
    endpoint: document.getElementById("aiEndpoint").value.trim(),
    model: document.getElementById("aiModel").value.trim(),
    apiKey: document.getElementById("aiApiKey").value.trim(),
    temperature: Number(document.getElementById("aiTemperature").value || 0.3),
    tone: document.getElementById("aiTone").value.trim()
  };
  chrome.storage.local.set({
    profile: state.profile,
    searchProfiles: state.searchProfiles,
    answers: state.answers,
    applications: state.applications,
    companySources: state.companySources,
    simplifySources: state.simplifySources,
    digestSettings: state.digestSettings,
    aiSettings: state.aiSettings,
    discoveredJobs: state.discoveredJobs,
    todayJobs: state.todayJobs,
    lastDiscoveryAt: state.lastDiscoveryAt
  }, () => {
    document.getElementById("status").textContent = "Saved.";
    if (typeof afterSave === "function") afterSave();
    setTimeout(() => document.getElementById("status").textContent = "", 1800);
  });
}

function applyAiDrafts(drafts) {
  state.profile.applicationAnswers = state.profile.applicationAnswers || {};
  if (drafts.whyCompany) state.profile.applicationAnswers.whyCompany = drafts.whyCompany;
  if (drafts.aiExperience) state.profile.applicationAnswers.aiExperience = drafts.aiExperience;
  if (drafts.keywords?.length) state.profile.applicationAnswers.aiTechnologies = drafts.keywords.join(", ");
  const summary = Array.isArray(drafts.matchSummary) ? drafts.matchSummary.join("\n") : drafts.matchSummary || "";
  document.getElementById("aiMatchSummary").value = [summary, drafts.coverNote].filter(Boolean).join("\n\n");
  renderApplicationAnswers();
}

function generateAiDrafts() {
  save(() => {
    const job = {
      company: document.getElementById("aiJobCompany").value.trim(),
      title: document.getElementById("aiJobTitle").value.trim(),
      description: document.getElementById("aiJobDescription").value.trim()
    };
    if (!job.company && !job.title && !job.description) {
      document.getElementById("status").textContent = "Add a target job description first.";
      return;
    }
    document.getElementById("status").textContent = "Generating AI drafts...";
    chrome.runtime.sendMessage({ type: "GENERATE_AI_DRAFTS", payload: { job } }, (response) => {
      if (chrome.runtime.lastError || !response) {
        document.getElementById("status").textContent = "AI draft generation failed.";
        return;
      }
      if (response.error) {
        document.getElementById("status").textContent = response.error;
        return;
      }
      applyAiDrafts(response.drafts || {});
      save(() => {
        document.getElementById("status").textContent = "AI drafts generated. Review before using.";
      });
    });
  });
}

function isTodayJob(job) {
  const text = String(job?.age || "").toLowerCase().trim();
  return text === "0d" || text === "today" || text === "new";
}

function buildDigestText() {
  const settings = state.digestSettings || {};
  const max = Number(settings.maxJobsInEmail || 60);
  const jobs = todayJobsForDigest().slice(0, max);
  const date = new Date().toLocaleDateString();
  const lines = [
    `Hey ${state.profile.fullName ? state.profile.fullName.split(" ")[0] : ""}! Here is your daily update (${date}) of tech jobs:`,
    "",
    `${jobs.length} new jobs posted today`,
    ""
  ];
  for (const job of jobs) {
    lines.push(`${job.company}: ${job.title}`);
    lines.push(job.url);
    lines.push("");
  }
  lines.push("Open each application link, then use Job Application Copilot to scan and autofill before manual review.");
  return lines.join("\n");
}

function openDigestEmail() {
  save(() => {
    const to = encodeURIComponent(state.digestSettings.recipientEmail || state.profile.email || "");
    const subject = encodeURIComponent(`SWE job digest: ${todayJobsForDigest().length} new jobs today`);
    const body = encodeURIComponent(buildDigestText());
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });
}

function copyDigest() {
  save(() => {
    navigator.clipboard.writeText(buildDigestText()).then(() => {
      document.getElementById("status").textContent = "Digest copied.";
    });
  });
}

function updateSimplifySourcesFromForm(sources) {
  return sources.map((source) => {
    if (source.roleType === "new-grad") {
      return {
        ...source,
        enabled: document.getElementById("newGradEnabled").checked,
        maxAgeDays: Number(document.getElementById("newGradMaxAge").value || 0)
      };
    }
    if (source.roleType === "internship") {
      return {
        ...source,
        enabled: document.getElementById("internshipEnabled").checked,
        maxAgeDays: Number(document.getElementById("internshipMaxAge").value || 0)
      };
    }
    return source;
  });
}

function applyResumeProfile(parsed) {
  const mergeKeys = ["fullName", "email", "phone", "linkedin", "github", "portfolio", "headline", "summary"];
  for (const key of mergeKeys) {
    if (parsed[key]) state.profile[key] = parsed[key];
  }
  state.profile.skills = parsed.skills || [];
  state.profile.experience = parsed.experience || [];
  state.profile.education = parsed.education || [];
  state.profile.rawResumeText = parsed.rawResumeText || "";
  render();
  document.getElementById("status").textContent = "Resume parsed. Review the generated profile, then save.";
}

function parseResumeText(text) {
  const parsed = window.JobCopilotResumeParser.parseResume(text);
  applyResumeProfile(parsed);
}

function readResumeFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const text = String(reader.result || "");
    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        const data = JSON.parse(text);
        parseResumeText(Object.values(data).flat(Infinity).join("\n"));
      } catch {
        parseResumeText(text);
      }
      return;
    }
    parseResumeText(text);
  });
  reader.readAsText(file);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("addProfile").addEventListener("click", () => {
  state.searchProfiles.push({
    id: `profile-${Date.now()}`,
    name: "New Search Profile",
    enabled: true,
    desiredTitles: [],
    requiredKeywords: [],
    preferredKeywords: [],
    excludedKeywords: ["Staff", "Principal", "Manager"],
    maxExperienceYears: 3,
    seniority: ["entry", "junior", "mid"],
    locations: ["Remote"],
    employmentTypes: ["Full-time"],
    minimumScoreToApply: 70
  });
  renderProfiles();
});
document.getElementById("parseResume").addEventListener("click", () => {
  const pasted = document.getElementById("resumeText").value.trim();
  const file = document.getElementById("resumeFile").files[0];
  if (pasted) {
    parseResumeText(pasted);
  } else if (file) {
    readResumeFile(file);
  } else {
    document.getElementById("status").textContent = "Upload a resume text file or paste resume text first.";
  }
});
document.getElementById("addExperience").addEventListener("click", () => {
  state.profile.experience = state.profile.experience || [];
  state.profile.experience.push({ company: "", title: "", startDate: "", endDate: "", bullets: [], skills: [] });
  renderExperience();
});
document.getElementById("addEducation").addEventListener("click", () => {
  state.profile.education = state.profile.education || [];
  state.profile.education.push({ school: "", degree: "", major: "", startDate: "", endDate: "" });
  renderEducation();
});
document.getElementById("runDiscovery").addEventListener("click", () => {
  save(() => {
    document.getElementById("status").textContent = "Running discovery...";
    chrome.runtime.sendMessage({ type: "RUN_DISCOVERY" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        document.getElementById("status").textContent = "Discovery failed. Check extension service worker logs.";
        return;
      }
      state.discoveredJobs = response.discoveredJobs || [];
      state.todayJobs = response.todayJobs || [];
      state.lastDiscoveryAt = response.lastDiscoveryAt || "";
      renderTodayDigest();
      renderDiscoveredJobs();
      document.getElementById("status").textContent = `Discovery complete: ${state.discoveredJobs.length} jobs.`;
    });
  });
});
document.getElementById("emailDigest").addEventListener("click", openDigestEmail);
document.getElementById("copyDigest").addEventListener("click", copyDigest);
document.getElementById("generateAiDrafts").addEventListener("click", generateAiDrafts);

load();
