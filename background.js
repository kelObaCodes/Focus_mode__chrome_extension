const defaultBlockedSites = ["facebook.com", "youtube.com", "reddit.com"];
const defaultBreakInterval = 60; // Default to 60 minutes
let focusModeEnabled = false;
let breakTimer = null;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        blockedSites: defaultBlockedSites,
        breakInterval: defaultBreakInterval,
        focusModeEnabled: false,
        isBreakTime: false,
        breakDuration: 5
    });
    setBreakReminderAlarm(defaultBreakInterval);
    console.log('Focus Mode extension installed');
    clearBadge()
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.breakInterval) {
        setBreakReminderAlarm(changes.breakInterval.newValue);
        clearBadge()
        console.log('Break interval changed to', changes.breakInterval.newValue);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.storage.sync.get(["blockedSites", "focusModeEnabled"], (data) => {
            const blockedSites = data.blockedSites || defaultBlockedSites;
            const focusModeEnabled = data.focusModeEnabled;

            if (focusModeEnabled) {
                const url = new URL(changeInfo.url);
                if (blockedSites.some(site => url.hostname.includes(site))) {
                    chrome.tabs.remove(tabId);
                }
            }
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "breakReminder") {
        console.log('Break reminder alarm triggered');
        updateBreakReminder(true);
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
        openPopup();
       
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
function openPopup() {
    const options = {
        type: 'basic',
        title: 'Break Time!',
        iconUrl:'icons/active.png',
        message:'Take a break!'
    };
    chrome.notifications.create(options, 
         function(notificationId) {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
            } else {
              console.log('Notification created with ID:', notificationId);
            }
          });  
}