// DOM Elements
const serverUrlInput = document.getElementById('serverUrlInput');
const roomInput = document.getElementById('roomInput');
const copyViewerUrlBtn = document.getElementById('copyViewerUrlBtn');
const connectServerBtn = document.getElementById('connectServerBtn');

const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
const modelSelect = document.getElementById('modelSelect');
const systemPromptInput = document.getElementById('systemPromptInput');

const presetInterview = document.getElementById('presetInterview');
const presetCoding = document.getElementById('presetCoding');
const presetSystemDesign = document.getElementById('presetSystemDesign');

const audioSourceSelect = document.getElementById('audioSourceSelect');
const toggleAudioCaptureBtn = document.getElementById('toggleAudioCaptureBtn');
const audioMeterFill = document.getElementById('audioMeterFill');
const audioLevelText = document.getElementById('audioLevelText');

const serverStatusDot = document.getElementById('serverStatusDot');
const serverStatusText = document.getElementById('serverStatusText');
const audioStatusDot = document.getElementById('audioStatusDot');
const audioStatusText = document.getElementById('audioStatusText');

const recordingHeading = document.getElementById('recordingHeading');
const recordingSubtext = document.getElementById('recordingSubtext');
const manualRecordBtn = document.getElementById('manualRecordBtn');
const manualRecordText = document.getElementById('manualRecordText');

const manualQuestionInput = document.getElementById('manualQuestionInput');
const sendManualQuestionBtn = document.getElementById('sendManualQuestionBtn');

const liveStatusAlert = document.getElementById('liveStatusAlert');
const liveStatusAlertText = document.getElementById('liveStatusAlertText');

const feedList = document.getElementById('feedList');
const feedEmpty = document.getElementById('feedEmpty');
const clearAllBtn = document.getElementById('clearAllBtn');

// System Prompt Presets
const PRESETS = {
  interview: `You are an expert Principal Software Engineer assisting in a live technical interview.
When answering questions:
1. Provide direct, highly accurate, authoritative answers without filler or pleasantries.
2. For coding questions: state the optimal approach, provide clean, idiomatic code with brief inline comments, and state Time & Space complexity.
3. For system design or architecture questions: outline the core components, data flow, key trade-offs, and scalability bottlenecks.
4. Keep explanations structured with markdown bullet points and clear sections.`,

  coding: `You are a competitive programming specialist.
Focus on solving algorithmic and data structure problems with maximum efficiency.
Always provide:
1. Optimal Algorithm & Data Structure selection.
2. Big-O Time and Space Complexity.
3. Production-quality, bug-free, clean code.
4. Edge cases to test (nulls, empty inputs, large bounds).`,

  systemDesign: `You are a Senior System Design Architect.
Structure every design answer systematically:
1. Clarifying assumptions, capacity estimations (traffic, storage).
2. High-level architecture (APIs, Load Balancers, Services, Databases, Caches).
3. Data storage schema & database choice (SQL vs NoSQL).
4. Deep dive into scalability, reliability, caching strategies, and partition tolerance.`
};

// State Variables
let socket = null;
let isConnectedToServer = false;
let activeAudioStream = null;
let audioContext = null;
let analyserNode = null;
let meterAnimationId = null;

let mediaRecorder = null;
let recordedAudioChunks = [];
let isRecordingQuestion = false;

// Initialize Saved Settings
function loadSavedSettings() {
  serverUrlInput.value = localStorage.getItem('cfg_server_url') || 'http://localhost:3000';
  roomInput.value = localStorage.getItem('cfg_room_code') || 'interview-room-1';
  geminiApiKeyInput.value = localStorage.getItem('cfg_gemini_key') || '';
  modelSelect.value = localStorage.getItem('cfg_gemini_model') || 'gemini-2.5-flash';
  systemPromptInput.value = localStorage.getItem('cfg_system_prompt') || PRESETS.interview;
  audioSourceSelect.value = localStorage.getItem('cfg_audio_source') || 'speaker';
}

