const defaultBlockedSites = ["facebook.com", "youtube.com", "reddit.com"];
const defaultBreakInterval = 60; // Default to 60 minutes
let focusModeEnabled = false;
let breakTimer = null;
const defaultAllowedSites = ["google.com"];

// Function to check if URL is allowed
function isAllowed(url) {
    const hostname = new URL(url).hostname;
    return new Promise(resolve => {
        chrome.storage.sync.get('allowedSites', function (data) {
            const allowedSites = data.allowedSites || defaultAllowedSites;
            resolve(allowedSites.some(site => hostname.includes(site)));
        });
    });
}

// Function to enforce allowed sites mode
function enforceAllowedSitesMode(tabId, url) {
    if (!url || url === "chrome://newtab/") {
        // Allow new empty tabs to remain open
        return;
    }
    isAllowed(url).then(allowed => {
        if (!allowed) {
            chrome.tabs.query({}, function (tabs) {
                if (tabs.length === 1) {
                    chrome.tabs.update(tabId, { url: 'https://google.com' });
                } else {
                    chrome.tabs.remove(tabId);
                }
            });
        }
    });
}


chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        blockedSites: defaultBlockedSites,
        allowedSites: defaultAllowedSites,
        breakInterval: defaultBreakInterval,
        focusModeEnabled: false,
        mode: 'blocked',
        isBreakTime: false,
        breakDuration: 5,
        
    });
    setBreakReminderAlarm(defaultBreakInterval);
    console.log('Focus Mode extension installed');
    clearBadge()
});





chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.breakInterval) {
        setBreakReminderAlarm(changes.breakInterval.newValue);
        clearBadge();
        console.log('Break interval changed to', changes.breakInterval.newValue);
    }
    if (changes.scheduledFocusMode || changes.focusStartTime || changes.focusEndTime) {
        setFocusModeAlarms();
    }
    if (changes.mode) {
        mode = changes.mode.newValue;
    }
});

function setFocusModeAlarms() {
    chrome.alarms.clear("startFocusMode");
    chrome.alarms.clear("endFocusMode");

    chrome.storage.sync.get(["scheduledFocusMode", "focusStartTime", "focusEndTime"], (data) => {
        if (data.scheduledFocusMode) {
            const startTime = data.focusStartTime || "08:00";
            const endTime = data.focusEndTime || "17:00";

            const [startHour, startMinute] = startTime.split(":").map(Number);
            const [endHour, endMinute] = endTime.split(":").map(Number);

            const now = new Date();
            const startAlarm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute);
            const endAlarm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute);

            if (startAlarm < now) {
                startAlarm.setDate(startAlarm.getDate() + 1);
            }
            if (endAlarm < now) {
                endAlarm.setDate(endAlarm.getDate() + 1);
            }

            chrome.alarms.create("startFocusMode", { when: startAlarm.getTime(), periodInMinutes: 1440 });
            chrome.alarms.create("endFocusMode", { when: endAlarm.getTime(), periodInMinutes: 1440 });

            // Immediately enable focus mode if current time is within the range
            if (now >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute) && 
                now < new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute)) {
                chrome.storage.sync.set({ focusModeEnabled: true });
                focusModeEnabled = true;
                clearBadge();
                setBreakReminderAlarm(data.breakInterval || defaultBreakInterval);
            }
        }
    });
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    chrome.storage.sync.get(["blockedSites", "focusModeEnabled", "mode"], (data) => {
        const blockedSites = data.blockedSites || defaultBlockedSites;
        const focusModeEnabled = data.focusModeEnabled;
        const mode = data.mode || 'blocked';

        if (focusModeEnabled && changeInfo.url) {
            if (mode === 'blocked') {
                const url = new URL(changeInfo.url);
                if (blockedSites.some(site => url.hostname.includes(site))) {
                    chrome.tabs.remove(tabId);
                }
            } else if (mode === 'allowed') {
                enforceAllowedSitesMode(tabId, changeInfo.url);
            }
        }
    });
});

chrome.tabs.onCreated.addListener((tab) => {
    chrome.storage.sync.get("mode", (data) => {
        const mode = data.mode || 'blocked';
        if (mode === 'allowed') {
            enforceAllowedSitesMode(tab.id, tab.url);
        }
    });
});


chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "breakReminder") {
        console.log('Break reminder alarm triggered');
        updateBreakReminder(true);
    } else if (alarm.name === "startFocusMode") {
        chrome.storage.sync.set({ focusModeEnabled: true });
        focusModeEnabled = true;
        clearBadge();
        chrome.storage.sync.get("breakInterval", (data) => {
            setBreakReminderAlarm(data.breakInterval || defaultBreakInterval);
        });
    } else if (alarm.name === "endFocusMode") {
        chrome.storage.sync.set({ focusModeEnabled: false });
        focusModeEnabled = false;
        unblockSites();
        chrome.alarms.clear("breakReminder");
        clearBadge();
    }
});

function setBreakReminderAlarm(interval) {
    chrome.alarms.clear("breakReminder", () => {
        if (interval > 0) {
            chrome.alarms.create("breakReminder", { periodInMinutes: interval });
            console.log('Break reminder alarm set with interval:', interval);
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleFocusMode") {
        focusModeEnabled = message.enabled;
        chrome.storage.sync.set({ focusModeEnabled }, () => {
            if (!focusModeEnabled) {
                unblockSites();

                chrome.alarms.clear("breakReminder");
            } else {
                clearBadge()

                chrome.storage.sync.get("breakInterval", (data) => {
                    setBreakReminderAlarm(data.breakInterval || defaultBreakInterval);
                });
            }
            sendResponse({ success: true });
        });
        console.log('Focus mode toggled to', focusModeEnabled);
    } else if (message.action === "takeBreak") {
        focusModeEnabled = false;
        clearTimeout(breakTimer);
        chrome.storage.sync.get('breakDuration', (data) => {
            const duration = data.breakDuration || 5;
            breakTimer = setTimeout(() => {
                focusModeEnabled = true;
                chrome.storage.sync.set({ focusModeEnabled: true, isBreakTime: false });
            }, duration * 60 * 1000); // convert minutes to milliseconds
            chrome.storage.sync.set({ isBreakTime: true });
            sendResponse({ success: true });
            console.log('Break taken for', duration, 'minutes');
        });
    } else if (message.action === "updateBreakDuration") {
        const duration = message.duration;
        chrome.storage.sync.set({ breakDuration: duration });
        sendResponse({ success: true });
        console.log('Break duration updated to', duration, 'minutes');
    } else if (message.action === "updateSchedule") {
        setFocusModeAlarms();
        sendResponse({ success: true });
    }
});

function unblockSites() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            const url = new URL(tab.url);
            chrome.storage.sync.get("blockedSites", (data) => {
                const blockedSites = data.blockedSites || defaultBlockedSites;
                if (blockedSites.some(site => url.hostname.includes(site))) {
                    chrome.tabs.reload(tab.id);
                }
            });
        });
    });
}
function updateBadge(isBreakTime) {
  console.log('Updating badge, isBreakTime:', isBreakTime);
  const text = isBreakTime ? 'BREAK' : '';
  const color = isBreakTime ? '#FF0000' : '#0000FF'; // Red for break, blue for focus
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}
function updateBreakReminder(isBreakTime) {
    chrome.storage.sync.set({ isBreakTime });
    if (isBreakTime) {
    
        updateBadge(isBreakTime)
       
    } else {
        // Hide overlay
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
                const tab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const overlay = document.getElementById('breakReminderOverlay');
                        if (overlay) overlay.remove();
                    }
                });
            } else {
                console.error("No active tabs found.");
            }
        });
    }
}


function updateBadge(isBreakTime) {
  console.log('Updating badge, isBreakTime:', isBreakTime);
  const text = isBreakTime ? 'break' : '';
  const color = isBreakTime ? '#FF0000' : '#0000FF'; // Red for break, blue for focus
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

function clearBadge() {
  chrome.action.setBadgeText({ text: '' });
  console.log('Badge cleared');
}

function showNotification(isBreakTime) {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'mode',
            title: isBreakTime ? 'Current Mode: Break' : 'Current Mode: Focus',
            contexts: ['action']
        });
    });
}


setFocusModeAlarms();