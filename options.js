document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["blockedSites", "breakInterval"], (data) => {
      document.getElementById("blockedSites").value = data.blockedSites ? data.blockedSites.join(", ") : "";
      document.getElementById("breakInterval").value = data.breakInterval !== undefined ? data.breakInterval : 2; // Default to 2 minutes
  });

  document.getElementById("saveButton").addEventListener("click", () => {
      const blockedSites = document.getElementById("blockedSites").value.split(",").map(site => site.trim());
      const breakInterval = parseInt(document.getElementById("breakInterval").value, 10);

      chrome.storage.sync.set({ blockedSites, breakInterval }, () => {
          alert("Options saved!");
      });
  });
});
