(function() {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('requestId');

  const elements = {
    originValue: document.getElementById('originValue'),
    addressValue: document.getElementById('addressValue'),
    networkValue: document.getElementById('networkValue'),
    messageValue: document.getElementById('messageValue'),
    pinBlock: document.getElementById('pinBlock'),
    pinInput: document.getElementById('pinInput'),
    errorText: document.getElementById('errorText'),
    rejectBtn: document.getElementById('rejectBtn'),
    acceptBtn: document.getElementById('acceptBtn')
  };

  let pinRequired = false;

  async function init() {
    if (!requestId) {
      elements.errorText.textContent = 'Missing request id.';
      elements.acceptBtn.disabled = true;
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'GET_SIGN_REQUEST',
      requestId
    });

    if (!response || !response.success || !response.request) {
      elements.errorText.textContent = response?.error || 'Request expired.';
      elements.acceptBtn.disabled = true;
      return;
    }

    const request = response.request;
    pinRequired = !!response.pinRequired;

    elements.originValue.textContent = request.origin || '--';
    elements.addressValue.textContent = request.address || '--';
    elements.networkValue.textContent = request.network || '--';
    elements.messageValue.textContent = request.message || '--';
    elements.pinBlock.classList.toggle('hidden', !pinRequired);

    elements.rejectBtn.addEventListener('click', handleReject);
    elements.acceptBtn.addEventListener('click', handleAccept);
    if (pinRequired) {
      elements.pinInput.focus();
    }
  }

  async function handleReject() {
    await chrome.runtime.sendMessage({
      type: 'SIGN_REQUEST_DECISION',
      requestId,
      approved: false
    });
    window.close();
  }

  async function handleAccept() {
    elements.errorText.textContent = '';
    const response = await chrome.runtime.sendMessage({
      type: 'SIGN_REQUEST_DECISION',
      requestId,
      approved: true,
      pin: pinRequired ? elements.pinInput.value : ''
    });

    if (response && response.success) {
      window.close();
      return;
    }

    elements.errorText.textContent = response?.error || 'Unable to approve request.';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
