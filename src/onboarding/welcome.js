/* Neurai Sign — Onboarding Wizard */
/* global NEURAI_CONSTANTS, NEURAI_UTILS, NeuraiKey, NeuraiSignESP32, chrome */

(function () {
  'use strict';

  var C = NEURAI_CONSTANTS;

  // ── URL params (new-account mode) ──────────────────────────────────────────

  var params = new URLSearchParams(window.location.search);
  var isNewAccount = params.get('mode') === 'new-account';
  var targetAccountId = params.get('id') || '1';

  // ── DOM refs ───────────────────────────────────────────────────────────────

  var el = {
    progressBar: document.getElementById('progressBar'),
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3'),
    step4Import: document.getElementById('step4Import'),
    step4Generate: document.getElementById('step4Generate'),
    step4Hardware: document.getElementById('step4Hardware'),
    step4Backup: document.getElementById('step4Backup'),
    step5: document.getElementById('step5'),
    // Step 1
    welcomeTitle: document.getElementById('welcomeTitle'),
    welcomeSubtitle: document.getElementById('welcomeSubtitle'),
    welcomeFeatures: document.getElementById('welcomeFeatures'),
    getStartedBtn: document.getElementById('getStartedBtn'),
    // Step 2
    pinInput: document.getElementById('pinInput'),
    pinConfirmInput: document.getElementById('pinConfirmInput'),
    pinError: document.getElementById('pinError'),
    pinBackBtn: document.getElementById('pinBackBtn'),
    pinNextBtn: document.getElementById('pinNextBtn'),
    togglePinVisibility: document.getElementById('togglePinVisibility'),
    // Step 3
    methodImport: document.getElementById('methodImport'),
    methodGenerate: document.getElementById('methodGenerate'),
    methodHardware: document.getElementById('methodHardware'),
    // Step 4a - Import
    importNetwork: document.getElementById('importNetwork'),
    importSeed: document.getElementById('importSeed'),
    importPassphrase: document.getElementById('importPassphrase'),
    importError: document.getElementById('importError'),
    importBackBtn: document.getElementById('importBackBtn'),
    importConfirmBtn: document.getElementById('importConfirmBtn'),
    toggleImportPassphrase: document.getElementById('toggleImportPassphrase'),
    // Step 4b - Generate
    generateNetwork: document.getElementById('generateNetwork'),
    generateWordCount: document.getElementById('generateWordCount'),
    generatePassphrase: document.getElementById('generatePassphrase'),
    generateError: document.getElementById('generateError'),
    generateBackBtn: document.getElementById('generateBackBtn'),
    generateConfirmBtn: document.getElementById('generateConfirmBtn'),
    toggleGeneratePassphrase: document.getElementById('toggleGeneratePassphrase'),
    // Step 4c - Hardware
    hardwareNetwork: document.getElementById('hardwareNetwork'),
    hardwareError: document.getElementById('hardwareError'),
    hardwareBackBtn: document.getElementById('hardwareBackBtn'),
    hardwareConnectBtn: document.getElementById('hardwareConnectBtn'),
    // Step 4d - Backup
    mnemonicGrid: document.getElementById('mnemonicGrid'),
    backupPassphraseRow: document.getElementById('backupPassphraseRow'),
    backupPassphraseText: document.getElementById('backupPassphraseText'),
    backupConfirmCheck: document.getElementById('backupConfirmCheck'),
    backupCopyBtn: document.getElementById('backupCopyBtn'),
    backupNextBtn: document.getElementById('backupNextBtn'),
    // Step 5
    successTitle: document.getElementById('successTitle'),
    successSubtitle: document.getElementById('successSubtitle'),
    successAddress: document.getElementById('successAddress'),
    finishBtn: document.getElementById('finishBtn'),
    // Global
    toast: document.getElementById('toast'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText')
  };

  // ── State ──────────────────────────────────────────────────────────────────

  var currentStep = 1;
  var pin = '';
  var existingPinHash = '';
  var existingAccounts = null;
  var existingSettings = null;
  var method = ''; // 'import' | 'generate' | 'hardware'
  var generatedMnemonic = '';
  var walletResult = null;
  var canReuseSessionPin = false;

  // ── Step navigation ────────────────────────────────────────────────────────

  var allStepCards = [
    el.step1, el.step2, el.step3,
    el.step4Import, el.step4Generate, el.step4Hardware, el.step4Backup,
    el.step5
  ].filter(Boolean);

  function getStepCard(stepNum) {
    switch (stepNum) {
      case 1: return el.step1;
      case 2: return el.step2;
      case 3: return el.step3;
      case 4:
        if (method === 'import') return el.step4Import;
        if (method === 'generate') return el.step4Generate;
        if (method === 'hardware') return el.step4Hardware;
        return el.step4Import;
      case 45: return el.step4Backup;
      case 5: return el.step5;
      default: return el.step1;
    }
  }

  function goToStep(stepNum) {
    allStepCards.forEach(function (c) { c.classList.add('hidden'); });
    var card = getStepCard(stepNum);
    if (!card) return;
    card.classList.remove('hidden');
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = '';
    currentStep = stepNum;
    updateProgressBar(stepNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgressBar(stepNum) {
    var displayStep = stepNum === 45 ? 4 : stepNum;
    // In new-account mode steps are shifted: no PIN step
    // Visual progress: 1=welcome, 2=PIN(or skip), 3=method, 4=form, 5=success
    var dots = el.progressBar.querySelectorAll('.progress-dot');
    var lines = el.progressBar.querySelectorAll('.progress-line');

    dots.forEach(function (dot, i) {
      var num = i + 1;
      dot.classList.remove('active', 'done');
      if (num < displayStep) dot.classList.add('done');
      else if (num === displayStep) dot.classList.add('active');
    });

    lines.forEach(function (line, i) {
      line.classList.toggle('done', (i + 1) < displayStep);
    });
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  var toastTimer = null;
  function showToast(msg, type) {
    clearTimeout(toastTimer);
    el.toast.textContent = msg;
    el.toast.className = 'toast toast-' + (type || 'success') + ' visible';
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('visible');
    }, 3000);
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  function showLoading(msg) {
    el.loadingText.textContent = msg || 'Loading...';
    el.loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    el.loadingOverlay.classList.add('hidden');
  }

  // ── Toggle password visibility ─────────────────────────────────────────────

  function setupToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }

  // ── PIN validation (step 2 — only for fresh install) ───────────────────────

  async function handlePinNext() {
    var p = el.pinInput.value;
    var pc = el.pinConfirmInput.value;

    if (p.length < 4 || p.length > 20) {
      el.pinError.textContent = 'PIN must be between 4 and 20 characters.';
      return;
    }
    if (p !== pc) {
      el.pinError.textContent = 'PINs do not match.';
      return;
    }

    el.pinError.textContent = '';
    pin = p;
    goToStep(3);
  }

  // ── PIN verification (new-account mode: verify existing PIN) ───────────────

  async function handlePinVerify() {
    var p = el.pinInput.value;
    if (!p) {
      el.pinError.textContent = 'Enter your current PIN.';
      return;
    }

    var hash = await NEURAI_UTILS.hashText(p);
    if (hash !== existingPinHash) {
      el.pinError.textContent = 'Incorrect PIN.';
      return;
    }

    el.pinError.textContent = '';
    pin = p;
    goToStep(3);
  }

  // ── Import wallet ──────────────────────────────────────────────────────────

  async function handleImportConfirm() {
    var seedRaw = el.importSeed.value.trim().replace(/\s+/g, ' ');
    var words = seedRaw.split(' ');
    if (words.length !== 12 && words.length !== 24) {
      el.importError.textContent = 'Please enter a valid 12 or 24-word seed phrase.';
      return;
    }

    el.importError.textContent = '';
    showLoading('Deriving wallet address...');

    try {
      var network = el.importNetwork.value;
      var passphrase = el.importPassphrase.value || null;
      var derived = NeuraiKey.getAddressPair(network, seedRaw, 0, 0, passphrase || undefined);
      var addressData = derived.external;

      walletResult = {
        address: addressData.address,
        publicKey: addressData.publicKey,
        privateKey: addressData.WIF,
        mnemonic: seedRaw,
        passphrase: passphrase,
        network: network,
        walletType: 'software'
      };

      await saveWallet();
      hideLoading();
      goToStep(5);
      el.successAddress.textContent = walletResult.address;
    } catch (err) {
      hideLoading();
      el.importError.textContent = 'Import failed: ' + err.message;
    }
  }

  // ── Generate wallet ────────────────────────────────────────────────────────

  async function handleGenerateConfirm() {
    el.generateError.textContent = '';
    showLoading('Generating wallet...');

    try {
      var network = el.generateNetwork.value;
      var strength = el.generateWordCount.value === '24' ? 256 : 128;
      var passphrase = el.generatePassphrase.value || null;

      generatedMnemonic = NeuraiKey.generateMnemonic(strength);
      var derived = NeuraiKey.getAddressPair(network, generatedMnemonic, 0, 0, passphrase || undefined);
      var addressData = derived.external;

      walletResult = {
        address: addressData.address,
        publicKey: addressData.publicKey,
        privateKey: addressData.WIF,
        mnemonic: generatedMnemonic,
        passphrase: passphrase,
        network: network,
        walletType: 'software'
      };

      hideLoading();
      showMnemonicBackup(generatedMnemonic, passphrase);
    } catch (err) {
      hideLoading();
      el.generateError.textContent = 'Generation failed: ' + err.message;
    }
  }

  function showMnemonicBackup(mnemonic, passphrase) {
    var words = mnemonic.split(' ');
    el.mnemonicGrid.innerHTML = words.map(function (word, i) {
      return '<span class="mnemonic-word"><span class="mnemonic-num">' + (i + 1) + '</span>' + word + '</span>';
    }).join('');

    if (passphrase) {
      el.backupPassphraseRow.classList.remove('hidden');
      el.backupPassphraseText.textContent = passphrase;
    } else {
      el.backupPassphraseRow.classList.add('hidden');
    }

    el.backupConfirmCheck.checked = false;
    el.backupNextBtn.disabled = true;
    goToStep(45);
  }

  async function handleBackupNext() {
    showLoading('Saving wallet...');
    try {
      await saveWallet();
      hideLoading();
      goToStep(5);
      el.successAddress.textContent = walletResult.address;
    } catch (err) {
      hideLoading();
      showToast('Save failed: ' + err.message, 'error');
    }
  }

  // ── Hardware wallet ────────────────────────────────────────────────────────

  async function handleHardwareConnect() {
    el.hardwareError.textContent = '';
    showLoading('Connecting to hardware wallet...');

    try {
      var device = new NeuraiSignESP32.NeuraiESP32({ filters: [] });
      await device.connect();

      showLoading('Reading device info...');
      var info = await device.getInfo();
      var addrResp = await device.getAddress();

      var network = el.hardwareNetwork.value;
      var expectedNetwork = network === 'xna-test' ? 'NeuraiTest' : 'Neurai';
      if (info.network && info.network !== expectedNetwork) {
        await device.disconnect();
        hideLoading();
        el.hardwareError.textContent =
          'Device is configured for ' + info.network + ' but you selected ' + expectedNetwork + '.';
        return;
      }

      walletResult = {
        address: addrResp.address,
        publicKey: addrResp.pubkey,
        privateKey: null,
        mnemonic: null,
        passphrase: null,
        network: network,
        walletType: 'hardware',
        hardwareDeviceName: info.device || 'NeuraiHW',
        hardwareDeviceNetwork: info.network || null,
        hardwareFirmwareVersion: info.version || null,
        hardwareDerivationPath: addrResp.path || null,
        hardwareMasterFingerprint: info.master_fingerprint || null
      };

      try { await device.disconnect(); } catch (_) { }

      showLoading('Saving wallet...');
      await saveWallet();
      hideLoading();
      goToStep(5);
      el.successAddress.textContent = walletResult.address;
    } catch (err) {
      hideLoading();
      if (err && (err.name === 'NotFoundError' || String(err.message || '').includes('No port selected'))) {
        el.hardwareError.textContent = 'No device selected. Please try again.';
      } else {
        el.hardwareError.textContent = 'Connection failed: ' + err.message;
      }
    }
  }

  // ── Save wallet to chrome.storage ──────────────────────────────────────────

  async function saveWallet() {
    var accounts;
    var settings;
    var pinHash;

    if (isNewAccount && existingAccounts && existingSettings) {
      // Add to existing accounts
      accounts = {};
      for (var j = 1; j <= C.MAX_ACCOUNTS; j++) {
        var jid = String(j);
        accounts[jid] = existingAccounts[jid] || null;
      }
      settings = existingSettings;
      pinHash = existingPinHash;
    } else {
      // Fresh install
      pinHash = await NEURAI_UTILS.hashText(pin);
      settings = { ...C.DEFAULT_SETTINGS, pinHash: pinHash };
      accounts = {};
      for (var i = 1; i <= C.MAX_ACCOUNTS; i++) accounts[String(i)] = null;
    }

    var account = {
      privateKey: null,
      privateKeyEnc: null,
      mnemonic: null,
      mnemonicEnc: null,
      passphrase: null,
      passphraseEnc: null,
      address: walletResult.address,
      publicKey: walletResult.publicKey,
      walletType: walletResult.walletType,
      hardwareDeviceName: walletResult.hardwareDeviceName || null,
      hardwareDeviceNetwork: walletResult.hardwareDeviceNetwork || null,
      hardwareFirmwareVersion: walletResult.hardwareFirmwareVersion || null,
      hardwareDerivationPath: walletResult.hardwareDerivationPath || null,
      hardwareMasterFingerprint: walletResult.hardwareMasterFingerprint || null,
      network: walletResult.network,
      history: []
    };

    // Encrypt secrets with PIN
    if (walletResult.privateKey && pin) {
      account.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(walletResult.privateKey, pin);
    }
    if (walletResult.mnemonic && pin) {
      account.mnemonicEnc = await NEURAI_UTILS.encryptTextWithPin(walletResult.mnemonic, pin);
    }
    if (walletResult.passphrase && pin) {
      account.passphraseEnc = await NEURAI_UTILS.encryptTextWithPin(walletResult.passphrase, pin);
    }

    accounts[targetAccountId] = account;

    var lockTimeout = ((settings.lockTimeoutMinutes || 10) * 60 * 1000);
    var unlockUntil = Date.now() + lockTimeout;

    await new Promise(function (resolve) {
      chrome.storage.local.set({
        [C.ACCOUNTS_KEY]: accounts,
        [C.ACTIVE_ACCOUNT_KEY]: targetAccountId,
        [C.STORAGE_KEY]: account,
        [C.SETTINGS_KEY]: settings,
        [C.UNLOCK_UNTIL_KEY]: unlockUntil
      }, resolve);
    });

    try {
      chrome.runtime.sendMessage({ type: C.MSG.WALLET_UPDATED });
      chrome.runtime.sendMessage({ type: C.MSG.SETTINGS_UPDATED });
    } catch (_) { }
  }

  // ── Finish ─────────────────────────────────────────────────────────────────

  function handleFinish() {
    window.close();
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  function setupListeners() {
    // Step 1 — welcome / new-account intro
    el.getStartedBtn.addEventListener('click', function () {
      if (isNewAccount && canReuseSessionPin) goToStep(3);
      else goToStep(2);
    });

    // Step 2 — PIN
    el.pinBackBtn.addEventListener('click', function () { goToStep(1); });
    el.pinNextBtn.addEventListener('click', isNewAccount ? handlePinVerify : handlePinNext);
    el.pinConfirmInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { (isNewAccount ? handlePinVerify : handlePinNext)(); }
    });
    el.pinInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && isNewAccount) handlePinVerify();
    });
    setupToggle(el.togglePinVisibility, el.pinInput);

    // Step 3 — method
    el.methodImport.addEventListener('click', function () { method = 'import'; goToStep(4); });
    el.methodGenerate.addEventListener('click', function () { method = 'generate'; goToStep(4); });
    el.methodHardware.addEventListener('click', function () { method = 'hardware'; goToStep(4); });

    // Step 4a
    el.importBackBtn.addEventListener('click', function () { goToStep(3); });
    el.importConfirmBtn.addEventListener('click', handleImportConfirm);
    setupToggle(el.toggleImportPassphrase, el.importPassphrase);

    // Step 4b
    el.generateBackBtn.addEventListener('click', function () { goToStep(3); });
    el.generateConfirmBtn.addEventListener('click', handleGenerateConfirm);
    setupToggle(el.toggleGeneratePassphrase, el.generatePassphrase);

    // Step 4c
    el.hardwareBackBtn.addEventListener('click', function () { goToStep(3); });
    el.hardwareConnectBtn.addEventListener('click', handleHardwareConnect);

    // Step 4d
    el.backupConfirmCheck.addEventListener('change', function () {
      el.backupNextBtn.disabled = !el.backupConfirmCheck.checked;
    });
    el.backupCopyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(generatedMnemonic).then(function () {
        showToast('Recovery phrase copied', 'success');
      });
    });
    el.backupNextBtn.addEventListener('click', handleBackupNext);

    // Step 5
    el.finishBtn.addEventListener('click', handleFinish);
  }

  // ── Adapt UI for new-account mode ──────────────────────────────────────────

  function applyNewAccountMode() {
    var label = 'Neurai_' + targetAccountId;

    // Step 1 — change welcome to "add account"
    el.welcomeTitle.textContent = 'Add New Account';
    el.welcomeSubtitle.textContent =
      'Set up ' + label + '. Import an existing wallet, generate a new one, or connect a hardware device.';
    if (el.welcomeFeatures) el.welcomeFeatures.classList.add('hidden');
    el.getStartedBtn.textContent = 'Continue';

    // Step 2 — change PIN creation to verification
    document.getElementById('pinTitle').textContent = 'Verify Your PIN';
    document.getElementById('pinSubtitle').textContent =
      'Enter your current PIN to continue setting up ' + label + '.';
    var pinConfirmGroup = document.getElementById('pinConfirmGroup');
    if (pinConfirmGroup) pinConfirmGroup.classList.add('hidden');
    el.pinInput.placeholder = 'Enter your current PIN';

    // Step 3 — update subtitle
    document.getElementById('methodTitle').textContent = 'Set Up ' + label;

    // Step 5 — update success
    el.successTitle.textContent = 'Account Added!';
    el.successSubtitle.textContent =
      label + ' is ready. Close this tab to use it from the Neurai Sign extension.';
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    var result = await new Promise(function (resolve) {
      chrome.storage.local.get([C.ACCOUNTS_KEY, C.SETTINGS_KEY, C.UNLOCK_UNTIL_KEY], resolve);
    });

    existingAccounts = result[C.ACCOUNTS_KEY] || null;
    existingSettings = result[C.SETTINGS_KEY] || null;
    existingPinHash = (existingSettings && existingSettings.pinHash) || '';
    var unlockUntil = Number(result[C.UNLOCK_UNTIL_KEY] || 0);

    if (existingPinHash && unlockUntil > Date.now() && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        var sessionResult = await chrome.runtime.sendMessage({ type: C.MSG.GET_SESSION_PIN });
        var sessionPin = String((sessionResult && sessionResult.pin) || '');
        if (sessionPin) {
          var sessionHash = await NEURAI_UTILS.hashText(sessionPin);
          if (sessionHash === existingPinHash) {
            pin = sessionPin;
            canReuseSessionPin = true;
          }
        }
      } catch (_) { }
    }

    if (isNewAccount) {
      // New account mode — need existing wallet + PIN
      if (!existingAccounts || !existingPinHash) {
        // No existing wallet — fall back to normal onboarding
        isNewAccount = false;
      } else {
        applyNewAccountMode();
      }
    } else {
      // Fresh install check — if wallet exists, show message
      if (existingAccounts) {
        var hasWallet = Object.keys(existingAccounts).some(function (id) {
          var entry = existingAccounts[id];
          return entry && (
            entry.privateKey ||
            (entry.privateKeyEnc && typeof entry.privateKeyEnc === 'string' && entry.privateKeyEnc.length > 10) ||
            (entry.walletType === 'hardware' && entry.address && entry.publicKey)
          );
        });
        if (hasWallet) {
          document.body.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--text-secondary)">' +
            '<p>Wallet already configured. You can close this tab.</p></div>';
          return;
        }
      }
    }

    setupListeners();
    goToStep(1);
  }

  init();
})();
