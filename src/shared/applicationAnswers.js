(function initApplicationAnswers(global) {
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s/-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function list(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];
    return String(value).split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  }

  function firstEducation(profile) {
    return (profile.education || [])[0] || {};
  }

  function firstExperience(profile) {
    return (profile.experience || [])[0] || {};
  }

  function applicationAnswers(profile) {
    return profile.applicationAnswers || {};
  }

  function generatedWhyCompany(job, profile) {
    const company = job?.company || "your company";
    const title = job?.title || "this role";
    const skills = (profile.skills || []).slice(0, 5).join(", ");
    const summary = profile.summary || profile.headline || "my background";
    return `I am interested in ${company} because ${title} connects closely with ${summary}. My experience with ${skills || "the required skills"} makes me excited to contribute quickly, learn from the team, and work on problems that match the role requirements.`;
  }

  function generatedAIExperience(profile) {
    const skills = (profile.skills || []).filter((skill) => /llm|ai|machine|pytorch|tensorflow|rag|python|evaluation/i.test(skill));
    const bullets = (profile.experience || []).flatMap((entry) => entry.bullets || []).filter((bullet) => /ai|llm|machine|model|python|evaluation|data/i.test(bullet));
    return [...bullets.slice(0, 3), skills.length ? `Technologies: ${skills.join(", ")}.` : ""].filter(Boolean).join(" ");
  }

  function getAnswer(label, profile, job = {}) {
    const clean = normalize(label);
    const edu = firstEducation(profile);
    const exp = firstExperience(profile);
    const app = applicationAnswers(profile);

    const rules = [
      [/first name/, () => (profile.fullName || "").split(" ")[0]],
      [/last name/, () => (profile.fullName || "").split(" ").slice(1).join(" ")],
      [/\b(full )?name\b/, () => profile.fullName],
      [/preferred name|what would you like us to call you/, () => app.preferredName || profile.fullName],
      [/pronunciation/, () => app.namePronunciation],
      [/email/, () => profile.email],
      [/phone/, () => profile.phone],
      [/current location|location city|city|location/, () => profile.cityState],
      [/linkedin/, () => profile.linkedin],
      [/github/, () => profile.github],
      [/portfolio|website|previous work|papers|code|projects|blog posts/, () => app.previousWorkLinks || profile.portfolio || profile.github],
      [/current company|company|employer/, () => exp.company],
      [/current title|job title|position|role/, () => profile.headline || exp.title],
      [/school|university|college|currently attending|last attend/, () => app.university || edu.school],
      [/degree type|degree/, () => app.degreeType || edu.degree],
      [/major|field of study/, () => edu.major],
      [/graduation date/, () => app.graduationDate || edu.endDate],
      [/graduation year|anticipated graduation year|year of graduation/, () => app.graduationYear || yearFrom(edu.endDate)],
      [/gpa/, () => app.gpa],
      [/high school name/, () => app.highSchoolName],
      [/high school graduation|year of high school/, () => app.highSchoolGradYear],
      [/legally authorized|authorized to work|work lawfully|employment eligibility/, () => app.authorizedToWorkUS],
      [/sponsorship.*future|future.*sponsorship|now or in the future require sponsorship/, () => app.sponsorshipFuture],
      [/sponsorship|visa status|h-1b|h1b|opt|tn|immigration/, () => app.sponsorshipNow === "Yes" ? app.visaStatus : "No"],
      [/relocate/, () => app.willingToRelocate],
      [/anchor days|offices on mondays|office.*hybrid/, () => app.officeAnchorDays],
      [/how did you hear|heard about/, () => app.howHeard],
      [/prior internships|how many internships/, () => app.priorInternships],
      [/experience with llms|do you have experience with llms/, () => app.hasLLMExperience],
      [/personal project.*llm|built.*llm/, () => app.hasLLMProject],
      [/describe your ai experience|ai experience/, () => app.aiExperience || generatedAIExperience(profile)],
      [/ai specific technologies|technologies.*comfortable/, () => app.aiTechnologies || (profile.skills || []).join(", ")],
      [/why do you want|why.*work at|why.*company/, () => app.whyCompany || generatedWhyCompany(job, profile)],
      [/language skill/, () => list(app.languages)],
      [/offer deadlines/, () => app.offerDeadlines],
      [/dates\?|deadline dates/, () => app.offerDeadlineDates],
      [/anticipated start date|start date/, () => app.anticipatedStartDate],
      [/preferred office location|preferred location/, () => list(app.preferredLocations)],
      [/further context.*preference|context on preference/, () => app.preferredLocationContext],
      [/cohort start date/, () => app.cohortStartDate],
      [/research proposal/, () => app.researchProposalLink],
      [/worked at doordash|previous.*employee|previous doordash/, () => app.previousEmployerStatus],
      [/privacy acknowledgement|applicant privacy|read and understand/, () => app.privacyAcknowledgement],
      [/sms|whatsapp|communications via sms/, () => app.smsConsent],
      [/fdse|forward deployed|software engineer roles/, () => app.palantirRolePreference],
      [/palantir product|preferred product/, () => list(app.palantirProductPreference)],
      [/ai notetaker|notetaker/, () => app.aiNotetakerConsent],
      [/pronouns/, () => app.pronouns],
      [/gender/, () => app.gender],
      [/transgender/, () => app.transgender],
      [/hispanic|latinx/, () => app.hispanicLatinx],
      [/race/, () => app.race],
      [/veteran/, () => app.veteranStatus],
      [/disability/, () => app.disabilityStatus],
      [/skills|technologies/, () => (profile.skills || []).join(", ")],
      [/summary|about yourself|profile/, () => profile.summary],
      [/responsibilities|achievements|experience points|description/, () => (exp.bullets || []).join("\n")]
    ];

    for (const [pattern, getter] of rules) {
      if (!pattern.test(clean)) continue;
      const value = getter();
      if (Array.isArray(value)) return value;
      if (value !== undefined && value !== null && String(value).trim()) return value;
    }
    return "";
  }

  function yearFrom(value) {
    return String(value || "").match(/\d{4}/)?.[0] || "";
  }

  const api = { getAnswer, generatedWhyCompany, generatedAIExperience, normalize, list };
  global.JobCopilotApplicationAnswers = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
