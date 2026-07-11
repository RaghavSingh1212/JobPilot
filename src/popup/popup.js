function activeTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => callback(tab));
}

function setBusy(isBusy) {
  const button = document.getElementById("autofill");
  button.disabled = isBusy;
  button.textContent = isBusy ? "Filling..." : "Autofill application";
}

function showSummary(title, text) {
  document.getElementById("summary").hidden = false;
  document.getElementById("summaryTitle").textContent = title;
  document.getElementById("summaryText").textContent = text;
}

document.getElementById("autofill").addEventListener("click", () => {
  setBusy(true);
  activeTab((tab) => {
    chrome.tabs.sendMessage(tab.id, { type: "AUTOFILL_APPLICATION" }, (response) => {
      setBusy(false);
      if (chrome.runtime.lastError || !response) {
        showSummary("Could not autofill", "Reload the application page and try again.");
        return;
      }
      showSummary(
        "Autofill complete",
        `${response.filled.length} fields filled. ${response.unknown.length} fields need manual review.`
      );
    });
  });
});

document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
