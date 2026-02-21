// Processing animation view with user-facing stages.
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
        <div class="tls-processing-counter" id="tlsProcessingCounter" role="status" aria-live="polite">0%</div>
        <div class="tls-processing-label" id="tlsProcessingLabel">${STAGES[0].toUpperCase()}</div>
        <ol class="tls-processing-steps" id="tlsProcessingSteps">
            ${STAGES.map((label, index) => `
                <li class="tls-processing-step" data-stage-index="${index}">${label.toUpperCase()}</li>
            `).join("")}
        </ol>
        <div class="tls-processing-bar" id="tlsProcessingBar" aria-hidden="true"></div>
    `;
}

export function mountProcessingView() {
    if (document.getElementById("tlsProcessingCounter")) return;

    document.body.classList.add("tls-processing-active");
    document.body.insertAdjacentHTML("beforeend", renderProcessingView());
    setProgress(0, true);
}

export function unmountProcessingView() {
    const ids = ["tlsProcessingCounter", "tlsProcessingLabel", "tlsProcessingSteps", "tlsProcessingBar"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    document.body.classList.remove("tls-processing-active");
}

export function updateStage(stageIndex) {
    const label = document.getElementById("tlsProcessingLabel");
    const steps = document.querySelectorAll(".tls-processing-step");

    if (!label || steps.length === 0) return;

    const nextIndex = Math.max(0, Math.min(stageIndex, STAGES.length - 1));
    const labelText = STAGES[nextIndex].toUpperCase();
    label.textContent = labelText;

    steps.forEach((step, index) => {
        if (index < nextIndex) {
            step.classList.add("is-completed");
            step.classList.remove("is-active");
            return;
        }

        if (index === nextIndex) {
            step.classList.add("is-active");
            step.classList.remove("is-completed");
            return;
        }

        step.classList.remove("is-active", "is-completed");
    });

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
    const counter = document.getElementById("tlsProcessingCounter");
    const bar = document.getElementById("tlsProcessingBar");
    if (!counter || !bar) return;

    counter.textContent = `${value}%`;
    bar.style.setProperty("--tls-progress", `${value}%`);

    if (!immediate) {
        counter.classList.remove("is-flicker");
        void counter.offsetWidth;
        counter.classList.add("is-flicker");
    }
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}
