/* Neurai Sign — Onboarding Wizard */
/* global NeuraiKey, NeuraiSignESP32, chrome */
import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import { elem } from '../shared/dom.js';
import type { WalletSettings, AccountsRecord } from '../types/index.js';

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
    progressStep5: document.getElementById('progressStep5'),
    progressStep6: document.getElementById('progressStep6'),
    progressStep7: document.getElementById('progressStep7'),
    progressLine5: document.getElementById('progressLine5'),
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3'),
    step4Import: document.getElementById('step4Import'),
    step4Generate: document.getElementById('step4Generate'),
    step4Hardware: document.getElementById('step4Hardware'),
    step4HardwareDetected: document.getElementById('step4HardwareDetected'),
    step4HardwareInfo: document.getElementById('step4HardwareInfo'),
    step4Backup: document.getElementById('step4Backup'),
    step5: document.getElementById('step5'),
    // Step 1
    welcomeTitle: document.getElementById('welcomeTitle'),
    welcomeSubtitle: document.getElementById('welcomeSubtitle'),
    welcomeFeatures: document.getElementById('welcomeFeatures'),
    getStartedBtn: document.getElementById('getStartedBtn'),
    // Step 2
    pinInput: document.getElementById('pinInput') as HTMLInputElement | null,
    pinConfirmInput: document.getElementById('pinConfirmInput') as HTMLInputElement | null,
    pinError: document.getElementById('pinError'),
    pinBackBtn: document.getElementById('pinBackBtn'),
    pinNextBtn: document.getElementById('pinNextBtn'),
    togglePinVisibility: document.getElementById('togglePinVisibility'),
    // Step 3
    methodImport: document.getElementById('methodImport'),
    methodGenerate: document.getElementById('methodGenerate'),
    methodHardware: document.getElementById('methodHardware'),
    // Step 4a - Import
    importNetwork: document.getElementById('importNetwork') as HTMLSelectElement | null,
    importSeed: document.getElementById('importSeed') as HTMLTextAreaElement | null,
    importPassphrase: document.getElementById('importPassphrase') as HTMLInputElement | null,
    importError: document.getElementById('importError'),
    importBackBtn: document.getElementById('importBackBtn'),
    importConfirmBtn: document.getElementById('importConfirmBtn'),
    toggleImportPassphrase: document.getElementById('toggleImportPassphrase'),
    // Step 4b - Generate
    generateNetwork: document.getElementById('generateNetwork') as HTMLSelectElement | null,
    generateWordCount: document.getElementById('generateWordCount') as HTMLSelectElement | null,
    generatePassphrase: document.getElementById('generatePassphrase') as HTMLInputElement | null,
    generateError: document.getElementById('generateError'),
    generateBackBtn: document.getElementById('generateBackBtn'),
    generateConfirmBtn: document.getElementById('generateConfirmBtn'),
    toggleGeneratePassphrase: document.getElementById('toggleGeneratePassphrase'),
    // Step 4c - Hardware
    hardwareError: document.getElementById('hardwareError'),
    hardwareDetectedError: document.getElementById('hardwareDetectedError'),
    hardwareInfoError: document.getElementById('hardwareInfoError'),
    hardwareBackBtn: document.getElementById('hardwareBackBtn'),
    hardwareConnectBtn: document.getElementById('hardwareConnectBtn'),
    hardwareDetectedBackBtn: document.getElementById('hardwareDetectedBackBtn'),
    hardwareProceedBtn: document.getElementById('hardwareProceedBtn'),
    hardwareInfoBackBtn: document.getElementById('hardwareInfoBackBtn'),
    hardwareAddBtn: document.getElementById('hardwareAddBtn'),
    pingDevice: document.getElementById('pingDevice'),
    pingFirmware: document.getElementById('pingFirmware'),
    pingVersion: document.getElementById('pingVersion'),
    pingChip: document.getElementById('pingChip'),
    hwInfoAddress: document.getElementById('hwInfoAddress'),
    hwInfoPubkey: document.getElementById('hwInfoPubkey'),
    hwInfoFingerprint: document.getElementById('hwInfoFingerprint'),
    hwInfoNetwork: document.getElementById('hwInfoNetwork'),
    hwInfoType: document.getElementById('hwInfoType'),
    hwInfoPath: document.getElementById('hwInfoPath'),
    // Step 4c - Hardware setup (unconfigured device → create / restore)
    step4HwSetup: document.getElementById('step4HwSetup'),
    step4HwCreate: document.getElementById('step4HwCreate'),
    step4HwRecover: document.getElementById('step4HwRecover'),
    step4HwProvision: document.getElementById('step4HwProvision'),
    hwCreateBtn: document.getElementById('hwCreateBtn'),
    hwRecoverBtn: document.getElementById('hwRecoverBtn'),
    hwSetupBackBtn: document.getElementById('hwSetupBackBtn'),
    hwCreateNetwork: document.getElementById('hwCreateNetwork') as HTMLSelectElement | null,
    hwCreateKeyType: document.getElementById('hwCreateKeyType') as HTMLSelectElement | null,
    hwCreateWordCount: document.getElementById('hwCreateWordCount') as HTMLSelectElement | null,
    hwCreateError: document.getElementById('hwCreateError'),
    hwCreateBackBtn: document.getElementById('hwCreateBackBtn'),
    hwCreateContinueBtn: document.getElementById('hwCreateContinueBtn'),
    hwRecoverNetwork: document.getElementById('hwRecoverNetwork') as HTMLSelectElement | null,
    hwRecoverKeyType: document.getElementById('hwRecoverKeyType') as HTMLSelectElement | null,
    hwRecoverSeed: document.getElementById('hwRecoverSeed') as HTMLTextAreaElement | null,
    hwRecoverError: document.getElementById('hwRecoverError'),
    hwRecoverBackBtn: document.getElementById('hwRecoverBackBtn'),
    hwRecoverContinueBtn: document.getElementById('hwRecoverContinueBtn'),
    hwProvisionText: document.getElementById('hwProvisionText'),
    hwProvisionSpinner: document.getElementById('hwProvisionSpinner'),
    hwProvisionError: document.getElementById('hwProvisionError'),
    hwProvisionActions: document.getElementById('hwProvisionActions'),
    hwProvisionBackBtn: document.getElementById('hwProvisionBackBtn'),
    hwProvisionRetryBtn: document.getElementById('hwProvisionRetryBtn'),
    // Step 4d - Backup
    mnemonicGrid: document.getElementById('mnemonicGrid'),
    backupPassphraseRow: document.getElementById('backupPassphraseRow'),
    backupPassphraseText: document.getElementById('backupPassphraseText'),
    backupConfirmCheck: document.getElementById('backupConfirmCheck') as HTMLInputElement | null,
    backupCopyBtn: document.getElementById('backupCopyBtn'),
    backupNextBtn: document.getElementById('backupNextBtn') as HTMLButtonElement | null,
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

  function isPQNetwork(network: string): network is NeuraiKeyPQNetwork {
    return network === 'xna-pq' || network === 'xna-pq-test';
  }

  function isLegacyNetwork(network: string): network is NeuraiKeyNetwork {
    return network === 'xna' || network === 'xna-test' || network === 'xna-legacy' || network === 'xna-legacy-test';
  }

  function generateMnemonicForWordCount(wordCount: '12' | '24') {
    const entropy = new Uint8Array(wordCount === '24' ? 32 : 16);
    crypto.getRandomValues(entropy);
    return NeuraiKey.entropyToMnemonic(entropy);
  }

  interface WalletResult {
    address: string;
    publicKey: string;
    privateKey: string | null;
    seedKey: string | null;
    mnemonic: string | null;
    passphrase: string | null;
    network: string;
    walletType: 'software' | 'hardware';
    hardwareDeviceName?: string | null;
    hardwareDeviceNetwork?: string | null;
    hardwareFirmwareVersion?: string | null;
    hardwareDerivationPath?: string | null;
    hardwareMasterFingerprint?: string | null;
  }

  var currentStep = 1;
  var pin = '';
  var existingPinHash = '';
  var existingAccounts: AccountsRecord | null = null;
  var existingSettings: WalletSettings | null = null;
  var method = ''; // 'import' | 'generate' | 'hardware'
  var generatedMnemonic = '';
  var walletResult: WalletResult | null = null;
  var canReuseSessionPin = false;
  // Hardware onboarding is two-phase: ping (detect, no prompt) → proceed (gated
  // getInfo). The device stays connected between the two so the second step
  // reuses the same session.
  var hwDevice: NeuraiESP32Instance | null = null;
  var hwPing: NeuraiESP32PingResult | null = null;
  // Host-driven provisioning of an UNCONFIGURED device (setup_seed). When active,
  // the shared backup screen (step 45) sends the phrase to the device instead of
  // saving a software wallet, and the phrase/network/keyType below feed
  // provisionDevice() (also used by "Retry").
  var hwSetupActive = false;
  var hwSetupNetwork: NeuraiSignESP32Network = 'mainnet';
  var hwSetupKeyType: NeuraiSignESP32KeyType = 'legacy';
  var hwSetupMnemonic = '';

  async function tryReuseConfiguredSessionPin(expectedPinHash: string, unlockUntil: number) {
    if (!expectedPinHash || unlockUntil <= Date.now()) return false;

    var sessionPin = '';

    if (chrome.storage && chrome.storage.session) {
      try {
        const res = await chrome.storage.session.get(C.SESSION_PIN_KEY);
        sessionPin = String((res && res[C.SESSION_PIN_KEY]) || '');
      } catch (_) { }
    }

    if (!sessionPin && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        var sessionResult = await chrome.runtime.sendMessage({ type: C.MSG.GET_SESSION_PIN });
        sessionPin = String((sessionResult && sessionResult.pin) || '');
      } catch (_) { }
    }

    if (!sessionPin) return false;

    try {
      var sessionHash = await NEURAI_UTILS.hashText(sessionPin);
      if (sessionHash !== expectedPinHash) return false;
      pin = sessionPin;
      canReuseSessionPin = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  function applyThemeFromSettings(settings: Partial<WalletSettings> | null) {
    if (typeof NEURAI_UTILS !== 'undefined' && typeof NEURAI_UTILS.applyTheme === 'function') {
      NEURAI_UTILS.applyTheme(settings || {});
      return;
    }
    var selected = ((settings || {}).theme) || 'light';
    var theme: string = selected === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : selected;
    document.documentElement.setAttribute('data-theme', theme);
  }

  // ── Step navigation ────────────────────────────────────────────────────────

  var allStepCards = [
    el.step1, el.step2, el.step3,
    el.step4Import, el.step4Generate, el.step4Hardware,
    el.step4HardwareDetected, el.step4HardwareInfo,
    el.step4HwSetup, el.step4HwCreate, el.step4HwRecover, el.step4HwProvision,
    el.step4Backup,
    el.step5
  ].filter(Boolean) as HTMLElement[];

  // Hardware uses a 3-step sub-flow (4 connect → 6 detected → 7 info → 5 success).
  // 6/7 are internal step numbers; updateProgressBar maps them to visual dots 5/6.
  function getStepCard(stepNum: number): HTMLElement | null {
    switch (stepNum) {
      case 1: return el.step1;
      case 2: return el.step2;
      case 3: return el.step3;
      case 4:
        if (method === 'import') return el.step4Import;
        if (method === 'generate') return el.step4Generate;
        if (method === 'hardware') return el.step4Hardware;
        return el.step4Import;
      case 6: return el.step4HardwareDetected;
      case 7: return el.step4HardwareInfo;
      case 41: return el.step4HwSetup;
      case 42: return el.step4HwCreate;
      case 43: return el.step4HwRecover;
      case 44: return el.step4HwProvision;
      case 45: return el.step4Backup;
      case 5: return el.step5;
      default: return el.step1;
    }
  }

  function goToStep(stepNum: number) {
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

  function updateProgressBar(stepNum: number) {
    var isHw = method === 'hardware';

    // The hardware path has two extra sections → 7 dots; everything else → 5.
    el.progressStep6!.classList.toggle('hidden', !isHw);
    el.progressStep7!.classList.toggle('hidden', !isHw);
    el.progressLine5!.classList.toggle('hidden', !isHw);
    // When the extra steps are hidden, dot 5 becomes the last visible one and
    // must not stretch (the real DOM :last-child is the hidden step 7).
    el.progressStep5!.classList.toggle('is-last', !isHw);

    // Map the internal step number to a visual dot (1-based).
    var displayStep: number;
    if (isHw) {
      // 1 welcome · 2 PIN · 3 method · 4 connect/setup · 5 detected/provision ·
      // 6 info · 7 success. The unconfigured-device sub-steps (41-45) fold into
      // the "connect/setup" (4) and "provision" (5) stages.
      var hwMap: Record<number, number> = {
        1: 1, 2: 2, 3: 3, 4: 4, 41: 4, 42: 4, 43: 4, 45: 4, 44: 5, 6: 5, 7: 6, 5: 7
      };
      displayStep = hwMap[stepNum] || stepNum;
    } else {
      // Visual progress: 1=welcome, 2=PIN(or skip), 3=method, 4=form, 5=success
      displayStep = stepNum === 45 ? 4 : stepNum;
    }

    var dots = el.progressBar!.querySelectorAll('.progress-dot');
    var lines = el.progressBar!.querySelectorAll('.progress-line');

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

  var toastTimer: ReturnType<typeof setTimeout> | null = null;
  function showToast(msg: string, type?: string) {
    clearTimeout(toastTimer!);
    el.toast!.textContent = msg;
    el.toast!.className = 'toast toast-' + (type || 'success') + ' visible';
    toastTimer = setTimeout(function () {
      el.toast!.classList.remove('visible');
    }, 3000);
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  function showLoading(msg?: string) {
    el.loadingText!.textContent = msg || 'Loading...';
    el.loadingOverlay!.classList.remove('hidden');
  }

  function hideLoading() {
    el.loadingOverlay!.classList.add('hidden');
  }

  // ── Toggle password visibility ─────────────────────────────────────────────

  function setupToggle(btn: HTMLElement | null, input: HTMLInputElement | null) {
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }

  // ── PIN validation (step 2 — only for fresh install) ───────────────────────

  async function handlePinNext() {
    var p = el.pinInput!.value;
    var pc = el.pinConfirmInput!.value;

    if (p.length < 4 || p.length > 20) {
      el.pinError!.textContent = 'PIN must be between 4 and 20 characters.';
      return;
    }
    if (p !== pc) {
      el.pinError!.textContent = 'PINs do not match.';
      return;
    }

    el.pinError!.textContent = '';
    pin = p;
    goToStep(3);
  }

  // ── PIN verification (new-account mode: verify existing PIN) ───────────────

  async function handlePinVerify() {
    var p = el.pinInput!.value;
    if (!p) {
      el.pinError!.textContent = 'Enter your current PIN.';
      return;
    }

    var hash = await NEURAI_UTILS.hashText(p);
    if (hash !== existingPinHash) {
      el.pinError!.textContent = 'Incorrect PIN.';
      return;
    }

    el.pinError!.textContent = '';
    pin = p;
    goToStep(3);
  }

  // ── Import wallet ──────────────────────────────────────────────────────────

  async function handleImportConfirm() {
    var seedRaw = el.importSeed!.value.trim().replace(/\s+/g, ' ');
    var words = seedRaw.split(' ');
    if (words.length !== 12 && words.length !== 24) {
      el.importError!.textContent = 'Please enter a valid 12 or 24-word seed phrase.';
      return;
    }

    el.importError!.textContent = '';
    showLoading('Deriving wallet address...');

    try {
      var network = el.importNetwork!.value;
      var passphrase = el.importPassphrase!.value || null;

      if (isPQNetwork(network)) {
        var pqAddr = NeuraiKey.getPQAddress(network, seedRaw, 0, 0, passphrase || undefined);
        walletResult = {
          address: pqAddr.address,
          publicKey: pqAddr.publicKey,
          privateKey: null,
          seedKey: pqAddr.seedKey,
          mnemonic: seedRaw,
          passphrase: passphrase,
          network: network,
          walletType: 'software'
        };
      } else if (isLegacyNetwork(network)) {
        var derived = NeuraiKey.getAddressPair(network, seedRaw, 0, 0, passphrase || undefined);
        var addressData = derived.external;
        walletResult = {
          address: addressData.address,
          publicKey: addressData.publicKey,
          privateKey: addressData.WIF,
          seedKey: null,
          mnemonic: seedRaw,
          passphrase: passphrase,
          network: network,
          walletType: 'software'
        };
      } else {
        throw new Error('Unsupported network: ' + network);
      }

      await saveWallet();
      hideLoading();
      goToStep(5);
      el.successAddress!.textContent = walletResult.address;
    } catch (err) {
      hideLoading();
      el.importError!.textContent = 'Import failed: ' + (err as Error).message;
    }
  }

  // ── Generate wallet ────────────────────────────────────────────────────────

  async function handleGenerateConfirm() {
    el.generateError!.textContent = '';
    // Software generate path: ensure the shared backup screen saves a software
    // wallet (not the hardware setup_seed branch in handleBackupNext).
    hwSetupActive = false;
    showLoading('Generating wallet...');

    try {
      var network = el.generateNetwork!.value;
      var passphrase = el.generatePassphrase!.value || null;

      generatedMnemonic = generateMnemonicForWordCount(el.generateWordCount!.value === '24' ? '24' : '12');

      if (isPQNetwork(network)) {
        var pqAddr = NeuraiKey.getPQAddress(network, generatedMnemonic, 0, 0, passphrase || undefined);
        walletResult = {
          address: pqAddr.address,
          publicKey: pqAddr.publicKey,
          privateKey: null,
          seedKey: pqAddr.seedKey,
          mnemonic: generatedMnemonic,
          passphrase: passphrase,
          network: network,
          walletType: 'software'
        };
      } else if (isLegacyNetwork(network)) {
        var derived = NeuraiKey.getAddressPair(network, generatedMnemonic, 0, 0, passphrase || undefined);
        var addressData = derived.external;
        walletResult = {
          address: addressData.address,
          publicKey: addressData.publicKey,
          privateKey: addressData.WIF,
          seedKey: null,
          mnemonic: generatedMnemonic,
          passphrase: passphrase,
          network: network,
          walletType: 'software'
        };
      } else {
        throw new Error('Unsupported network: ' + network);
      }

      hideLoading();
      showMnemonicBackup(generatedMnemonic, passphrase);
    } catch (err) {
      hideLoading();
      el.generateError!.textContent = 'Generation failed: ' + (err as Error).message;
    }
  }

  function showMnemonicBackup(mnemonic: string, passphrase: string | null) {
    var words = mnemonic.split(' ');
    el.mnemonicGrid!.replaceChildren(...words.map(function (word, i) {
      return elem('span', { class: 'mnemonic-word' }, [elem('span', { class: 'mnemonic-num' }, String(i + 1)), word]);
    }));

    if (passphrase) {
      el.backupPassphraseRow!.classList.remove('hidden');
      el.backupPassphraseText!.textContent = passphrase;
    } else {
      el.backupPassphraseRow!.classList.add('hidden');
    }

    el.backupConfirmCheck!.checked = false;
    el.backupNextBtn!.disabled = true;
    goToStep(45);
  }

  async function handleBackupNext() {
    // Hardware setup reuses this backup screen for the "create" path: once the
    // owner has written the phrase down, send it to the device (setup_seed)
    // instead of saving a software wallet here.
    if (hwSetupActive) {
      await provisionDevice();
      return;
    }
    showLoading('Saving wallet...');
    try {
      await saveWallet();
      hideLoading();
      goToStep(5);
      el.successAddress!.textContent = walletResult!.address;
    } catch (err) {
      hideLoading();
      showToast('Save failed: ' + (err as Error).message, 'error');
    }
  }

  // ── Hardware wallet ────────────────────────────────────────────────────────

  // Clear the hardware wizard's errors and drop any in-progress device session.
  // Navigation between the hardware steps is handled by goToStep(); this only
  // resets state. Safe to call when nothing is connected.
  function resetHardwareUi() {
    el.hardwareError!.textContent = '';
    el.hardwareDetectedError!.textContent = '';
    el.hardwareInfoError!.textContent = '';
    el.hwCreateError!.textContent = '';
    el.hwRecoverError!.textContent = '';
    el.hwProvisionError!.textContent = '';
    hwPing = null;
    hwSetupActive = false;
    hwSetupMnemonic = '';
    if (hwDevice) {
      var d = hwDevice;
      hwDevice = null;
      d.disconnect().catch(function () { });
    }
  }

  // Shorten a long hex value for display (e.g. the 2624-hex-char PQ pubkey).
  function truncateMiddle(value: string, keep: number): string {
    if (!value || value.length <= keep * 2 + 1) return value || '--';
    return value.slice(0, keep) + '…' + value.slice(-keep);
  }

  // Phase 1: detect the device and classify its state with `getDeviceState`
  // (a no-prompt ping that also distinguishes locked / unconfigured devices,
  // where a plain `ping()` would just throw). Branch:
  //  · ready        → "Device Detected" screen (read the wallet next).
  //  · unconfigured → host-driven setup wizard (create / restore).
  //  · locked       → ask the owner to unlock on the device first.
  async function handleHardwareConnect() {
    el.hardwareError!.textContent = '';
    showLoading('Detecting device...');

    try {
      var device = new NeuraiSignESP32.NeuraiESP32();
      await device.connect();
      hwDevice = device;

      var state = await device.getDeviceState();

      if (state === 'unconfigured') {
        // Empty device: offer to provision it (create / restore) over USB.
        hwSetupActive = false;
        el.hwCreateError!.textContent = '';
        el.hwRecoverError!.textContent = '';
        hideLoading();
        goToStep(41); // → Device Not Configured
        return;
      }

      if (state === 'locked') {
        // A wallet exists but is locked; we cannot read it or set it up until
        // the owner unlocks on the device. Drop the session so a later
        // "Connect" re-opens the port cleanly.
        hwDevice = null;
        await device.disconnect().catch(function () { });
        hideLoading();
        el.hardwareError!.textContent = 'This device has a wallet but is locked. Unlock it (enter the PIN) on the device, then connect again.';
        return;
      }

      // Ready: the no-prompt handshake populates the "Device Detected" screen.
      var pong = await device.ping();
      hwPing = pong;

      el.pingDevice!.textContent = pong.device || 'NeuraiHW';
      el.pingFirmware!.textContent = pong.firmware_version || '--';
      el.pingVersion!.textContent = pong.version || '--';
      el.pingChip!.textContent = pong.chip || '--';

      el.hardwareDetectedError!.textContent = '';
      hideLoading();
      goToStep(6); // → Device Detected
    } catch (err) {
      hideLoading();
      if (hwDevice) { try { await hwDevice.disconnect(); } catch (_) { } hwDevice = null; }
      const error = err as Error;
      if (error && (error.name === 'NotFoundError' || String(error.message || '').includes('No port selected'))) {
        el.hardwareError!.textContent = 'No device selected. Please try again.';
      } else {
        el.hardwareError!.textContent = 'Could not detect device: ' + error.message;
      }
    }
  }

  // Read the wallet from the device (`getInfo` is gated → on-device "ALLOW HOST?"
  // approval), build the pending hardware walletResult and populate the review
  // screen (step 7). Shared by the "already configured" path (handleHardwareProceed)
  // and the post-provisioning path (provisionDevice). Throws on cancel/error; the
  // caller maps the message to the right screen and hides the loader.
  async function readWalletAndShowReview() {
    var info = await hwDevice!.getInfo();

    // The device is authoritative about its mode. Derive the stored network
    // entirely from what the device reports (network axis + key_type) so
    // signing later routes to the correct (legacy vs PQ) path.
    var deviceKeyType: 'legacy' | 'pq' = info.key_type === 'pq' ? 'pq' : 'legacy';
    var deviceAxis: 'mainnet' | 'testnet' =
      String(info.network || '').toLowerCase().indexOf('test') !== -1
        ? 'testnet'
        : 'mainnet';
    var resolvedNetwork =
      typeof NeuraiSignESP32.resolveNetwork === 'function'
        ? NeuraiSignESP32.resolveNetwork(deviceAxis, deviceKeyType)
        : (deviceKeyType === 'pq'
            ? (deviceAxis === 'testnet' ? 'xna-pq-test' : 'xna-pq')
            : (deviceAxis === 'testnet' ? 'xna-test' : 'xna'));

    walletResult = {
      address: info.address,
      publicKey: info.pubkey,
      privateKey: null,
      seedKey: null,
      mnemonic: null,
      passphrase: null,
      network: resolvedNetwork,
      walletType: 'hardware',
      hardwareDeviceName: info.device || 'NeuraiHW',
      hardwareDeviceNetwork: info.network || null,
      // Prefer the real firmware version reported by ping; fall back to the
      // protocol version from info.
      hardwareFirmwareVersion: (hwPing && hwPing.firmware_version) || info.version || null,
      hardwareDerivationPath: info.path || null,
      hardwareMasterFingerprint: info.master_fingerprint || null
    };

    // Populate the review screen. Keep the device connected so "Back" can
    // re-read it without forcing a full reconnect.
    el.hwInfoAddress!.textContent = info.address || '--';
    el.hwInfoPubkey!.textContent = truncateMiddle(info.pubkey || '', 24);
    el.hwInfoFingerprint!.textContent = info.master_fingerprint || '--';
    el.hwInfoNetwork!.textContent = info.network || '--';
    el.hwInfoType!.textContent = deviceKeyType.toUpperCase();
    el.hwInfoPath!.textContent = info.path || '--';

    el.hardwareInfoError!.textContent = '';
    goToStep(7); // → Hardware Wallet (review & add)
  }

  // Phase 2: the user chose to proceed. `getInfo` is gated on current firmware —
  // the device shows "ALLOW HOST?" and only returns the wallet data once the
  // owner approves on the device screen (otherwise it replies "User cancelled").
  // On success we build the pending wallet and advance to the review screen; we
  // do NOT save until the user presses "Add".
  async function handleHardwareProceed() {
    if (!hwDevice) {
      el.hardwareDetectedError!.textContent = 'Device not connected. Go back and click Connect Device.';
      return;
    }
    el.hardwareDetectedError!.textContent = '';
    showLoading('Approve on your device to share wallet info...');

    try {
      await readWalletAndShowReview();
      hideLoading();
    } catch (err) {
      hideLoading();
      // Keep the device connected so the user can retry the approval.
      const error = err as Error;
      if (String(error.message || '').includes('User cancelled')) {
        el.hardwareDetectedError!.textContent = 'Approval was cancelled on the device. Click "Connect to wallet" to try again.';
      } else {
        el.hardwareDetectedError!.textContent = 'Connection failed: ' + error.message;
      }
    }
  }

  // ── Hardware setup (provision an unconfigured device) ──────────────────────

  // Resolve the (network, keyType) pair from a setup screen's selects. PQ is
  // testnet-only (the firmware and library both reject pq+mainnet), so a "pq"
  // choice forces testnet here for a clear, early result.
  function readHwSetupSelection(
    networkSel: HTMLSelectElement | null,
    keyTypeSel: HTMLSelectElement | null
  ): { network: NeuraiSignESP32Network; keyType: NeuraiSignESP32KeyType } {
    var keyType: NeuraiSignESP32KeyType = keyTypeSel!.value === 'pq' ? 'pq' : 'legacy';
    var network: NeuraiSignESP32Network = networkSel!.value === 'testnet' ? 'testnet' : 'mainnet';
    if (keyType === 'pq') network = 'testnet';
    return { network: network, keyType: keyType };
  }

  // "Create New Wallet": pick network/type/length, generate the phrase on this
  // host and show the backup screen. The phrase is sent to the device only after
  // the user confirms the backup (handleBackupNext → provisionDevice).
  function handleHwCreateContinue() {
    el.hwCreateError!.textContent = '';
    try {
      var sel = readHwSetupSelection(el.hwCreateNetwork, el.hwCreateKeyType);
      hwSetupNetwork = sel.network;
      hwSetupKeyType = sel.keyType;

      var wordCount: '12' | '24' = el.hwCreateWordCount!.value === '24' ? '24' : '12';
      generatedMnemonic = generateMnemonicForWordCount(wordCount);
      hwSetupMnemonic = generatedMnemonic;
      hwSetupActive = true;

      // Reuse the shared backup screen (no passphrase for hardware setup).
      showMnemonicBackup(generatedMnemonic, null);
    } catch (err) {
      el.hwCreateError!.textContent = 'Could not generate phrase: ' + (err as Error).message;
    }
  }

  // "Restore from Phrase": validate the word count (the device re-validates the
  // BIP39 checksum authoritatively) and provision the device directly.
  function handleHwRecoverContinue() {
    el.hwRecoverError!.textContent = '';
    var seedRaw = el.hwRecoverSeed!.value.trim().replace(/\s+/g, ' ');
    var words = seedRaw ? seedRaw.split(' ') : [];
    if (words.length !== 12 && words.length !== 24) {
      el.hwRecoverError!.textContent = 'Please enter a valid 12 or 24-word recovery phrase.';
      return;
    }
    // Catch a bad checksum early for a clear message; the device re-validates too.
    if (typeof NeuraiKey.isMnemonicValid === 'function' && !NeuraiKey.isMnemonicValid(seedRaw)) {
      el.hwRecoverError!.textContent = 'That recovery phrase is not valid (checksum failed). Check the words and order.';
      return;
    }

    var sel = readHwSetupSelection(el.hwRecoverNetwork, el.hwRecoverKeyType);
    hwSetupNetwork = sel.network;
    hwSetupKeyType = sel.keyType;
    hwSetupMnemonic = seedRaw;
    hwSetupActive = true;

    void provisionDevice();
  }

  // Send the (host-held) phrase to an unconfigured device via `setup_seed`, wait
  // for the owner to approve + create the PIN on the device, then read the wallet
  // back and show the review screen. Re-runnable via "Retry": if the owner
  // cancels, the device stays unconfigured and setupSeed can be called again.
  async function provisionDevice() {
    if (!hwDevice || !hwSetupMnemonic) {
      // Lost the session or phrase — fall back to the setup choice screen.
      goToStep(41);
      return;
    }

    el.hwProvisionError!.textContent = '';
    el.hwProvisionActions!.classList.add('hidden');
    el.hwProvisionSpinner!.classList.remove('hidden');
    el.hwProvisionText!.textContent = 'Approve the setup on your device…';
    goToStep(44); // → Configuring Device

    try {
      // Owner approves the summary (word count + network + key type) on-device.
      await hwDevice.setupSeed({
        mnemonic: hwSetupMnemonic,
        network: hwSetupNetwork,
        keyType: hwSetupKeyType
      });

      // Approved: the owner now creates the PIN on the device. Poll until the
      // keys are derived (the device leaves the locked state).
      el.hwProvisionText!.textContent = 'Create your PIN on the device to finish…';
      await hwDevice.waitUntilReady({ timeoutMs: 300000 });

      // Configured: read the wallet (gated getInfo → on-device approval) and
      // advance to the review screen.
      el.hwProvisionText!.textContent = 'Approve on your device to share wallet info…';
      await readWalletAndShowReview();
    } catch (err) {
      el.hwProvisionSpinner!.classList.add('hidden');
      el.hwProvisionActions!.classList.remove('hidden');
      const error = err as Error;
      var msg = String(error.message || '');
      if (msg.includes('User cancelled')) {
        el.hwProvisionText!.textContent = 'Setup was cancelled on the device.';
        el.hwProvisionError!.textContent = 'You cancelled the setup on the device. Tap Retry to send it again.';
      } else if (msg.includes('Timed out')) {
        el.hwProvisionText!.textContent = 'Timed out waiting for the device.';
        el.hwProvisionError!.textContent = 'The device did not finish in time. Make sure you approved and created the PIN, then tap Retry.';
      } else {
        el.hwProvisionText!.textContent = 'Setup failed.';
        el.hwProvisionError!.textContent = 'Setup failed: ' + msg;
      }
    }
  }

  // Phase 3: the user reviewed the wallet and pressed "Add". Persist it and
  // finish onboarding. No further device interaction is required.
  async function handleHardwareAdd() {
    if (!walletResult) {
      el.hardwareInfoError!.textContent = 'No wallet to add. Go back and read the device again.';
      return;
    }
    el.hardwareInfoError!.textContent = '';
    showLoading('Saving wallet...');

    try {
      if (hwDevice) { try { await hwDevice.disconnect(); } catch (_) { } hwDevice = null; }
      hwPing = null;

      await saveWallet();
      hideLoading();
      goToStep(5);
      el.successAddress!.textContent = walletResult.address;
    } catch (err) {
      hideLoading();
      el.hardwareInfoError!.textContent = 'Save failed: ' + (err as Error).message;
    }
  }

  // ── Save wallet to chrome.storage ──────────────────────────────────────────

  async function saveWallet() {
    var accounts: Record<string, unknown>;
    var settings: WalletSettings;
    var pinHash: string;

    if (isNewAccount && existingAccounts && existingSettings) {
      // Add to existing accounts
      accounts = {};
      for (var j = 1; j <= C.MAX_ACCOUNTS; j++) {
        var jid = String(j);
        accounts[jid] = (existingAccounts as Record<string, unknown>)[jid] || null;
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

    var account: Record<string, unknown> = {
      privateKey: null,
      privateKeyEnc: null,
      seedKey: null,
      seedKeyEnc: null,
      mnemonic: null,
      mnemonicEnc: null,
      passphrase: null,
      passphraseEnc: null,
      address: walletResult!.address,
      publicKey: walletResult!.publicKey,
      walletType: walletResult!.walletType,
      hardwareDeviceName: walletResult!.hardwareDeviceName || null,
      hardwareDeviceNetwork: walletResult!.hardwareDeviceNetwork || null,
      hardwareFirmwareVersion: walletResult!.hardwareFirmwareVersion || null,
      hardwareDerivationPath: walletResult!.hardwareDerivationPath || null,
      hardwareMasterFingerprint: walletResult!.hardwareMasterFingerprint || null,
      network: walletResult!.network,
      history: []
    };

    // Encrypt secrets with PIN
    if (walletResult!.privateKey && pin) {
      account.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(walletResult!.privateKey, pin);
    }
    if (walletResult!.seedKey && pin) {
      account.seedKeyEnc = await NEURAI_UTILS.encryptTextWithPin(walletResult!.seedKey, pin);
    }
    if (walletResult!.mnemonic && pin) {
      account.mnemonicEnc = await NEURAI_UTILS.encryptTextWithPin(walletResult!.mnemonic, pin);
    }
    if (walletResult!.passphrase && pin) {
      account.passphraseEnc = await NEURAI_UTILS.encryptTextWithPin(walletResult!.passphrase, pin);
    }

    accounts[targetAccountId] = account;

    var lockTimeout = ((settings.lockTimeoutMinutes || 10) * 60 * 1000);
    var unlockUntil = Date.now() + lockTimeout;

    await chrome.storage.local.set({
      [C.ACCOUNTS_KEY]: accounts,
      [C.ACTIVE_ACCOUNT_KEY]: targetAccountId,
      [C.STORAGE_KEY]: account,
      [C.SETTINGS_KEY]: settings,
      [C.UNLOCK_UNTIL_KEY]: unlockUntil
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
    el.getStartedBtn!.addEventListener('click', function () {
      if (isNewAccount && canReuseSessionPin) goToStep(3);
      else goToStep(2);
    });

    // Step 2 — PIN
    el.pinBackBtn!.addEventListener('click', function () { goToStep(1); });
    el.pinNextBtn!.addEventListener('click', isNewAccount ? handlePinVerify : handlePinNext);
    el.pinConfirmInput!.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { (isNewAccount ? handlePinVerify : handlePinNext)(); }
    });
    el.pinInput!.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && isNewAccount) handlePinVerify();
    });
    setupToggle(el.togglePinVisibility, el.pinInput);

    // Step 3 — method
    el.methodImport!.addEventListener('click', function () { method = 'import'; goToStep(4); });
    el.methodGenerate!.addEventListener('click', function () { method = 'generate'; goToStep(4); });
    el.methodHardware!.addEventListener('click', function () { method = 'hardware'; resetHardwareUi(); goToStep(4); });

    // Step 4a
    el.importBackBtn!.addEventListener('click', function () { goToStep(3); });
    el.importConfirmBtn!.addEventListener('click', handleImportConfirm);
    setupToggle(el.toggleImportPassphrase, el.importPassphrase);

    // Step 4b
    el.generateBackBtn!.addEventListener('click', function () { goToStep(3); });
    el.generateConfirmBtn!.addEventListener('click', handleGenerateConfirm);
    setupToggle(el.toggleGeneratePassphrase, el.generatePassphrase);

    // Step 4c — hardware wizard (4 connect → 6 detected → 7 info)
    el.hardwareBackBtn!.addEventListener('click', function () { resetHardwareUi(); goToStep(3); });
    el.hardwareConnectBtn!.addEventListener('click', handleHardwareConnect);
    // Back from "Device Detected" returns to the connect step and drops the session.
    el.hardwareDetectedBackBtn!.addEventListener('click', function () { resetHardwareUi(); goToStep(4); });
    el.hardwareProceedBtn!.addEventListener('click', handleHardwareProceed);
    // Back from "Hardware Wallet" returns to "Device Detected"; the device stays connected.
    el.hardwareInfoBackBtn!.addEventListener('click', function () { el.hardwareInfoError!.textContent = ''; goToStep(6); });
    el.hardwareAddBtn!.addEventListener('click', handleHardwareAdd);

    // Step 4c — hardware setup (unconfigured device → create / restore → provision)
    el.hwCreateBtn!.addEventListener('click', function () { el.hwCreateError!.textContent = ''; goToStep(42); });
    el.hwRecoverBtn!.addEventListener('click', function () { el.hwRecoverError!.textContent = ''; goToStep(43); });
    // Back from the setup choice drops the session and returns to the connect step.
    el.hwSetupBackBtn!.addEventListener('click', function () { resetHardwareUi(); goToStep(4); });
    el.hwCreateBackBtn!.addEventListener('click', function () { el.hwCreateError!.textContent = ''; goToStep(41); });
    el.hwCreateContinueBtn!.addEventListener('click', handleHwCreateContinue);
    el.hwRecoverBackBtn!.addEventListener('click', function () { el.hwRecoverError!.textContent = ''; goToStep(41); });
    el.hwRecoverContinueBtn!.addEventListener('click', handleHwRecoverContinue);
    // Provisioning errors expose Back (→ setup choice, device stays connected) and Retry.
    el.hwProvisionBackBtn!.addEventListener('click', function () { el.hwProvisionError!.textContent = ''; goToStep(41); });
    el.hwProvisionRetryBtn!.addEventListener('click', function () { void provisionDevice(); });

    // Step 4d
    el.backupConfirmCheck!.addEventListener('change', function () {
      el.backupNextBtn!.disabled = !el.backupConfirmCheck!.checked;
    });
    el.backupCopyBtn!.addEventListener('click', function () {
      navigator.clipboard.writeText(generatedMnemonic).then(function () {
        showToast('Recovery phrase copied', 'success');
      });
    });
    el.backupNextBtn!.addEventListener('click', handleBackupNext);

    // Step 5
    el.finishBtn!.addEventListener('click', handleFinish);
  }

  // ── Adapt UI for new-account mode ──────────────────────────────────────────

  function applyNewAccountMode() {
    var label = 'Neurai_' + targetAccountId;

    // Step 1 — change welcome to "add account"
    el.welcomeTitle!.textContent = 'Add New Account';
    el.welcomeSubtitle!.textContent =
      'Set up ' + label + '. Import an existing wallet, generate a new one, or connect a hardware device.';
    if (el.welcomeFeatures) el.welcomeFeatures.classList.add('hidden');
    el.getStartedBtn!.textContent = 'Continue';

    // Step 2 — change PIN creation to verification
    document.getElementById('pinTitle')!.textContent = 'Verify Your PIN';
    document.getElementById('pinSubtitle')!.textContent =
      'Enter your current PIN to continue setting up ' + label + '.';
    var pinConfirmGroup = document.getElementById('pinConfirmGroup');
    if (pinConfirmGroup) pinConfirmGroup.classList.add('hidden');
    el.pinInput!.placeholder = 'Enter your current PIN';

    // Step 3 — update subtitle
    document.getElementById('methodTitle')!.textContent = 'Set Up ' + label;

    // Step 5 — update success
    el.successTitle!.textContent = 'Account Added!';
    el.successSubtitle!.textContent =
      label + ' is ready. Close this tab to use it from the Neurai Sign extension.';
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    const result = await chrome.storage.local.get([C.ACCOUNTS_KEY, C.SETTINGS_KEY, C.UNLOCK_UNTIL_KEY]);

    existingAccounts = (result[C.ACCOUNTS_KEY] || null) as AccountsRecord | null;
    existingSettings = (result[C.SETTINGS_KEY] || null) as WalletSettings | null;
    applyThemeFromSettings(existingSettings || C.DEFAULT_SETTINGS);
    existingPinHash = (existingSettings && existingSettings.pinHash) || '';
    var unlockUntil = Number(result[C.UNLOCK_UNTIL_KEY] || 0);
    await tryReuseConfiguredSessionPin(existingPinHash, unlockUntil);

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
          var entry = (existingAccounts as AccountsRecord)[id];
          return entry && (
            entry.privateKey ||
            entry.seedKey ||
            entry.mnemonic ||
            (entry.privateKeyEnc && typeof entry.privateKeyEnc === 'string' && (entry.privateKeyEnc as unknown as string).length > 10) ||
            (entry.seedKeyEnc && typeof entry.seedKeyEnc === 'string' && (entry.seedKeyEnc as unknown as string).length > 10) ||
            (entry.mnemonicEnc && typeof entry.mnemonicEnc === 'string' && (entry.mnemonicEnc as unknown as string).length > 10) ||
            (entry.walletType === 'hardware' && entry.address && entry.publicKey)
          );
        });
        if (hasWallet) {
          document.body.replaceChildren(
            elem('div', { style: 'display:flex;align-items:center;justify-content:center;height:100vh;color:var(--text-secondary)' },
              elem('p', null, 'Wallet already configured. You can close this tab.'))
          );
          return;
        }
      }
    }

    setupListeners();
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local' || !changes || !changes[C.SETTINGS_KEY]) return;
      applyThemeFromSettings(changes[C.SETTINGS_KEY].newValue || C.DEFAULT_SETTINGS);
    });
    goToStep(1);
  }

  init();
})();