function saveSettings() {
  localStorage.setItem('cfg_server_url', serverUrlInput.value.trim());
  localStorage.setItem('cfg_room_code', roomInput.value.trim());
  localStorage.setItem('cfg_gemini_key', geminiApiKeyInput.value.trim());
  localStorage.setItem('cfg_gemini_model', modelSelect.value);
  localStorage.setItem('cfg_system_prompt', systemPromptInput.value.trim());
  localStorage.setItem('cfg_audio_source', audioSourceSelect.value);
}

// Preset Handlers
presetInterview.addEventListener('click', () => {
  systemPromptInput.value = PRESETS.interview;
  saveSettings();
});
presetCoding.addEventListener('click', () => {
  systemPromptInput.value = PRESETS.coding;
  saveSettings();
});
presetSystemDesign.addEventListener('click', () => {
  systemPromptInput.value = PRESETS.systemDesign;
  saveSettings();
});

// Toggle Show/Hide API Key
toggleApiKeyBtn.addEventListener('click', () => {
  if (geminiApiKeyInput.type === 'password') {
    geminiApiKeyInput.type = 'text';
    toggleApiKeyBtn.textContent = '🔒';
  } else {
    geminiApiKeyInput.type = 'password';
    toggleApiKeyBtn.textContent = '👁️';
  }
});

// Copy Web Viewer URL for PC 2
copyViewerUrlBtn.addEventListener('click', () => {
  const baseUrl = serverUrlInput.value.trim().replace(/\/+$/, '');
  const room = roomInput.value.trim() || 'default';
  const fullUrl = `${baseUrl}/?room=${encodeURIComponent(room)}`;

  navigator.clipboard.writeText(fullUrl).then(() => {
    const originalText = copyViewerUrlBtn.textContent;
    copyViewerUrlBtn.textContent = '✅ Copied!';
    setTimeout(() => { copyViewerUrlBtn.textContent = originalText; }, 2000);
  });
});

// Socket.io Connection to Render Server
function connectToRenderServer() {
  saveSettings();
  const serverUrl = serverUrlInput.value.trim();
  const room = roomInput.value.trim() || 'default';

  if (!serverUrl) {
    alert('Please enter your Render Server URL.');
    return;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  serverStatusText.textContent = 'Render: Connecting...';
  serverStatusDot.className = 'status-dot warning';

  try {
    // If io is loaded from socket.io-client
    const ioClient = window.io || io;
    socket = ioClient(serverUrl, {
      reconnectionAttempts: 10,
      timeout: 10000
    });

    socket.on('connect', () => {
      isConnectedToServer = true;
      serverStatusText.textContent = `Render: Connected (${room})`;
      serverStatusDot.className = 'status-dot success';
      connectServerBtn.textContent = 'Disconnect Server';
      connectServerBtn.classList.remove('btn-primary');
      connectServerBtn.classList.add('btn-secondary');

      socket.emit('join-room', { room, role: 'electron' });
    });

    socket.on('disconnect', () => {
      isConnectedToServer = false;
      serverStatusText.textContent = 'Render: Disconnected';
      serverStatusDot.className = 'status-dot';
      connectServerBtn.textContent = 'Connect to Server';
      connectServerBtn.classList.add('btn-primary');
      connectServerBtn.classList.remove('btn-secondary');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err);
      serverStatusText.textContent = 'Render: Connect Error';
      serverStatusDot.className = 'status-dot';
    });
  } catch (error) {
    console.error('Failed to initialize socket:', error);
    alert('Could not initialize connection: ' + error.message);
  }
}

connectServerBtn.addEventListener('click', () => {
  if (isConnectedToServer && socket) {
    socket.disconnect();
  } else {
    connectToRenderServer();
  }
});

