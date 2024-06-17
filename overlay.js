(function() {
    const existingOverlay = document.getElementById('breakReminderOverlay');
    if (existingOverlay) return;
  
    const overlay = document.createElement('div');
    overlay.id = 'breakReminderOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.fontSize = '2em';
    overlay.style.zIndex = '9999';
    overlay.innerText = 'Time to take a break will ya!';
    overlay.innerText = 'Click me to cancel';
    overlay.addEventListener('click', () => {
        overlay.remove();
        chrome.runtime.sendMessage({ action: 'updateBreakReminder', isBreakTime: false });
      });
    document.body.appendChild(overlay);
  })();
  