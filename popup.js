document.addEventListener("DOMContentLoaded", () => {
    const focusToggle = document.getElementById("focusToggle");
    const status = document.getElementById("status");
    const breakReminder = document.getElementById("breakReminder");
    const focusTab = document.getElementById("focusTab");
    const optionsTab = document.getElementById("optionsTab");
    const authTab = document.getElementById("authTab");
    const focusContent = document.getElementById("focusContent");
    const optionsContent = document.getElementById("optionsContent");
    const authContent = document.getElementById("authContent");
    const blockedSiteInput = document.getElementById("blockedSiteInput");
    const addBlockedSiteButton = document.getElementById(
        "addBlockedSiteButton"
    );
    const blockedSitesList = document.getElementById("blockedSitesList");
    const allowedSiteInput = document.getElementById("allowedSiteInput");
    const addAllowedSiteButton = document.getElementById(
        "addAllowedSiteButton"
    );
    const allowedSitesList = document.getElementById("allowedSitesList");
    const saveButton = document.getElementById("saveButton");
    const createPasswordInput = document.getElementById("createPassword");
    const bestFoodInput = document.getElementById("bestFood");
    const savePasswordButton = document.getElementById("savePassword");
    const resetFoodInput = document.getElementById("resetFood");
    const resetPasswordButton = document.getElementById("resetPassword");
    const forgotPasswordLink = document.getElementById("forgotPassword");
    const goBack = document.getElementById("goBack");
    const toggleCreatePassword = document.getElementById(
        "toggleCreatePassword"
    );
    const breakIntervalInput = document.getElementById("breakInterval");
    const focusImg = document.getElementById("focusImg");
    const breakImg = document.getElementById("breakImg");
    const labelText = document.getElementById("labelText");

    // Scheduled Focus Mode elements
    const scheduledFocusModeToggle = document.getElementById(
        "scheduledFocusModeToggle"
    );
    const scheduledTimes = document.getElementById("scheduledTimes");
    const startTimeInput = document.getElementById("startTime");
    const endTimeInput = document.getElementById("endTime");
    const saveScheduleButton = document.getElementById("saveScheduleButton");

    const blockedSitesMode = document.getElementById('blockedSitesMode');
    const allowedSitesMode = document.getElementById('allowedSitesMode');

    // Load initial state
    chrome.storage.sync.get(
        [
            "focusModeEnabled",
            "isBreakTime",
            "blockedSites",
            "allowedSites",
            "password",
            "bestFood",
            "breakInterval",
            "scheduledFocusMode",
            "focusStartTime",
            "focusEndTime",
        ],
        (data) => {
            focusToggle.checked = data.focusModeEnabled;
            breakIntervalInput.value =
                data.breakInterval !== undefined ? data.breakInterval : 2; // Default to 2 minutes
            if (data.password) {
                document
                    .getElementById("passwordCreation")
                    .classList.add("hidden");
                forgotPasswordLink.classList.remove("hidden");
            }
            if (data.blockedSites) {
                data.blockedSites.forEach((site) => addBlockedSiteToList(site));
            }
            if (data.allowedSites) {
                data.allowedSites.forEach((site) => addAllowedSiteToList(site));
            }
            updateStatus(data.focusModeEnabled, data.isBreakTime);
            scheduledFocusModeToggle.checked = data.scheduledFocusMode || false;
            if (scheduledFocusModeToggle.checked) {
                scheduledTimes.style.display = "block";
                startTimeInput.value = data.focusStartTime || "08:00";
                endTimeInput.value = data.focusEndTime || "17:00";
            } else {
                scheduledTimes.style.display = "none";
                
            }
        }
    );
    scheduledFocusModeToggle.addEventListener("change", () => {
        const isChecked = scheduledFocusModeToggle.checked;
        scheduledTimes.style.display = isChecked ? "block" : "none";
        chrome.storage.sync.set({ scheduledFocusMode: isChecked });
    });

    saveScheduleButton.addEventListener("click", () => {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        promptForPassword((success) => {
            if (success) {
                chrome.storage.sync.set(
                    { focusStartTime: startTime, focusEndTime: endTime },
                    () => {
                        chrome.runtime.sendMessage({
                            action: "updateSchedule",
                        });
                        alert("Schedule saved!");
                    }
                );
            }
        });
    });

    // Add event listener for the checkbox
    focusToggle.addEventListener("change", () => {
        if (focusToggle.checked) {
            chrome.storage.sync.set({ focusModeEnabled: true });
            updateStatus(true);
            chrome.runtime.sendMessage({
                action: "toggleFocusMode",
                enabled: true,
            });
        } else {
            promptForPassword((success) => {
                if (success) {
                    chrome.storage.sync.set({ focusModeEnabled: false });
                    updateStatus(false);
                    chrome.runtime.sendMessage({
                        action: "toggleFocusMode",
                        enabled: false,
                    });
                } else {
                    focusToggle.checked = true;
                }
            });
        }
    });

    focusTab.addEventListener("click", () => {
        showContent(focusContent, focusTab);
    });
    optionsTab.addEventListener("click", () => {
        showContent(optionsContent, optionsTab);
    });
    authTab.addEventListener("click", () => {
        showContent(authContent, authTab);
    });

    function showContent(content, tab) {
        focusContent.style.display = "none";
        optionsContent.style.display = "none";
        authContent.style.display = "none";

        authTab.classList.remove("active");
        focusTab.classList.remove("active");
        optionsTab.classList.remove("active");
        tab.classList.add("active");
        content.style.display = "block";
    }

  // Function to add allowed site
  function addAllowedSite() {
    const site = allowedSiteInput.value.trim();
    if (site) {
        chrome.storage.sync.get('allowedSites', function (data) {
            const allowedSites = data.allowedSites || [];
            if (!allowedSites.includes(site)) {
                allowedSites.push(site);
                chrome.storage.sync.set({ allowedSites }, function () {
                    allowedSiteInput.value = '';
                    renderAllowedSites(allowedSites);
                });
            }
        });
    }
}


    // Function to render allowed sites
    function renderAllowedSites(sites) {
      allowedSitesList.innerHTML = '';
      sites.forEach(site => {
          const li = document.createElement('li');
          li.textContent = site;
          const removeButton = document.createElement('button');
          removeButton.textContent = 'delete';
          removeButton.addEventListener('click', function () {
              removeAllowedSite(site);
          });
          li.appendChild(removeButton);
          allowedSitesList.appendChild(li);
      });
  }

   // Function to remove allowed site
   function removeAllowedSite(site) {
    chrome.storage.sync.get('allowedSites', function (data) {
        let allowedSites = data.allowedSites || [];
        allowedSites = allowedSites.filter(s => s !== site);
        chrome.storage.sync.set({ allowedSites }, function () {
            renderAllowedSites(allowedSites);
        });
    });
}

    // Event listener for adding allowed site
    addAllowedSiteButton.addEventListener('click', addAllowedSite);


      // Render allowed sites on load
      chrome.storage.sync.get('allowedSites', function (data) {
        const allowedSites = data.allowedSites || ['google.com'];
        chrome.storage.sync.set({ allowedSites }); // Ensure default is set
        renderAllowedSites(allowedSites);
    });

    // Event listeners for mode toggle
    blockedSitesMode.addEventListener('change', function () {
        if (blockedSitesMode.checked) {
            chrome.storage.sync.set({ mode: 'blocked' });
        }
    });

    allowedSitesMode.addEventListener('change', function () {
        if (allowedSitesMode.checked) {
            chrome.storage.sync.set({ mode: 'allowed' });
        }
    });

    // Load mode on startup
    chrome.storage.sync.get('mode', function (data) {
        if (data.mode === 'allowed') {
            allowedSitesMode.checked = true;
        } else {
            blockedSitesMode.checked = true;
        }
    });

    // Add blocked site
    addBlockedSiteButton.addEventListener("click", () => {
        const site = blockedSiteInput.value.trim();
        if (site) {
            promptForPassword((success) => {
                if (success) {
                    chrome.storage.sync.get("blockedSites", (data) => {
                        const blockedSites = data.blockedSites || [];
                        blockedSites.push(site);
                        chrome.storage.sync.set({ blockedSites }, () => {
                            addBlockedSiteToList(site);
                            blockedSiteInput.value = "";
                        });
                    });
                }
            });
        }
    });

    // Add allowed site
    addAllowedSiteButton.addEventListener("click", () => {
        promptForPassword((success) => {
            if (success) {
                const site = allowedSiteInput.value.trim();
                if (site) {
                    chrome.storage.sync.get("allowedSites", (data) => {
                        const allowedSites = data.allowedSites || [];
                        if (!allowedSites.includes(site)) {
                            allowedSites.push(site);
                            chrome.storage.sync.set({ allowedSites });
                            addAllowedSiteToList(site);
                            allowedSiteInput.value = "";
                        }
                    });
                }
            }
        });
    });

    // Remove blocked site
    blockedSitesList.addEventListener("click", (event) => {
        if (event.target.tagName === "BUTTON") {
            const site = event.target.dataset.site;
            promptForPassword((success) => {
                if (success) {
                    chrome.storage.sync.get("blockedSites", (data) => {
                        const blockedSites = data.blockedSites.filter(
                            (s) => s !== site
                        );
                        chrome.storage.sync.set({ blockedSites }, () => {
                            event.target.parentElement.remove();
                        });
                    });
                }
            });
        }
    });

    function addAllowedSiteToList(site) {
        const li = document.createElement("li");
        li.textContent = site;
        const removeButton = document.createElement("button");
        removeButton.textContent = "delete";
        removeButton.addEventListener("click", () => {
            promptForPassword((success) => {
                if (success) {
                    chrome.storage.sync.get("allowedSites", (data) => {
                        const allowedSites = data.allowedSites.filter(
                            (s) => s !== site
                        );
                        chrome.storage.sync.set({ allowedSites });
                        li.remove();
                    });
                }
            });
        });
        li.appendChild(removeButton);
        allowedSitesList.appendChild(li);
    }

    // Save password
    savePasswordButton.addEventListener("click", () => {
        const password = createPasswordInput.value;
        const bestFood = bestFoodInput.value;
        if (password && bestFood) {
            chrome.storage.sync.set({ password, bestFood }, () => {
                alert("Password saved");
                document
                    .getElementById("passwordCreation")
                    .classList.add("hidden");
                forgotPasswordLink.classList.remove("hidden");
            });
        } else {
            alert("Please fill out all fields");
        }
    });

    // Reset password
    resetPasswordButton.addEventListener("click", () => {
        const resetFood = resetFoodInput.value;
        chrome.storage.sync.get("bestFood", (data) => {
            if (resetFood === data.bestFood) {
                document
                    .getElementById("passwordCreation")
                    .classList.remove("hidden");
                document
                    .getElementById("passwordReset")
                    .classList.add("hidden");
                chrome.storage.sync.remove("password");
            } else {
                alert("Incorrect best food");
            }
        });
    });

    // Forgot password link
    forgotPasswordLink.addEventListener("click", () => {
        document.getElementById("passwordCreation").classList.add("hidden");
        document.getElementById("passwordReset").classList.remove("hidden");
        forgotPasswordLink.classList.add("hidden");
        goBack.classList.remove("hidden");
    });
    // Forgot password link
    goBack.addEventListener("click", () => {
        forgotPasswordLink.classList.remove("hidden");
        goBack.classList.add("hidden");
        document.getElementById("passwordReset").classList.add("hidden");
    });

    // Toggle password visibility
    toggleCreatePassword.addEventListener("change", () => {
        if (toggleCreatePassword.checked) {
            createPasswordInput.type = "text";
        } else {
            createPasswordInput.type = "password";
        }
    });

    // Save button handler
    saveButton.addEventListener("click", () => {
        const breakInterval = parseInt(breakIntervalInput.value, 10);
        chrome.storage.sync.set({ breakInterval }, () => {
            alert("Break interval saved");
        });
    });

    function updateStatus(isFocused, isBreakTime) {
        if (isFocused) {
            status.textContent = "Focus mode is enabled.";
            labelText.textContent = "Disable";
            breakReminder.style.display = isBreakTime ? "block" : "none";
            focusImg.style.display = "block";
            breakImg.style.display = "none";
        } else {
            status.textContent = "Focus mode is disabled.";
            breakReminder.style.display = "none";
            breakImg.style.display = "block";
            focusImg.style.display = "none";
            labelText.textContent = "Enable";
        }
    }

    function addBlockedSiteToList(site) {
        const li = document.createElement("li");
        li.textContent = site;
        const button = document.createElement("button");
        button.textContent = "delete";
        button.dataset.site = site;
        li.appendChild(button);

        // Prepend the new list item to the start of the blockedSitesList
        if (blockedSitesList.firstChild) {
            blockedSitesList.insertBefore(li, blockedSitesList.firstChild);
        } else {
            blockedSitesList.appendChild(li);
        }
    }
    function promptForPassword(successCallback) {
        const enteredPassword = window.prompt("Enter your password:");
        if (enteredPassword === null) {
            successCallback(false); // Prompt was cancelled
        } else {
            chrome.storage.sync.get("password", (data) => {
                if (data.password === enteredPassword) {
                    successCallback(data.password === enteredPassword);
                } else {
                    alert("Incorrect password!");
                    successCallback(false);
                }
            });
        }
    }

    const imagesArray = [
        { type: "focusImg", src: "./icons/focus.png" },
        { type: "focusImg", src: "./icons/dart.png" },
        { type: "focusImg", src: "./icons/target.png" },
        { type: "focusImg", src: "./icons/panda.png" },
        { type: "breakImg", src: "./icons/break.png" },
        { type: "breakImg", src: "./icons/coffee.png" },
        { type: "breakImg", src: "./icons/relax-2.png" },
        { type: "breakImg", src: "./icons/relax.png" },
        { type: "breakImg", src: "./icons/beach.png" },
        { type: "breakImg", src: "./icons/cocoa.png" },
        { type: "breakImg", src: "./icons/tea-time.png" },
    ];
    function getRandomImage(images, type) {
        const filteredImages = images.filter((image) => image.type === type);
        const randomIndex = Math.floor(Math.random() * filteredImages.length);
        return filteredImages[randomIndex];
    }
    function setRandomImages() {
        const focusImgElement = document.getElementById("focusImg");
        const breakImgElement = document.getElementById("breakImg");

        const randomFocusImage = getRandomImage(imagesArray, "focusImg");
        const randomBreakImage = getRandomImage(imagesArray, "breakImg");

        if (randomFocusImage) {
            focusImgElement.src = randomFocusImage.src;
        }

        if (randomBreakImage) {
            breakImgElement.src = randomBreakImage.src;
        }
    }
    setRandomImages();

    const themeToggle = document.getElementById("themeToggle");

    // Load the saved theme from chrome.storage.sync
    chrome.storage.sync.get("theme", (data) => {
        if (data.theme === "white-theme") {
            document.body.classList.add("white-theme");
        } else {
            document.body.classList.remove("white-theme");
        }
    });

    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("white-theme");

        // Save the current theme to chrome.storage.sync
        const theme = document.body.classList.contains("white-theme") ? "white-theme" : "default";
        chrome.storage.sync.set({ theme });
    });
});
