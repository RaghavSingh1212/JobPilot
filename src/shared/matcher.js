(function initMatcher(global) {
  const SENIORITY_BLOCKERS = [
    "staff",
    "principal",
    "lead",
    "manager",
    "director",
    "head of",
    "vp ",
    "senior manager"
  ];

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitList(value) {
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function includesPhrase(text, phrase) {
    const cleanPhrase = normalizeText(phrase);
    if (!cleanPhrase) return false;
    return text.includes(cleanPhrase);
  }

  function countMatches(text, phrases) {
    return splitList(phrases).filter((phrase) => includesPhrase(text, phrase)).length;
  }

  function detectRequiredYears(text) {
    const matches = [...text.matchAll(/(\d+)\+?\s*(?:-|to\s*)?(?:\d+\s*)?(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience/g)];
    if (!matches.length) return null;
    return Math.max(...matches.map((match) => Number(match[1])).filter(Number.isFinite));
  }

  function detectSeniority(title, description) {
    const text = normalizeText(`${title} ${description}`);
    if (/(intern|internship)/.test(text)) return "intern";
    if (/(entry level|new grad|graduate|junior|jr\.)/.test(text)) return "entry";
    if (/(senior|sr\.)/.test(text)) return "senior";
    if (SENIORITY_BLOCKERS.some((term) => text.includes(term))) return "advanced";
    return "mid";
  }

  function locationMatches(job, profile) {
    const locationText = normalizeText(`${job.location || ""} ${job.remotePolicy || ""}`);
    const wanted = splitList(profile.locations).map(normalizeText);
    if (!wanted.length) return true;
    if (wanted.some((item) => item === "remote") && /remote/.test(locationText)) return true;
    return wanted.some((item) => item && locationText.includes(item));
  }

  function employmentMatches(job, profile) {
    const wanted = splitList(profile.employmentTypes).map(normalizeText);
    if (!wanted.length) return true;
    const jobType = normalizeText(job.employmentType || job.description || "");
    return wanted.some((type) => jobType.includes(type));
  }

  function salaryMatches(job, profile) {
    const min = Number(profile.salaryMinimum || 0);
    if (!min) return true;
    const jobMax = Number(job.salaryMaximum || 0);
    return !jobMax || jobMax >= min;
  }

  function evaluateJob(job, profile) {
    const title = normalizeText(job.title);
    const description = normalizeText(job.description);
    const allText = normalizeText([
      job.company,
      job.title,
      job.department,
      job.location,
      job.remotePolicy,
      job.employmentType,
      job.description
    ].join(" "));

    const hardRejectReasons = [];
    const warnings = [];
    const matched = {
      desiredTitles: splitList(profile.desiredTitles).filter((item) => includesPhrase(title, item)),
      requiredKeywords: splitList(profile.requiredKeywords).filter((item) => includesPhrase(allText, item)),
      preferredKeywords: splitList(profile.preferredKeywords).filter((item) => includesPhrase(allText, item)),
      excludedKeywords: splitList(profile.excludedKeywords).filter((item) => includesPhrase(allText, item))
    };

    if (!matched.desiredTitles.length && splitList(profile.desiredTitles).length) {
      warnings.push("Title is outside the selected job type.");
    }

    const missingRequired = splitList(profile.requiredKeywords).filter((item) => !includesPhrase(allText, item));
    if (missingRequired.length) {
      hardRejectReasons.push(`Missing required keyword: ${missingRequired.join(", ")}`);
    }

    if (matched.excludedKeywords.length) {
      hardRejectReasons.push(`Contains excluded keyword: ${matched.excludedKeywords.join(", ")}`);
    }

    const detectedYears = detectRequiredYears(description);
    const maxYears = Number(profile.maxExperienceYears || 0);
    if (detectedYears !== null && maxYears && detectedYears > maxYears) {
      hardRejectReasons.push(`Requires ${detectedYears}+ years; profile limit is ${maxYears}.`);
    }

    const seniority = detectSeniority(job.title, job.description);
    const allowedSeniorities = splitList(profile.seniority).map(normalizeText);
    if (allowedSeniorities.length && !allowedSeniorities.includes(seniority)) {
      hardRejectReasons.push(`Detected seniority "${seniority}" is outside this profile.`);
    }

    if (!locationMatches(job, profile)) {
      hardRejectReasons.push("Location or remote policy does not match this profile.");
    }

    if (!employmentMatches(job, profile)) {
      hardRejectReasons.push("Employment type does not match this profile.");
    }

    if (!salaryMatches(job, profile)) {
      hardRejectReasons.push("Salary range appears below the profile minimum.");
    }

    const desiredTitleCount = splitList(profile.desiredTitles).length || 1;
    const requiredCount = splitList(profile.requiredKeywords).length || 1;
    const preferredCount = splitList(profile.preferredKeywords).length || 1;

    let score = 0;
    score += Math.min(25, (matched.desiredTitles.length / desiredTitleCount) * 25);
    score += Math.min(30, (matched.requiredKeywords.length / requiredCount) * 30);
    score += Math.min(25, (matched.preferredKeywords.length / preferredCount) * 25);
    score += locationMatches(job, profile) ? 10 : 0;
    score += employmentMatches(job, profile) ? 5 : 0;
    score += salaryMatches(job, profile) ? 5 : 0;
    score -= matched.excludedKeywords.length * 20;
    if (detectedYears !== null && maxYears && detectedYears > maxYears) score -= 25;
    if (hardRejectReasons.length) score = Math.min(score, 49);
    score = Math.max(0, Math.min(100, Math.round(score)));

    const minimumScore = Number(profile.minimumScoreToApply || 70);
    const shouldApply = hardRejectReasons.length === 0 && score >= minimumScore;

    return {
      score,
      shouldApply,
      status: shouldApply ? "strong-match" : hardRejectReasons.length ? "blocked" : "weak-match",
      minimumScore,
      hardRejectReasons,
      warnings,
      matched,
      detected: {
        requiredYears: detectedYears,
        seniority
      }
    };
  }

  function selectBestProfile(job, profiles) {
    const enabled = splitList([]).length ? [] : (profiles || []).filter((profile) => profile.enabled !== false);
    if (!enabled.length) return null;
    return enabled
      .map((profile) => ({ profile, result: evaluateJob(job, profile) }))
      .sort((a, b) => b.result.score - a.result.score)[0];
  }

  const api = {
    normalizeText,
    splitList,
    detectRequiredYears,
    detectSeniority,
    evaluateJob,
    selectBestProfile
  };

  global.JobCopilotMatcher = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
