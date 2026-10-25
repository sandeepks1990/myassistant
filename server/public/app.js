// Initialize Socket.io
const socket = io();

// DOM elements
const connectionDot = document.getElementById('connectionDot');
const connectionStatus = document.getElementById('connectionStatus');
const activityBadge = document.getElementById('activityBadge');
const roomInput = document.getElementById('roomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const fontUpBtn = document.getElementById('fontUpBtn');
const fontDownBtn = document.getElementById('fontDownBtn');
const clearBtn = document.getElementById('clearBtn');
const fullScreenBtn = document.getElementById('fullScreenBtn');
const contentContainer = document.getElementById('contentContainer');
const emptyState = document.getElementById('emptyState');
const answersList = document.getElementById('answersList');
const scrollFab = document.getElementById('scrollFab');

// Read room from URL query param if present (e.g. ?room=interview)
const urlParams = new URLSearchParams(window.location.search);
let currentRoom = urlParams.get('room') || localStorage.getItem('last_room') || 'default';
roomInput.value = currentRoom;

// Font sizing state
let currentFontSize = parseInt(localStorage.getItem('viewer_font_size') || '18', 10);
document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);

// Marked.js options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Helper: Custom code block enhancement with syntax highlighting and copy button
function enhanceCodeBlocks(container) {
  const codeBlocks = container.querySelectorAll('pre code');
  codeBlocks.forEach((codeEl) => {
    hljs.highlightElement(codeEl);

    const pre = codeEl.parentElement;
    if (pre.parentElement.classList.contains('code-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';

    const header = document.createElement('div');
    header.className = 'code-header';

    // Try detecting language from class
    let lang = 'CODE';
    codeEl.classList.forEach((cls) => {
      if (cls.startsWith('language-')) {
        lang = cls.replace('language-', '').toUpperCase();
      }
    });

    const langSpan = document.createElement('span');
    langSpan.textContent = lang;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(codeEl.innerText).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800);
      });
    });

    header.appendChild(langSpan);
    header.appendChild(copyBtn);

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}

// Function to render an answer card
function renderAnswerCard(item) {
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  const card = document.createElement('div');
  card.className = 'qa-card';
  card.id = `card-${item.id}`;

  const questionText = item.question ? item.question.trim() : 'Captured Question';
  const timestamp = item.timestamp || new Date().toLocaleTimeString();

  // Render markdown for answer
  const parsedMarkdown = marked.parse(item.answer || '');

  card.innerHTML = `
    <div class="qa-question-box">
      <div class="qa-meta">
        <span>Question Captured</span>
        <span>${timestamp}</span>
      </div>
      <div class="qa-question-text">${escapeHtml(questionText)}</div>
    </div>
    <div class="qa-answer-box">
      ${parsedMarkdown}
    </div>
  `;

  enhanceCodeBlocks(card);
  answersList.appendChild(card);

  // Auto-scroll to bottom
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.innerText = string;
  return div.innerHTML;
}

// Socket Connection Events
socket.on('connect', () => {
  connectionDot.classList.add('connected');
  connectionStatus.textContent = 'Connected';
  activityBadge.textContent = 'Ready';
  activityBadge.className = 'activity-badge ready';

  // Join designated room
  socket.emit('join-room', { room: currentRoom, role: 'viewer' });
});

socket.on('disconnect', () => {
  connectionDot.classList.remove('connected');
  connectionStatus.textContent = 'Disconnected';
  activityBadge.textContent = 'Offline';
  activityBadge.className = 'activity-badge';
});

// Receive full room history on join
socket.on('room-joined', ({ room, history }) => {
  currentRoom = room;
  roomInput.value = room;
  localStorage.setItem('last_room', room);

  answersList.innerHTML = '';
  if (history && history.length > 0) {
    emptyState.style.display = 'none';
    history.forEach(item => renderAnswerCard(item));
  } else {
    emptyState.style.display = 'flex';
  }
});

// Real-time new answer received (No refresh!)
socket.on('new-answer', (payload) => {
  renderAnswerCard(payload);
  activityBadge.textContent = 'Answer Ready';
  activityBadge.className = 'activity-badge ready';
});

// Real-time status update from Electron (e.g. "Recording audio...", "Generating...")
socket.on('status-update', ({ status, text }) => {
  if (text) {
    activityBadge.textContent = text;
    if (status === 'processing') {
      activityBadge.className = 'activity-badge processing';
    } else if (status === 'ready') {
      activityBadge.className = 'activity-badge ready';
    } else {
      activityBadge.className = 'activity-badge';
    }
  }
});

// Clear screen event
socket.on('screen-cleared', () => {
  answersList.innerHTML = '';
  emptyState.style.display = 'flex';
});

// UI Event Handlers
joinRoomBtn.addEventListener('click', () => {
  const newRoom = roomInput.value.trim().toLowerCase() || 'default';
  currentRoom = newRoom;
  localStorage.setItem('last_room', newRoom);
  socket.emit('join-room', { room: newRoom, role: 'viewer' });
});

roomInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    joinRoomBtn.click();
  }
});

// Font size controls
fontUpBtn.addEventListener('click', () => {
  if (currentFontSize < 36) {
    currentFontSize += 2;
    document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
    localStorage.setItem('viewer_font_size', currentFontSize);
  }
});

fontDownBtn.addEventListener('click', () => {
  if (currentFontSize > 12) {
    currentFontSize -= 2;
    document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
    localStorage.setItem('viewer_font_size', currentFontSize);
  }
});

// Clear screen button
clearBtn.addEventListener('click', () => {
  if (confirm('Clear all answers from the screen?')) {
    socket.emit('clear-screen', { room: currentRoom });
  }
});

// Fullscreen toggle
fullScreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => console.log(err));
  } else {
    document.exitFullscreen().catch(err => console.log(err));
  }
});

// Scroll detection for "New Answer Below" button
window.addEventListener('scroll', () => {
  const isNearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 120);
  if (isNearBottom) {
    scrollFab.classList.add('hidden');
  }
});

scrollFab.addEventListener('click', () => {
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
  scrollFab.classList.add('hidden');
});