// Send Realtime Status to Server
function emitStatus(status, text) {
  if (socket && isConnectedToServer) {
    const room = roomInput.value.trim() || 'default';
    socket.emit('status-update', { room, status, text });
  }
}

// -------------------------------------------------------------
// AUDIO CAPTURE ENGINE (Speaker Output & Microphone)
// -------------------------------------------------------------

async function startAudioCapture() {
  saveSettings();
  const sourceType = audioSourceSelect.value;

  try {
    let finalStream = null;

    if (sourceType === 'speaker' || sourceType === 'both') {
      // Loopback audio capture from system speaker output
      // In Electron with session loopback configured in main.js
      const desktopStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop'
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            minWidth: 16,
            maxWidth: 16,
            minHeight: 16,
            maxHeight: 16
          }
        }
      });

      // Keep only the audio tracks from desktop capturer
      const speakerAudioTracks = desktopStream.getAudioTracks();
      // Stop dummy video tracks
      desktopStream.getVideoTracks().forEach(track => track.stop());

      if (speakerAudioTracks.length === 0) {
        throw new Error('No system speaker audio tracks found. Make sure audio is playing.');
      }

      if (sourceType === 'speaker') {
        finalStream = new MediaStream(speakerAudioTracks);
      } else {
        // Source is BOTH: Mix speaker audio + microphone
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const speakerSourceNode = audioCtx.createMediaStreamSource(new MediaStream(speakerAudioTracks));
        const micSourceNode = audioCtx.createMediaStreamSource(micStream);
        const destination = audioCtx.createMediaStreamDestination();

        speakerSourceNode.connect(destination);
        micSourceNode.connect(destination);
        finalStream = destination.stream;
      }
    } else {
      // Microphone Only
      finalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    activeAudioStream = finalStream;

    // Setup visualizer & VU meter
    setupAudioMeter(activeAudioStream);

    // Update UI states
    audioStatusText.textContent = `Audio: Active (${sourceType.toUpperCase()})`;
    audioStatusDot.className = 'status-dot success';
    toggleAudioCaptureBtn.textContent = '⏹ Stop Audio Listener';
    toggleAudioCaptureBtn.classList.add('btn-secondary');

    manualRecordBtn.disabled = false;
    recordingHeading.textContent = 'Audio Listener Ready';
    recordingSubtext.textContent = 'Audio stream active. Click "Record Question" when interviewer speaks.';

  } catch (error) {
    console.error('Failed to start audio stream:', error);
    alert('Audio capture failed: ' + error.message + '\n\nTip: On Windows, make sure sound is enabled and your microphone/speaker is active.');
    stopAudioCapture();
  }
}

function stopAudioCapture() {
  if (isRecordingQuestion) {
    stopRecordingQuestion();
  }

  if (activeAudioStream) {
    activeAudioStream.getTracks().forEach(track => track.stop());
    activeAudioStream = null;
  }

  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  if (meterAnimationId) {
    cancelAnimationFrame(meterAnimationId);
    meterAnimationId = null;
  }

  audioMeterFill.style.width = '0%';
  audioLevelText.textContent = '0%';

  audioStatusText.textContent = 'Audio: Inactive';
  audioStatusDot.className = 'status-dot warning';
  toggleAudioCaptureBtn.textContent = '▶ Start Audio Listener';
  toggleAudioCaptureBtn.classList.remove('btn-secondary');

  manualRecordBtn.disabled = true;
  recordingHeading.textContent = 'Standby / Audio Listener Idle';
  recordingSubtext.textContent = 'Click "Start Audio Listener" or enter a question manually.';
}

toggleAudioCaptureBtn.addEventListener('click', () => {
  if (activeAudioStream) {
    stopAudioCapture();
  } else {
    startAudioCapture();
  }
});

