(function initResumeParser(global) {
  const SECTION_ALIASES = {
    summary: ["summary", "profile", "professional summary", "objective"],
    experience: ["experience", "work experience", "professional experience", "employment", "work history"],
    education: ["education", "academic background"],
    skills: ["skills", "technical skills", "technologies", "core skills"]
  };

  const SKILL_HINTS = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "SQL",
    "React", "Node.js", "FastAPI", "Django", "Flask", "PostgreSQL", "MySQL", "MongoDB",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux", "Git",
    "PyTorch", "TensorFlow", "scikit-learn", "Pandas", "NumPy", "LLM", "RAG",
    "Machine Learning", "Data Science", "APIs", "GraphQL", "REST"
  ];

  function normalizeLines(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  function cleanBullet(line) {
    return String(line || "").replace(/^[-*•·\u2022]\s*/, "").trim();
  }

  function detectSection(line) {
    const clean = line.toLowerCase().replace(/[:\-]/g, "").trim();
    for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
      if (aliases.includes(clean)) return section;
    }
    return "";
  }

  function splitSections(lines) {
    const sections = { header: [] };
    let current = "header";
    for (const line of lines) {
      const section = detectSection(line);
      if (section) {
        current = section;
        sections[current] = sections[current] || [];
      } else {
        sections[current] = sections[current] || [];
        sections[current].push(line);
      }
    }
    return sections;
  }

  function parseContact(lines) {
    const firstLines = lines.slice(0, 8).join(" ");
    const email = firstLines.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const phone = firstLines.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] || "";
    const linkedin = firstLines.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,]+/i)?.[0] || "";
    const github = firstLines.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,]+/i)?.[0] || "";
    const portfolio = firstLines.match(/https?:\/\/(?!.*(?:linkedin|github))[^\s|,]+/i)?.[0] || "";
    const fullName = lines.find((line) => {
      if (line.includes("@") || /\d{3}/.test(line)) return false;
      const words = line.split(/\s+/);
      return words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Z][A-Za-z'.-]+$/.test(word));
    }) || "";

    return { fullName, email, phone, linkedin, github, portfolio };
  }

  function parseSkills(sections, allText) {
    const skillText = [...(sections.skills || []), allText].join(" ");
    const found = SKILL_HINTS.filter((skill) => new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(skillText));
    const explicit = (sections.skills || [])
      .join(",")
      .split(/[,|]/)
      .map(cleanBullet)
      .filter((item) => item.length > 1 && item.length < 40);
    return unique([...explicit, ...found]).slice(0, 80);
  }

  function parseDateRange(line) {
    const datePattern = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\\.?\\s*\\d{4}|Present|Current";
    const regex = new RegExp(`(${datePattern})\\s*(?:-|–|—|to)\\s*(${datePattern})`, "i");
    const match = line.match(regex);
    if (!match) return { startDate: "", endDate: "" };
    return { startDate: match[1].trim(), endDate: match[2].trim() };
  }

  function parseExperience(sections) {
    const lines = sections.experience || [];
    const entries = [];
    let current = null;

    for (const rawLine of lines) {
      const line = cleanBullet(rawLine);
      const dateRange = parseDateRange(line);
      const looksLikeRole = dateRange.startDate || /(?:engineer|developer|analyst|scientist|manager|intern|consultant|assistant|associate|lead)/i.test(line);
      const isBullet = /^[-*•·\u2022]/.test(rawLine) || (!looksLikeRole && current);

      if (looksLikeRole && !isBullet) {
        if (current) entries.push(current);
        const withoutDates = line.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s*\d{4}\s*(?:-|–|—|to)\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s*(?:\d{4}|Present|Current)/i, "").trim();
        const parts = withoutDates.split(/\s(?:at|@|\||,|-|–|—)\s/).map((part) => part.trim()).filter(Boolean);
        current = {
          company: parts.length > 1 ? cleanTrailing(parts[1]) : "",
          title: parts[0] || withoutDates,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          bullets: [],
          skills: []
        };
      } else if (current && line) {
        current.bullets.push(line);
      }
    }
    if (current) entries.push(current);
    return entries.slice(0, 12);
  }

  function parseEducation(sections) {
    const lines = sections.education || [];
    const entries = [];
    for (const line of lines) {
      const dates = parseDateRange(line);
      const degree = line.match(/\b(B\.?S\.?|M\.?S\.?|Bachelors?|Masters?|Ph\.?D\.?|MBA|Associate|Bachelor of [^,|]+|Master of [^,|]+)\b/i)?.[0] || "";
      const major = line.match(/(?:in|major(?:ed)? in)\s+([^,|]+)(?:,|\||$)/i)?.[1]?.trim() || "";
      const school = line
        .replace(degree, "")
        .replace(major, "")
        .replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s*\d{4}\s*(?:-|–|—|to)\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)?\.?\s*(?:\d{4}|Present|Current)/i, "")
        .replace(/\b(in|major(?:ed)? in)\b/gi, "")
        .replace(/[|,–—-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (school || degree || major) {
        entries.push({ school, degree, major, startDate: dates.startDate, endDate: dates.endDate });
      }
    }
    return entries.slice(0, 6);
  }

  function parseResume(text) {
    const lines = normalizeLines(text);
    const sections = splitSections(lines);
    const contact = parseContact(lines);
    const allText = lines.join(" ");
    const summary = (sections.summary || []).slice(0, 4).join(" ");
    const skills = parseSkills(sections, allText);
    const experience = parseExperience(sections);
    const education = parseEducation(sections);
    const headline = experience[0]?.title || "";

    return {
      ...contact,
      headline,
      summary,
      skills,
      experience,
      education,
      rawResumeText: text
    };
  }

  function unique(items) {
    const seen = new Set();
    const result = [];
    for (const item of items) {
      const clean = String(item || "").trim();
      const key = clean.toLowerCase();
      if (!clean || seen.has(key)) continue;
      seen.add(key);
      result.push(clean);
    }
    return result;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function cleanTrailing(value) {
    return String(value || "").replace(/[|,–—-]+\s*$/g, "").trim();
  }

  const api = { parseResume, normalizeLines, splitSections, parseDateRange };
  global.JobCopilotResumeParser = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
