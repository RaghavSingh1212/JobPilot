importScripts("shared/defaults.js", "shared/matcher.js", "shared/jobDiscovery.js", "shared/llmAssistant.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["profile", "searchProfiles", "companySources", "simplifySources", "webSearchSettings"], (stored) => {
    if (!stored.searchProfiles) {
      chrome.storage.local.set(structuredClone(globalThis.JobCopilotDefaults));
      return;
    }
    const patch = {};
    if (!stored.companySources) patch.companySources = globalThis.JobCopilotDefaults.companySources;
    if (!stored.simplifySources) patch.simplifySources = globalThis.JobCopilotDefaults.simplifySources;
    if (!stored.webSearchSettings) patch.webSearchSettings = globalThis.JobCopilotDefaults.webSearchSettings;
    if (!stored.profile?.applicationAnswers) {
      patch.profile = {
        ...globalThis.JobCopilotDefaults.profile,
        ...(stored.profile || {}),
        applicationAnswers: {
          ...globalThis.JobCopilotDefaults.profile.applicationAnswers,
          ...((stored.profile || {}).applicationAnswers || {})
        }
      };
    }
    if (Object.keys(patch).length) chrome.storage.local.set(patch);
  });
  chrome.alarms.create("job-copilot-discovery", { periodInMinutes: 720 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "job-copilot-discovery") return;
  runDiscovery();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RUN_DISCOVERY") {
    runDiscovery().then(sendResponse);
    return true;
  }
  if (message.type === "GENERATE_AI_DRAFTS") {
    generateAiDrafts(message.payload).then((drafts) => sendResponse({ drafts })).catch((error) => {
      sendResponse({ error: error.message || "AI draft generation failed." });
    });
    return true;
  }
  return false;
});

async function generateAiDrafts(payload = {}) {
  const stored = await chrome.storage.local.get(["profile", "aiSettings"]);
  return globalThis.JobCopilotLlmAssistant.generateDrafts({
    settings: {
      ...globalThis.JobCopilotDefaults.aiSettings,
      ...(stored.aiSettings || {})
    },
    profile: {
      ...globalThis.JobCopilotDefaults.profile,
      ...(stored.profile || {})
    },
    job: payload.job || {}
  });
}

async function runDiscovery() {
  const stored = await chrome.storage.local.get(["companySources", "simplifySources", "webSearchSettings", "searchProfiles", "discoveredJobs"]);
  const sources = stored.companySources || globalThis.JobCopilotDefaults.companySources;
  const simplifySources = stored.simplifySources || globalThis.JobCopilotDefaults.simplifySources;
  const webSearchSettings = {
    ...globalThis.JobCopilotDefaults.webSearchSettings,
    ...(stored.webSearchSettings || {})
  };
  const profiles = stored.searchProfiles || globalThis.JobCopilotDefaults.searchProfiles;
  const jobs = await globalThis.JobCopilotDiscovery.discoverAll({
    companySources: sources,
    simplifySources,
    webSearchSettings,
    profiles,
    matcher: globalThis.JobCopilotMatcher
  });
  const payload = {
    discoveredJobs: jobs.slice(0, 250),
    todayJobs: jobs.filter((job) => globalThis.JobCopilotDiscovery.isTodayJob(job)).slice(0, 100),
    lastDiscoveryAt: new Date().toISOString()
  };
  await chrome.storage.local.set(payload);
  return payload;
}
