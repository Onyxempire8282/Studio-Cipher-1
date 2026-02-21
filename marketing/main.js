// Smooth scroll for anchor links
document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    var target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Volume counter: animate once when in view
(function () {
    var counterEl = document.getElementById('volume-counter');
    if (!counterEl) return;

    var targetValue = 3250;
    var hasRun = false;

    function formatValue(value, done) {
        var formatted = value.toLocaleString();
        return done ? formatted + '+' : formatted;
    }

    function animateCounter() {
        if (hasRun) return;
        hasRun = true;

        var start = 0;
        var duration = 1400;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var current = Math.floor(start + (targetValue - start) * progress);
            counterEl.textContent = formatValue(current, progress === 1);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animateCounter();
                observer.disconnect();
            }
        });
    }, { threshold: 0.4 });

    observer.observe(counterEl);
})();
