// Processing animation view with user-facing stages.
const STAGES = [
    "Building the Cipher",
    "Marking the Frame",
    "Setting the Weight",
    "Sealing the Record",
    "Cipher Complete"
];

export function renderProcessingView() {
    return `
        <div class="total-loss-v2-scope">
            <div class="cipher-plate elevation-2 cipher-processing" data-stage="0">
                <div class="rivet tl"></div><div class="rivet tr"></div>
                <div class="rivet bl"></div><div class="rivet br"></div>

                <h2 class="cipher-section-title cp-title">${STAGES[0]}</h2>

                <ol class="cp-stages">
                    ${STAGES.map((label, index) => `
                        <li class="cipher-plate-sm cp-stage" data-stage-index="${index}">
                            <span class="cp-stage-indicator"></span>
                            <span class="cipher-body cp-stage-label">${label}</span>
                        </li>
                    `).join("")}
                </ol>
            </div>
        </div>
    `;
}

export function updateStage(stageIndex) {
    const container = document.querySelector(".cipher-processing");
    if (!container) return;

    const nextIndex = Math.max(0, Math.min(stageIndex, STAGES.length - 1));
    container.dataset.stage = String(nextIndex);

    const title = container.querySelector("h2");
    if (title) {
        title.textContent = STAGES[nextIndex];
    }

    const stages = container.querySelectorAll(".cp-stage");
    stages.forEach((stage, index) => {
        if (index < nextIndex) {
            stage.classList.add("is-completed");
            stage.classList.remove("is-active");
            return;
        }

        if (index === nextIndex) {
            stage.classList.add("is-active");
            stage.classList.remove("is-completed");
            return;
        }

        stage.classList.remove("is-active", "is-completed");
    });
}
