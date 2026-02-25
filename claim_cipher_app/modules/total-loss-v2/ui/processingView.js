// Processing animation view — v2.5 fullscreen loader
const STAGES = [
    "Building the Cipher",
    "Marking the Frame",
    "Setting the Weight",
    "Sealing the Record",
    "Cipher Complete"
];

const PROGRESS_TARGETS = [8, 34, 58, 82, 100];

let currentProgress = 0;
let progressRaf = null;

export function renderProcessingView() {
    return `
        <div id="tlsProcessingOverlay">
            <div class="tls-proc-glow"></div>
            <div class="tls-proc-corner tl"></div>
            <div class="tls-proc-corner tr"></div>
            <div class="tls-proc-corner bl"></div>
            <div class="tls-proc-corner br"></div>
            <div class="tls-proc-top-label">Total Loss Studio — Processing Estimate</div>
            <div class="tls-proc-progress-track">
                <div class="tls-proc-progress-fill" id="tlsProgressFill"></div>
            </div>
            <div class="tls-proc-main">
                <div class="tls-proc-counter-wrap">
                    <div class="tls-proc-counter" id="tlsCounter">0</div>
                    <div class="tls-proc-counter-pct">%</div>
                </div>
                <div class="tls-proc-step-label" id="tlsStepLabel">${STAGES[0]}</div>
                <div class="tls-proc-divider"></div>
                <div class="tls-proc-steps" id="tlsStepList">
                    ${STAGES.map((label, i) => `
                    <div class="tls-proc-step" id="tlsStep${i}">
                        <div class="tls-proc-step-dot"></div>
                        <span>${label}</span>
                    </div>`).join('')}
                </div>
                <div class="tls-proc-complete-msg" id="tlsCompleteMsg">— Output Ready —</div>
            </div>
        </div>
    `;
}

export function mountProcessingView() {
    if (document.getElementById("tlsProcessingOverlay")) return;
    document.body.insertAdjacentHTML("beforeend", renderProcessingView());
    setProgress(0, true);
}

export function unmountProcessingView() {
    const overlay = document.getElementById("tlsProcessingOverlay");
    if (overlay) overlay.remove();
}

export function updateStage(stageIndex) {
    const label = document.getElementById("tlsStepLabel");
    if (!label) return;

    const nextIndex = Math.max(0, Math.min(stageIndex, STAGES.length - 1));
    label.textContent = STAGES[nextIndex];

    for (let i = 0; i < STAGES.length; i++) {
        const step = document.getElementById(`tlsStep${i}`);
        if (!step) continue;
        if (i < nextIndex) {
            step.className = 'tls-proc-step done';
        } else if (i === nextIndex) {
            step.className = 'tls-proc-step active';
        } else {
            step.className = 'tls-proc-step';
        }
    }

    const target = PROGRESS_TARGETS[nextIndex] ?? 0;
    setProgress(target, false);
}

function setProgress(target, immediate) {
    if (progressRaf) {
        cancelAnimationFrame(progressRaf);
        progressRaf = null;
    }

    if (immediate) {
        currentProgress = target;
        renderProgress(target, true);
        return;
    }

    const start = currentProgress;
    const delta = target - start;
    const duration = 650;
    const startTime = performance.now();

    const tick = now => {
        const elapsed = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(elapsed);
        const nextValue = Math.round(start + delta * eased);
        currentProgress = nextValue;
        renderProgress(nextValue, false);

        if (elapsed < 1) {
            progressRaf = requestAnimationFrame(tick);
        } else {
            progressRaf = null;
        }
    };

    progressRaf = requestAnimationFrame(tick);
}

function renderProgress(value, immediate) {
    const counter = document.getElementById("tlsCounter");
    const fill = document.getElementById("tlsProgressFill");
    if (!counter || !fill) return;

    counter.textContent = String(value);
    fill.style.width = `${value}%`;

    if (!immediate) {
        counter.classList.remove("tls-proc-flicker");
        void counter.offsetWidth;
        counter.classList.add("tls-proc-flicker");
    }
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}
