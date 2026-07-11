(function initContent(global) {
  const STORAGE_KEYS = ["profile", "searchProfiles", "answers", "applications", "companySources", "discoveredJobs"];

  function textOf(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : "";
  }

  function meta(name) {
    const element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return element ? element.getAttribute("content") || "" : "";
  }

  function guessTitle() {
    return (
      textOf("[data-automation-id='jobPostingHeader'] h1") ||
      textOf(".posting-headline h2") ||
      textOf(".app-title") ||
      textOf("h1") ||
      meta("og:title") ||
      document.title
    );
  }

  function guessCompany() {
    const host = location.hostname.replace(/^www\./, "");
    const greenhouse = host.match(/^boards\.greenhouse\.io$/) ? location.pathname.split("/")[1] : "";
    const lever = host.includes("lever.co") ? location.pathname.split("/")[1] : "";
    return (
      textOf("[data-automation-id='jobPostingCompany']") ||
      textOf(".company-name") ||
      textOf(".main-header-logo img[alt]") ||
      greenhouse ||
      lever ||
      host.split(".")[0]
    );
  }

  function guessLocation() {
    return (
      textOf("[data-automation-id='locations']") ||
      textOf(".posting-categories .location") ||
      textOf(".location") ||
      textOf("[class*='location']")
    );
  }

  function pageDescription() {
    const candidates = [
      "[data-automation-id='jobPostingDescription']",
      ".posting-page",
      ".job__description",
      ".job-description",
      "#content",
      "main",
      "article",
      "body"
    ];
    for (const selector of candidates) {
      const element = document.querySelector(selector);
      const text = element ? element.innerText.trim() : "";
      if (text.length > 300) return text.slice(0, 30000);
    }
    return document.body.innerText.slice(0, 30000);
  }

  function extractSalary(description) {
    const match = description.match(/\$([0-9][0-9,]{2,})\s*(?:-|to|–)\s*\$?([0-9][0-9,]{2,})/);
    if (!match) return {};
    return {
      salaryMinimum: Number(match[1].replace(/,/g, "")),
      salaryMaximum: Number(match[2].replace(/,/g, ""))
    };
  }

  function extractJob() {
    const description = pageDescription();
    return {
      url: location.href,
      title: guessTitle(),
      company: guessCompany(),
      location: guessLocation(),
      remotePolicy: /remote/i.test(description) ? "Remote mentioned" : "",
      employmentType: /part[-\s]?time/i.test(description) ? "Part-time" : "Full-time",
      description,
      ...extractSalary(description)
    };
  }

  function fieldLabel(field) {
    const labels = [];
    if (field.id) {
      const byFor = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
      if (byFor) labels.push(byFor.textContent);
    }
    const wrappingLabel = field.closest("label");
    if (wrappingLabel) labels.push(wrappingLabel.textContent);
    labels.push(field.getAttribute("aria-label"));
    labels.push(field.getAttribute("placeholder"));
    labels.push(field.name);
    labels.push(field.id);
    labels.push(field.closest("fieldset")?.textContent);
    labels.push(field.closest("[role='group']")?.textContent);
    return labels.filter(Boolean).join(" ").trim();
  }

  function valueForField(label, profile, answers, job) {
    const clean = global.JobCopilotMatcher.normalizeText(label);
    const engineAnswer = global.JobCopilotApplicationAnswers.getAnswer(label, profile, job);
    if (engineAnswer && (!Array.isArray(engineAnswer) || engineAnswer.length)) return engineAnswer;
    const firstExperience = (profile.experience || [])[0] || {};
    const firstEducation = (profile.education || [])[0] || {};
    const directMap = [
      ["first name", (profile.fullName || "").split(" ")[0]],
      ["last name", (profile.fullName || "").split(" ").slice(1).join(" ")],
      ["full name|name", profile.fullName],
      ["email", profile.email],
      ["phone", profile.phone],
      ["city|location", profile.cityState],
      ["linkedin", profile.linkedin],
      ["github", profile.github],
      ["portfolio|website", profile.portfolio],
      ["headline|current title", profile.headline],
      ["summary|about yourself|profile", profile.summary],
      ["skills|technologies", (profile.skills || []).join(", ")],
      ["company|employer", firstExperience.company],
      ["job title|position|role", firstExperience.title],
      ["start date|from", firstExperience.startDate],
      ["end date|to date|until", firstExperience.endDate],
      ["responsibilities|achievements|experience points|description", (firstExperience.bullets || []).join("\n")],
      ["school|university|college", firstEducation.school],
      ["degree", firstEducation.degree],
      ["major|field of study", firstEducation.major],
      ["education start", firstEducation.startDate],
      ["education end|graduation", firstEducation.endDate]
    ];
    for (const [pattern, value] of directMap) {
      if (new RegExp(pattern).test(clean) && value) return value;
    }
    for (const answer of answers || []) {
      if (!answer.match) continue;
      if (new RegExp(answer.match, "i").test(label)) {
        return answer.valueKey ? profile[answer.valueKey] : answer.value;
      }
    }
    return "";
  }

  function setNativeValue(field, value) {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor.set.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function chooseOptionText(options, value) {
    const values = Array.isArray(value) ? value : [value];
    for (const wanted of values) {
      const cleanWanted = global.JobCopilotMatcher.normalizeText(wanted);
      if (!cleanWanted) continue;
      const exact = options.find((item) => global.JobCopilotMatcher.normalizeText(item.textContent || item.value) === cleanWanted);
      if (exact) return exact;
      const includes = options.find((item) => {
        const cleanOption = global.JobCopilotMatcher.normalizeText(item.textContent || item.value);
        return cleanOption.includes(cleanWanted) || cleanWanted.includes(cleanOption);
      });
      if (includes) return includes;
    }
    return null;
  }

  function clickChoice(field, value) {
    const label = fieldLabel(field);
    const optionText = field.closest("label")?.textContent || field.value || label;
    const values = Array.isArray(value) ? value : [value];
    const shouldChoose = values.some((wanted) => {
      const cleanWanted = global.JobCopilotMatcher.normalizeText(wanted);
      const cleanOption = global.JobCopilotMatcher.normalizeText(optionText);
      return cleanWanted && (cleanOption.includes(cleanWanted) || cleanWanted.includes(cleanOption));
    });
    if (!shouldChoose) return false;
    field.click();
    field.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function fillCustomControls(profile, job, unknown) {
    const controls = [...document.querySelectorAll("[role='radio'], [role='checkbox'], button, [data-testid], [aria-label]")];
    let filled = 0;
    for (const control of controls) {
      if (control.matches("input, textarea, select") || control.disabled) continue;
      const label = fieldLabel(control) || control.textContent || control.getAttribute("aria-label") || "";
      const value = valueForField(label, profile, [], job);
      if (!value) continue;
      const values = Array.isArray(value) ? value : [value];
      const optionText = global.JobCopilotMatcher.normalizeText(control.textContent || control.getAttribute("aria-label"));
      if (!values.some((item) => optionText.includes(global.JobCopilotMatcher.normalizeText(item)))) continue;
      control.click();
      filled += 1;
    }
    return filled;
  }

  function autofill(profile, answers, job) {
    const fields = [...document.querySelectorAll("input, textarea, select")].filter((field) => {
      const type = (field.getAttribute("type") || "").toLowerCase();
      return !field.disabled && !field.readOnly && !["hidden", "submit", "button", "password"].includes(type);
    });
    const filled = [];
    const unknown = [];

    for (const field of fields) {
      const label = fieldLabel(field);
      const type = (field.getAttribute("type") || "").toLowerCase();
      if (type === "file") {
        unknown.push(`${label || "File upload"}: attach manually`);
        continue;
      }
      const value = valueForField(label, profile, answers, job);
      if (!value) {
        if (label) unknown.push(label);
        continue;
      }
      if (field.tagName === "SELECT") {
        const option = chooseOptionText([...field.options], value);
        if (option) {
          field.value = option.value;
          field.dispatchEvent(new Event("change", { bubbles: true }));
          filled.push(label);
        } else {
          unknown.push(label);
        }
      } else if (["radio", "checkbox"].includes(type)) {
        if (clickChoice(field, value)) {
          filled.push(label);
        }
      } else {
        setNativeValue(field, value);
        filled.push(label);
      }
    }

    const customFilled = fillCustomControls(profile, job, unknown);
    if (customFilled) filled.push(`${customFilled} custom choices`);

    showReviewOverlay(filled, unknown);
    return { filled, unknown };
  }

  function showReviewOverlay(filled, unknown) {
    const old = document.getElementById("job-copilot-review");
    if (old) old.remove();
    const panel = document.createElement("section");
    panel.id = "job-copilot-review";
    panel.innerHTML = `
      <div class="jc-panel">
        <button class="jc-close" type="button" aria-label="Close">x</button>
        <h2>Review before submitting</h2>
        <p>${filled.length} fields filled. ${unknown.length} fields need review.</p>
        <strong>Needs review</strong>
        <ul>${unknown.slice(0, 12).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>None detected</li>"}</ul>
      </div>
    `;
    const style = document.createElement("style");
    style.textContent = `
      #job-copilot-review{position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:360px;font-family:Inter,Arial,sans-serif}
      #job-copilot-review .jc-panel{background:#111827;color:#fff;border:1px solid #374151;border-radius:8px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      #job-copilot-review h2{font-size:16px;margin:0 28px 8px 0}
      #job-copilot-review p,#job-copilot-review li{font-size:13px;line-height:1.4}
      #job-copilot-review ul{max-height:160px;overflow:auto;padding-left:18px}
      #job-copilot-review .jc-close{position:absolute;right:8px;top:8px;border:0;background:#374151;color:#fff;border-radius:4px;width:24px;height:24px;cursor:pointer}
    `;
    panel.appendChild(style);
    document.body.appendChild(panel);
    panel.querySelector(".jc-close").addEventListener("click", () => panel.remove());
  }

  function showLauncher() {
    if (document.getElementById("job-copilot-launcher")) return;
    const launcher = document.createElement("aside");
    launcher.id = "job-copilot-launcher";
    launcher.innerHTML = `
      <style>
        #job-copilot-launcher{position:fixed;z-index:2147483646;right:16px;top:16px;font-family:Inter,Arial,sans-serif}
        #job-copilot-launcher .jc-launch{display:flex;align-items:center;gap:10px;background:#fff;color:#172033;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 14px 40px rgba(15,23,42,.18);padding:10px 12px;max-width:280px}
        #job-copilot-launcher strong{font-size:13px}
        #job-copilot-launcher span{display:block;color:#586579;font-size:12px;line-height:1.25}
        #job-copilot-launcher button{border:0;background:#14532d;color:#fff;border-radius:6px;min-height:30px;padding:0 10px;font-weight:700;cursor:pointer}
      </style>
      <div class="jc-launch">
        <div>
          <strong>Job Copilot ready</strong>
          <span>Open the extension popup to autofill this application.</span>
        </div>
        <button type="button">Fill</button>
      </div>
    `;
    launcher.querySelector("button").addEventListener("click", () => {
      loadState((state) => {
        const job = extractJob();
        autofill(state.profile, state.answers, job);
      });
    });
    document.body.appendChild(launcher);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function loadState(callback) {
    chrome.storage.local.get(STORAGE_KEYS, (stored) => {
      callback({
        ...global.JobCopilotDefaults,
        ...stored,
        profile: {
          ...global.JobCopilotDefaults.profile,
          ...(stored.profile || {}),
          applicationAnswers: {
            ...global.JobCopilotDefaults.profile.applicationAnswers,
            ...((stored.profile || {}).applicationAnswers || {})
          }
        },
        searchProfiles: stored.searchProfiles || global.JobCopilotDefaults.searchProfiles,
        answers: stored.answers || global.JobCopilotDefaults.answers
      });
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "AUTOFILL_APPLICATION") {
      loadState((state) => {
        const job = extractJob();
        const result = autofill(state.profile, state.answers, job);
        sendResponse(result);
      });
      return true;
    }

    return false;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showLauncher, { once: true });
  } else {
    showLauncher();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
