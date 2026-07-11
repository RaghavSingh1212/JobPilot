(function initJobDiscovery(global) {
  function normalizeGreenhouse(source, item) {
    return {
      externalId: String(item.id || item.absolute_url || ""),
      company: source.company,
      platform: "greenhouse",
      title: item.title || "",
      location: (item.location && item.location.name) || "",
      department: (item.departments || []).map((dept) => dept.name).join(", "),
      employmentType: "",
      url: item.absolute_url || "",
      description: htmlToText(item.content || "")
    };
  }

  function normalizeLever(source, item) {
    return {
      externalId: item.id || item.hostedUrl || "",
      company: source.company,
      platform: "lever",
      title: item.text || "",
      location: item.categories?.location || "",
      department: item.categories?.team || "",
      employmentType: item.categories?.commitment || "",
      url: item.hostedUrl || item.applyUrl || "",
      description: htmlToText(`${item.description || ""}\n${(item.lists || []).map((list) => `${list.text}\n${list.content}`).join("\n")}`)
    };
  }

  function normalizeAshby(source, item) {
    return {
      externalId: item.id || item.jobId || item.applyUrl || "",
      company: source.company,
      platform: "ashby",
      title: item.title || "",
      location: [item.location, item.locationName].filter(Boolean).join(", "),
      department: item.department || "",
      employmentType: item.employmentType || "",
      url: item.jobUrl || item.applyUrl || `https://jobs.ashbyhq.com/${source.slug}/${item.id || ""}`,
      description: htmlToText(item.descriptionHtml || item.description || "")
    };
  }

  async function fetchSource(source) {
    if (!source.enabled) return [];
    if (source.platform === "greenhouse") {
      const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.slug)}/jobs?content=true`);
      const data = await response.json();
      return (data.jobs || []).map((item) => normalizeGreenhouse(source, item));
    }
    if (source.platform === "lever") {
      const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(source.slug)}?mode=json`);
      const data = await response.json();
      return (Array.isArray(data) ? data : []).map((item) => normalizeLever(source, item));
    }
    if (source.platform === "ashby") {
      const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      const data = await response.json();
      return (data.jobs || []).map((item) => normalizeAshby(source, item));
    }
    return [];
  }

  async function fetchSimplifySource(source) {
    if (!source.enabled) return [];
    const response = await fetch(source.url);
    const markdown = await response.text();
    return parseSimplifyMarkdown(markdown, source);
  }

  async function discoverSimplifyJobs(sources, profiles, matcher) {
    const enabled = (sources || []).filter((source) => source.enabled !== false);
    const batches = await Promise.allSettled(enabled.map(fetchSimplifySource));
    const jobs = batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
    return scoreJobs(dedupeJobs(jobs), profiles, matcher);
  }

  async function discoverJobs(sources, profiles, matcher) {
    const enabled = (sources || []).filter((source) => source.enabled !== false);
    const batches = await Promise.allSettled(enabled.map(fetchSource));
    const jobs = batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
    return scoreJobs(dedupeJobs(jobs), profiles, matcher);
  }

  async function discoverAll({ companySources = [], simplifySources = [], profiles = [], matcher }) {
    const [companyJobs, simplifyJobs] = await Promise.all([
      discoverJobs(companySources, profiles, matcher),
      discoverSimplifyJobs(simplifySources, profiles, matcher)
    ]);
    return dedupeJobs([...companyJobs, ...simplifyJobs]).sort((a, b) => b.score - a.score);
  }

  function scoreJobs(jobs, profiles, matcher) {
    return jobs
      .map((job) => {
        const best = matcher.selectBestProfile(job, profiles);
        return {
          ...job,
          score: best?.result.score ?? 0,
          decision: best?.result.status || "unscored",
          shouldApply: Boolean(best?.result.shouldApply),
          profileName: best?.profile.name || "",
          reasons: best?.result.hardRejectReasons || []
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function parseSimplifyMarkdown(markdown, source) {
    const htmlJobs = parseSimplifyHtmlTables(markdown, source);
    if (htmlJobs.length) return htmlJobs;

    const rows = String(markdown || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line));
    const jobs = [];
    for (const row of rows) {
      if (/company\s*\|\s*role/i.test(row)) continue;
      const cells = splitMarkdownRow(row);
      if (cells.length < 4) continue;
      const [companyCell, roleCell, locationCell, applicationCell, ageCell = ""] = cells;
      const company = stripMarkdown(companyCell);
      const title = stripMarkdown(roleCell);
      const location = stripMarkdown(locationCell);
      const age = stripMarkdown(ageCell);
      const url = chooseApplicationUrl(applicationCell) || chooseApplicationUrl(roleCell) || chooseApplicationUrl(companyCell);
      if (!company || !title || !url) continue;
      if (!ageWithinLimit(age, source.maxAgeDays)) continue;
      jobs.push({
        externalId: `${source.roleType}:${company}:${title}:${url}`,
        company,
        platform: "simplify",
        source: source.name,
        roleType: source.roleType,
        title,
        location,
        employmentType: source.roleType === "internship" ? "Internship" : "Full-time",
        url,
        age,
        description: `${title} ${company} ${location} ${source.roleType}`
      });
    }
    return jobs;
  }

  function parseSimplifyHtmlTables(markdown, source) {
    const rows = [...String(markdown || "").matchAll(/<tr>\s*([\s\S]*?)\s*<\/tr>/gi)].map((match) => match[1]);
    const jobs = [];
    let lastCompany = "";

    for (const row of rows) {
      if (/<th[\s>]/i.test(row)) continue;
      const cells = [...row.matchAll(/<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi)].map((match) => match[1].trim());
      if (cells.length < 5) continue;

      const [companyCell, roleCell, locationCell, applicationCell, ageCell] = cells;
      let company = stripMarkdown(companyCell);
      if (company === "↳" || !company) {
        company = lastCompany;
      } else {
        lastCompany = company;
      }

      const title = stripMarkdown(roleCell);
      const location = stripMarkdown(locationCell);
      const age = stripMarkdown(ageCell);
      const url = chooseApplicationUrl(applicationCell);

      if (!company || !title || !url) continue;
      if (!ageWithinLimit(age, source.maxAgeDays)) continue;

      jobs.push({
        externalId: `${source.roleType}:${company}:${title}:${url}`,
        company,
        platform: "simplify",
        source: source.name,
        roleType: source.roleType,
        title,
        location,
        employmentType: source.roleType === "internship" ? "Internship" : "Full-time",
        url,
        age,
        description: `${title} ${company} ${location} ${source.roleType}`
      });
    }

    return jobs;
  }

  function splitMarkdownRow(row) {
    return row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim());
  }

  function markdownLinks(cell) {
    const links = [];
    const pattern = /\[[^\]]*]\(([^)]+)\)|<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let match = pattern.exec(cell);
    while (match) {
      links.push(match[1] || match[2]);
      match = pattern.exec(cell);
    }
    return links;
  }

  function chooseApplicationUrl(cell) {
    const links = markdownLinks(cell).filter((url) => !/raw\.githubusercontent|simplify\.jobs\/\?|i\.imgur\.com/.test(url));
    if (!links.length) return "";
    return links.find((url) => !/simplify\.jobs/i.test(url)) || links[0];
  }

  function stripMarkdown(value) {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/br>/gi, " ")
      .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/<a\s+[^>]*href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/gi, "$1")
      .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/↳/g, "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function ageWithinLimit(age, maxAgeDays) {
    const max = Number(maxAgeDays || 0);
    if (!max) return true;
    const text = String(age || "").toLowerCase();
    const days = text.match(/(\d+)\s*d/);
    if (days) return Number(days[1]) <= max;
    if (/today|new|0d/.test(text)) return true;
    if (/mo|month|year|yr/.test(text)) return false;
    return true;
  }

  function isTodayJob(job) {
    const text = String(job?.age || "").toLowerCase().trim();
    return text === "0d" || text === "today" || text === "new";
  }

  function dedupeJobs(jobs) {
    const seen = new Set();
    const result = [];
    for (const job of jobs) {
      const key = `${job.platform}:${job.externalId || job.url || job.company + job.title}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(job);
    }
    return result;
  }

  function htmlToText(html) {
    return String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  const api = {
    discoverJobs,
    discoverSimplifyJobs,
    discoverAll,
    fetchSource,
    fetchSimplifySource,
    parseSimplifyMarkdown,
    parseSimplifyHtmlTables,
    isTodayJob,
    htmlToText,
    normalizeGreenhouse,
    normalizeLever,
    normalizeAshby
  };
  global.JobCopilotDiscovery = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
