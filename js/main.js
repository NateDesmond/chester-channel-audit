// ===== MAIN JAVASCRIPT =====

// Storage keys
const STORAGE_KEY = 'chester-audit-progress';

// Progress data structure
let progressData = {
  missions: {
    1: false,
    2: false,
    3: false,
    4: false
  },
  tracking: {
    thumbnail: { before: '', after: '', video: '' },
    title: { before: '', after: '', video: '' },
    hook: { before: '', after: '', video: '' }
  },
  badges: {
    subs100: false,
    ctr5: false,
    avd50: false,
    complete: false
  }
};

// Load progress from localStorage
function loadProgress() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      progressData = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  }
}

// Save progress to localStorage
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
  updateProgressUI();
}

// Calculate completion percentage
function calculateProgress() {
  const missionCount = Object.values(progressData.missions).filter(Boolean).length;
  return Math.round((missionCount / 4) * 100);
}

// Update progress UI elements
function updateProgressUI() {
  const progress = calculateProgress();

  // Update nav progress bar
  const navFill = document.querySelector('.nav-progress-fill');
  const navText = document.querySelector('.nav-progress-text');
  if (navFill) navFill.style.width = progress + '%';
  if (navText) navText.textContent = progress + '%';

  // Update main progress bar (on action plan page)
  const mainFill = document.querySelector('.progress-bar-fill');
  const mainText = document.querySelector('.progress-message');
  if (mainFill) mainFill.style.width = progress + '%';
  if (mainText) {
    const messages = {
      0: "Ready to start! 🎣",
      25: "You're on your way! Keep going! 🎣",
      50: "Halfway there! You've got this! 💪",
      75: "So close! Almost a pro! 🌟",
      100: "CHAMPION! You did it! 🏆"
    };
    const key = Math.floor(progress / 25) * 25;
    mainText.textContent = messages[key] || messages[0];
  }

  // Trigger confetti at 100%
  if (progress === 100 && !progressData.badges.complete) {
    progressData.badges.complete = true;
    saveProgress();
    triggerConfetti();
  }

  // Update badges
  updateBadges();
}

// Update badge display
function updateBadges() {
  document.querySelectorAll('.badge-card').forEach(badge => {
    const badgeId = badge.dataset.badge;
    if (badgeId && progressData.badges[badgeId]) {
      badge.classList.add('earned');
    }
  });
}

// Animated counter
function animateCounter(element, target, duration = 1000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easeOut);
    element.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// Intersection Observer for scroll animations
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');

        // Animate counters
        if (entry.target.classList.contains('metric-value')) {
          const target = parseInt(entry.target.dataset.value, 10);
          if (target) {
            animateCounter(entry.target, target);
          }
        }

        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll, .metric-value').forEach(el => {
    observer.observe(el);
  });
}

// Video card expand/collapse
function setupVideoCards() {
  document.querySelectorAll('.video-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.video-card');
      card.classList.toggle('expanded');
    });
  });
}

// Mission checkboxes
function setupMissionCheckboxes() {
  document.querySelectorAll('.mission-checkbox').forEach(checkbox => {
    const missionId = checkbox.dataset.mission;

    // Set initial state
    checkbox.checked = progressData.missions[missionId] || false;

    checkbox.addEventListener('change', () => {
      progressData.missions[missionId] = checkbox.checked;
      saveProgress();
    });
  });
}

// Tracking table inputs
function setupTrackingInputs() {
  document.querySelectorAll('.tracking-input').forEach(input => {
    const row = input.dataset.row;
    const field = input.dataset.field;

    // Set initial value
    if (progressData.tracking[row] && progressData.tracking[row][field]) {
      input.value = progressData.tracking[row][field];
    }

    input.addEventListener('change', () => {
      if (!progressData.tracking[row]) {
        progressData.tracking[row] = {};
      }
      progressData.tracking[row][field] = input.value;
      saveProgress();
      updateResultIcon(row);
    });
  });
}

// Update result icon based on before/after values
function updateResultIcon(row) {
  const resultEl = document.querySelector(`.result-icon[data-row="${row}"]`);
  if (!resultEl) return;

  const before = parseFloat(progressData.tracking[row]?.before) || 0;
  const after = parseFloat(progressData.tracking[row]?.after) || 0;

  if (before && after) {
    resultEl.textContent = after > before ? '📈' : (after < before ? '📉' : '➡️');
  } else {
    resultEl.textContent = '—';
  }
}

// 3-second timer animation
function setupTimer() {
  const timerDisplay = document.querySelector('.timer-display');
  if (!timerDisplay) return;

  let count = 3;

  function tick() {
    timerDisplay.textContent = count;
    timerDisplay.style.transform = 'scale(1.2)';
    setTimeout(() => {
      timerDisplay.style.transform = 'scale(1)';
    }, 200);

    count--;
    if (count >= 0) {
      setTimeout(tick, 1000);
    } else {
      setTimeout(() => {
        timerDisplay.textContent = '⏱️';
        setTimeout(() => {
          count = 3;
          tick();
        }, 2000);
      }, 500);
    }
  }

  // Start after a delay
  setTimeout(tick, 1000);
}

// Confetti effect
function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#F6AE2D', '#4CAF50', '#2E86AB', '#1B4D3E', '#FFD166'];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particles.forEach(p => {
      if (p.y < canvas.height + 50) {
        activeParticles++;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vy += 0.1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (activeParticles > 0) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  animate();
}

// Set active nav link
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  updateProgressUI();
  setActiveNavLink();
  setupScrollAnimations();
  setupVideoCards();
  setupMissionCheckboxes();
  setupTrackingInputs();
  setupTimer();

  // Initialize all result icons
  ['thumbnail', 'title', 'hook'].forEach(updateResultIcon);
});

// Handle window resize for confetti
window.addEventListener('resize', () => {
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});
