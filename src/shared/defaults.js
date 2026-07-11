(function initDefaults(global) {
  const defaults = {
    profile: {
      fullName: "",
      email: "",
      phone: "",
      cityState: "",
      linkedin: "",
      github: "",
      portfolio: "",
      workAuthorization: "Authorized to work in the selected country",
      needsSponsorshipNow: false,
      needsSponsorshipFuture: false,
      salaryMinimum: 0,
      resumeFileName: "resume.pdf",
      headline: "",
      summary: "",
      skills: [],
      experience: [],
      education: [],
      applicationAnswers: {
        pronouns: "",
        authorizedToWorkUS: "Yes",
        sponsorshipNow: "No",
        sponsorshipFuture: "No",
        visaStatus: "None",
        willingToRelocate: "",
        officeAnchorDays: "",
        howHeard: "LinkedIn",
        priorInternships: "",
        hasLLMExperience: "",
        hasLLMProject: "",
        aiExperience: "",
        aiTechnologies: "",
        whyCompany: "",
        preferredName: "",
        namePronunciation: "",
        languages: ["English (ENG)"],
        offerDeadlines: "No",
        offerDeadlineDates: "",
        anticipatedStartDate: "",
        preferredLocations: [],
        preferredLocationContext: "",
        highSchoolName: "",
        highSchoolGradYear: "",
        university: "",
        graduationYear: "",
        graduationDate: "",
        degreeType: "",
        gpa: "",
        cohortStartDate: "",
        researchProposalLink: "",
        previousWorkLinks: "",
        previousEmployerStatus: "No",
        privacyAcknowledgement: "Yes",
        smsConsent: "No",
        palantirRolePreference: "",
        palantirProductPreference: [],
        aiNotetakerConsent: "No",
        gender: "Decline to self-identify",
        transgender: "Prefer not to say",
        hispanicLatinx: "Decline to self-identify",
        race: "Decline to self-identify",
        veteranStatus: "I decline to self-identify for protected veteran status",
        disabilityStatus: "I do not want to answer"
      }
    },
    companySources: [
      { company: "Notion", platform: "ashby", slug: "notion", enabled: true },
      { company: "Palantir", platform: "lever", slug: "palantir", enabled: true },
      { company: "DoorDash", platform: "greenhouse", slug: "doordashusa", enabled: true }
    ],
    simplifySources: [
      {
        name: "SimplifyJobs New Grad",
        roleType: "new-grad",
        enabled: true,
        url: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md",
        maxAgeDays: 14
      },
      {
        name: "SimplifyJobs Summer Internships",
        roleType: "internship",
        enabled: false,
        url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
        maxAgeDays: 14
      }
    ],
    webSearchSettings: {
      enabled: false,
      provider: "serpapi",
      apiKey: "",
      searchEngineId: "",
      resultsPerQuery: 10,
      maxQueries: 8,
      freshnessDays: 14,
      includeQueries: [
        "software engineer new grad jobs",
        "backend engineer new grad jobs",
        "AI engineer new grad jobs",
        "software engineer internship jobs"
      ],
      excludedSites: ["linkedin.com", "indeed.com", "glassdoor.com"],
      preferredSites: [
        "jobs.lever.co",
        "boards.greenhouse.io",
        "job-boards.greenhouse.io",
        "jobs.ashbyhq.com",
        "workdayjobs.com"
      ]
    },
    digestSettings: {
      recipientEmail: "",
      includeOnlyStrongMatches: false,
      maxJobsInEmail: 60
    },
    aiSettings: {
      enabled: false,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4.1-mini",
      apiKey: "",
      temperature: 0.3,
      tone: "concise, specific, and confident"
    },
    searchProfiles: [
      {
        id: "backend",
        name: "Backend Engineer",
        enabled: true,
        desiredTitles: ["Backend Engineer", "Software Engineer", "Platform Engineer"],
        requiredKeywords: ["Python"],
        preferredKeywords: ["FastAPI", "Docker", "PostgreSQL", "AWS", "APIs"],
        excludedKeywords: ["Staff", "Principal", "Manager", "Director", "PhD required"],
        maxExperienceYears: 3,
        seniority: ["entry", "junior", "mid"],
        locations: ["Remote", "San Francisco", "Bay Area"],
        employmentTypes: ["Full-time"],
        remotePreference: "remote-or-hybrid",
        minimumScoreToApply: 70
      },
      {
        id: "ai-engineer",
        name: "AI / ML Engineer",
        enabled: true,
        desiredTitles: ["AI Engineer", "ML Engineer", "Machine Learning Engineer", "LLM Engineer"],
        requiredKeywords: ["Python"],
        preferredKeywords: ["PyTorch", "LLM", "evaluation", "inference", "RAG", "fine tuning"],
        excludedKeywords: ["Staff", "Principal", "Manager", "Director", "PhD required"],
        maxExperienceYears: 3,
        seniority: ["entry", "junior", "mid"],
        locations: ["Remote", "San Francisco", "Bay Area"],
        employmentTypes: ["Full-time"],
        remotePreference: "remote-or-hybrid",
        minimumScoreToApply: 72
      }
    ],
    answers: [
      { label: "LinkedIn", match: "linkedin", valueKey: "linkedin" },
      { label: "GitHub", match: "github", valueKey: "github" },
      { label: "Portfolio", match: "portfolio|website", valueKey: "portfolio" },
      { label: "Work authorization", match: "authorized|authorization|eligible to work", valueKey: "workAuthorization" },
      { label: "Sponsorship now", match: "sponsorship now|require sponsorship", value: "No" },
      { label: "Future sponsorship", match: "future sponsorship", value: "No" }
    ],
    applications: []
  };

  global.JobCopilotDefaults = defaults;

  if (typeof module !== "undefined") {
    module.exports = defaults;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