// Audio Visualizer Meter
function setupAudioMeter(stream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyserNode);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    function updateMeter() {
      if (!analyserNode) return;
      analyserNode.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const percentage = Math.min(100, Math.round((average / 128) * 100));

      audioMeterFill.style.width = `${percentage}%`;
      audioLevelText.textContent = `${percentage}%`;

      meterAnimationId = requestAnimationFrame(updateMeter);
    }

    updateMeter();
  } catch (e) {
    console.error('Audio meter setup error:', e);
  }
}

// -------------------------------------------------------------
// QUESTION RECORDING & GEMINI PROCESSING
// -------------------------------------------------------------

function startRecordingQuestion() {
  if (!activeAudioStream) {
    alert('Please start the audio listener first.');
    return;
  }

  recordedAudioChunks = [];
  try {
    // Choose preferred mimeType supported by browser
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = '';
    }

    mediaRecorder = new MediaRecorder(activeAudioStream, mimeType ? { mimeType } : {});

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedAudioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(recordedAudioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      await processAudioWithGemini(audioBlob);
    };

    mediaRecorder.start(200); // 200ms chunk slices
    isRecordingQuestion = true;

    manualRecordBtn.classList.add('recording');
    manualRecordText.textContent = 'Stop & Ask Gemini';
    recordingHeading.textContent = '🔴 Listening to Question...';
    recordingSubtext.textContent = 'Recording active speaker sound. Click again to generate answer.';

    emitStatus('processing', 'Listening to question audio...');
  } catch (err) {
    console.error('Failed to start MediaRecorder:', err);
    alert('Could not start recording: ' + err.message);
  }
}

function stopRecordingQuestion() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecordingQuestion = false;

  manualRecordBtn.classList.remove('recording');
  manualRecordText.textContent = 'Record Question (Push)';
  recordingHeading.textContent = 'Processing Question...';
  recordingSubtext.textContent = 'Sending audio to Gemini for transcription and answer.';
}

manualRecordBtn.addEventListener('click', () => {
  if (isRecordingQuestion) {
    stopRecordingQuestion();
  } else {
    startRecordingQuestion();
  }
});

// Convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Process Audio via Gemini Multimodal API
async function processAudioWithGemini(audioBlob) {
  saveSettings();
  const apiKey = geminiApiKeyInput.value.trim();
  const model = modelSelect.value || 'gemini-2.5-flash';
  const systemPrompt = systemPromptInput.value.trim();

  if (!apiKey) {
    alert('Please enter your Gemini API Key in the settings panel.');
    recordingHeading.textContent = 'Audio Listener Ready';
    recordingSubtext.textContent = 'Enter API key to enable Gemini processing.';
    return;
  }

  showStatusAlert('Transcribing audio and asking Gemini...');
  emitStatus('processing', 'Gemini is analyzing question audio & preparing answer...');

  try {
    const base64Audio = await blobToBase64(audioBlob);
    const mimeType = audioBlob.type || 'audio/webm';

    // Direct Gemini REST API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Audio
              }
            },
            {
              text: `You are listening to an audio recording from an active speaker in an interview or technical discussion.
Task:
1. Carefully transcribe the question or problem being asked.
2. Provide a thorough, direct, and well-structured answer following the system instructions.

Format your response strictly using this structure:
### QUESTION
<exact transcribed question here>

### ANSWER
<your complete, detailed answer here in clean markdown>`
            }
          ]
        }
      ],
      system_instruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!candidateText) {
      throw new Error('No answer text returned by Gemini.');
    }

    // Parse Question and Answer from response
    let extractedQuestion = 'Captured Audio Question';
    let extractedAnswer = candidateText;

    if (candidateText.includes('### QUESTION') && candidateText.includes('### ANSWER')) {
      const parts = candidateText.split('### ANSWER');
      extractedQuestion = parts[0].replace('### QUESTION', '').trim();
      extractedAnswer = parts[1].trim();
    }

    dispatchAnswer(extractedQuestion, extractedAnswer);

  } catch (error) {
    console.error('Gemini error:', error);
    alert('Gemini Processing Error: ' + error.message);
    emitStatus('ready', 'Error occurred during processing');
  } finally {
    hideStatusAlert();
    recordingHeading.textContent = 'Audio Listener Ready';
    recordingSubtext.textContent = 'Ready for the next question.';
  }
}

