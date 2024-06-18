document.addEventListener('DOMContentLoaded', () => {
  const focusToggle = document.getElementById('focusToggle');
  const status = document.getElementById('status');
  const breakReminder = document.getElementById('breakReminder');
  const focusTab = document.getElementById('focusTab');
  const optionsTab = document.getElementById('optionsTab');
  const authTab = document.getElementById('authTab');
  const focusContent = document.getElementById('focusContent');
  const optionsContent = document.getElementById('optionsContent');
  const authContent = document.getElementById('authContent');
  const blockedSiteInput = document.getElementById('blockedSiteInput');
  const addBlockedSiteButton = document.getElementById('addBlockedSiteButton');
  const blockedSitesList = document.getElementById('blockedSitesList');
  const saveButton = document.getElementById('saveButton');
  const createPasswordInput = document.getElementById('createPassword');
  const bestFoodInput = document.getElementById('bestFood');
  const savePasswordButton = document.getElementById('savePassword');
  const resetFoodInput = document.getElementById('resetFood');
  const resetPasswordButton = document.getElementById('resetPassword');
  const forgotPasswordLink = document.getElementById('forgotPassword');
  const goBack = document.getElementById('goBack');
  const toggleCreatePassword = document.getElementById('toggleCreatePassword');
  const breakIntervalInput = document.getElementById('breakInterval');
  const focusImg = document.getElementById('focusImg');
  const breakImg = document.getElementById('breakImg');
  const labelText = document.getElementById('labelText');

  // Load initial state
  chrome.storage.sync.get(['focusModeEnabled', 'isBreakTime', 'blockedSites', 'password', 'bestFood', 'breakInterval'], (data) => {
    focusToggle.checked = data.focusModeEnabled;
    breakIntervalInput.value = data.breakInterval !== undefined ? data.breakInterval : 2; // Default to 2 minutes
    if (data.password) {
      document.getElementById('passwordCreation').classList.add('hidden');
      forgotPasswordLink.classList.remove('hidden');
    }
    if (data.blockedSites) {
      data.blockedSites.forEach(site => addBlockedSiteToList(site));
    }
    updateStatus(data.focusModeEnabled, data.isBreakTime);
  });

  // Add event listener for the checkbox
  focusToggle.addEventListener('change', () => {
    if (focusToggle.checked) {
      chrome.storage.sync.set({ focusModeEnabled: true });
      updateStatus(true);
      chrome.runtime.sendMessage({ action: 'toggleFocusMode', enabled: true });
    } else {
      promptForPassword((success) => {
        if (success) {
          chrome.storage.sync.set({ focusModeEnabled: false });
          updateStatus(false);
          chrome.runtime.sendMessage({ action: 'toggleFocusMode', enabled: false });
        } else {
          focusToggle.checked = true;
        }
      });
    }
  });

  // Handle tab switching
  focusTab.addEventListener('click', () => {
    focusTab.classList.add('active');
    optionsTab.classList.remove('active');
    authTab.classList.remove('active');
    focusContent.classList.add('active');
    optionsContent.classList.remove('active');
    authContent.classList.remove('active');
  });

  optionsTab.addEventListener('click', () => {
    focusTab.classList.remove('active');
    optionsTab.classList.add('active');
    authTab.classList.remove('active');
    focusContent.classList.remove('active');
    optionsContent.classList.add('active');
    authContent.classList.remove('active');
  });

  authTab.addEventListener('click', () => {
    focusTab.classList.remove('active');
    optionsTab.classList.remove('active');
    authTab.classList.add('active');
    focusContent.classList.remove('active');
    optionsContent.classList.remove('active');
    authContent.classList.add('active');
  });

  // Add blocked site
  addBlockedSiteButton.addEventListener('click', () => {
    const site = blockedSiteInput.value.trim();
    if (site) {
      promptForPassword((success) => {
        if (success) {
          chrome.storage.sync.get('blockedSites', (data) => {
            const blockedSites = data.blockedSites || [];
            blockedSites.push(site);
            chrome.storage.sync.set({ blockedSites }, () => {
              addBlockedSiteToList(site);
              blockedSiteInput.value = '';
            });
          });
        }
      });
    }
  });

  // Remove blocked site
  blockedSitesList.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
      const site = event.target.dataset.site;
      promptForPassword((success) => {
        if (success) {
          chrome.storage.sync.get('blockedSites', (data) => {
            const blockedSites = data.blockedSites.filter(s => s !== site);
            chrome.storage.sync.set({ blockedSites }, () => {
              event.target.parentElement.remove();
            });
          });
        }
      });
    }
  });

  // Save password
  savePasswordButton.addEventListener('click', () => {
    const password = createPasswordInput.value;
    const bestFood = bestFoodInput.value;
    if (password && bestFood) {
      chrome.storage.sync.set({ password, bestFood }, () => {
        alert('Password saved');
        document.getElementById('passwordCreation').classList.add('hidden');
        forgotPasswordLink.classList.remove('hidden');
      });
    } else {
      alert('Please fill out all fields');
    }
  });

  // Reset password
  resetPasswordButton.addEventListener('click', () => {
    const resetFood = resetFoodInput.value;
    chrome.storage.sync.get('bestFood', (data) => {
      if (resetFood === data.bestFood) {
        document.getElementById('passwordCreation').classList.remove('hidden');
        document.getElementById('passwordReset').classList.add('hidden');
        chrome.storage.sync.remove('password');
      } else {
        alert('Incorrect best food');
      }
    });
  });

  // Forgot password link
  forgotPasswordLink.addEventListener('click', () => {
    document.getElementById('passwordCreation').classList.add('hidden');
    document.getElementById('passwordReset').classList.remove('hidden');
    forgotPasswordLink.classList.add('hidden');
    goBack.classList.remove('hidden');
  });
  // Forgot password link
  goBack.addEventListener('click', () => {
    forgotPasswordLink.classList.remove('hidden');
    goBack.classList.add('hidden');
    document.getElementById('passwordReset').classList.add('hidden');
  });

  // Toggle password visibility
  toggleCreatePassword.addEventListener('change', () => {
    if (toggleCreatePassword.checked) {
      createPasswordInput.type = 'text';
    } else {
      createPasswordInput.type = 'password';
    }
  });

  // Save button handler
  saveButton.addEventListener('click', () => {
    const breakInterval = parseInt(breakIntervalInput.value, 10);
    chrome.storage.sync.set({ breakInterval }, () => {
      alert('Break interval saved');
    });
  });

  function updateStatus(isFocused, isBreakTime) {
    if (isFocused) {
      status.textContent = 'Focus mode is enabled.';
      labelText.textContent = 'Disable'
      breakReminder.style.display = isBreakTime ? 'block' : 'none';
      focusImg.style.display = 'block';
      breakImg.style.display = 'none';
    } else {
      status.textContent = 'Focus mode is disabled.';
      breakReminder.style.display = 'none';
      breakImg.style.display = 'block';
      focusImg.style.display = 'none';
      labelText.textContent = 'Enable'
    }
  }

  function addBlockedSiteToList(site) {
    const li = document.createElement('li');
    li.textContent = site;
    const button = document.createElement('button');
    button.textContent = 'delete';
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
        const enteredPassword = window.prompt('Enter your password:');
        if (enteredPassword === null) {
          callback(false); // Prompt was cancelled
        } else {
            chrome.storage.sync.get('password', (data) => {
                if (data.password === enteredPassword) {
                    successCallback(data.password === enteredPassword);
                } else {
                    alert('Incorrect password!');
                    callback(false);
                }
            });
        }
    }

  const imagesArray = [
    { type: 'focusImg', src: './icons/focus.png' },
    { type: 'focusImg', src: './icons/dart.png' },
    { type: 'focusImg', src: './icons/target.png' },
    { type: 'breakImg', src: './icons/break.png' },
    { type: 'breakImg', src: './icons/coffee.png' },
    { type: 'breakImg', src: './icons/relax-2.png' },
    { type: 'breakImg', src: './icons/relax.png' },
    { type: 'breakImg', src: './icons/sunbed.png' },
  ];
  function getRandomImage(images, type) {
    const filteredImages = images.filter(image => image.type === type);
    const randomIndex = Math.floor(Math.random() * filteredImages.length);
    return filteredImages[randomIndex];
  }
  function setRandomImages() {
    const focusImgElement = document.getElementById('focusImg');
    const breakImgElement = document.getElementById('breakImg');

    const randomFocusImage = getRandomImage(imagesArray, 'focusImg');
    const randomBreakImage = getRandomImage(imagesArray, 'breakImg');

    if (randomFocusImage) {
      focusImgElement.src = randomFocusImage.src;
    }

    if (randomBreakImage) {
      breakImgElement.src = randomBreakImage.src;
    }
  }
  setRandomImages()
});