// Process Text Question (Manual box)
async function processTextQuestion(questionText) {
  saveSettings();
  const apiKey = geminiApiKeyInput.value.trim();
  const model = modelSelect.value || 'gemini-2.5-flash';
  const systemPrompt = systemPromptInput.value.trim();

  if (!apiKey) {
    alert('Please enter your Gemini API Key in the settings panel.');
    return;
  }

  showStatusAlert('Querying Gemini...');
  emitStatus('processing', 'Gemini generating answer...');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: questionText }]
        }
      ],
      system_instruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    dispatchAnswer(questionText, answer);

  } catch (error) {
    console.error('Gemini text error:', error);
    alert('Gemini Error: ' + error.message);
  } finally {
    hideStatusAlert();
  }
}

sendManualQuestionBtn.addEventListener('click', () => {
  const text = manualQuestionInput.value.trim();
  if (text) {
    manualQuestionInput.value = '';
    processTextQuestion(text);
  }
});

manualQuestionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendManualQuestionBtn.click();
  }
});

// Dispatch complete answer to both local feed & Render website
function dispatchAnswer(question, answer) {
  const timestamp = new Date().toLocaleTimeString();
  const room = roomInput.value.trim() || 'default';
  const id = Date.now().toString();

  const payload = { id, question, answer, timestamp, room };

  // 1. Send via WebSocket to Render Server
  if (socket && isConnectedToServer) {
    socket.emit('send-answer', payload);
  } else {
    // Fallback: REST endpoint if WebSocket disconnected
    const baseUrl = serverUrlInput.value.trim().replace(/\/+$/, '');
    fetch(`${baseUrl}/api/push-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error('REST fallback error:', err));
  }

  // 2. Render locally in Electron preview
  addLocalFeedItem(payload);
  emitStatus('ready', 'Answer sent to display website');
}

// Local Feed Render
function addLocalFeedItem(item) {
  if (feedEmpty) {
    feedEmpty.style.display = 'none';
  }

  const div = document.createElement('div');
  div.className = 'feed-item';
  div.innerHTML = `
    <div class="feed-item-header">
      <span>Sent to Render (${item.timestamp})</span>
      <span>${roomInput.value}</span>
    </div>
    <div class="feed-item-question">Q: ${escapeHtml(item.question)}</div>
    <div class="feed-item-answer">${escapeHtml(item.answer)}</div>
  `;

  feedList.prepend(div);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

function showStatusAlert(msg) {
  liveStatusAlertText.textContent = msg;
  liveStatusAlert.classList.remove('hidden');
}

function hideStatusAlert() {
  liveStatusAlert.classList.add('hidden');
}

// Clear All
clearAllBtn.addEventListener('click', () => {
  feedList.innerHTML = '';
  if (feedEmpty) feedEmpty.style.display = 'block';

  if (socket && isConnectedToServer) {
    const room = roomInput.value.trim() || 'default';
    socket.emit('clear-screen', { room });
  }
});

// Save inputs on change
[serverUrlInput, roomInput, geminiApiKeyInput, modelSelect, systemPromptInput, audioSourceSelect].forEach(el => {
  el.addEventListener('change', saveSettings);
});

// Global Keyboard Shortcut: Space or Ctrl+Space to toggle recording when audio active
window.addEventListener('keydown', (e) => {
  // If user is typing in an input or textarea, don't trigger hotkey
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    return;
  }
  if (e.code === 'Space' && activeAudioStream) {
    e.preventDefault();
    manualRecordBtn.click();
  }
});

// Init on load
window.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings();
  // Auto-connect to server if configured
  if (serverUrlInput.value) {
    connectToRenderServer();
  }
});
