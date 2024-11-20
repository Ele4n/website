// Check local storage for dark mode preference
const body = document.body;
const modeToggle = document.getElementById('modeToggle');

// Check local storage when the page loads
if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark-mode');
    if (modeToggle) modeToggle.textContent = 'Switch to Light Mode';
}

// Toggle dark mode and save preference to local storage
if (modeToggle) {
    modeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');

        if (body.classList.contains('dark-mode')) {
            modeToggle.textContent = 'Switch to Light Mode';
            localStorage.setItem('darkMode', 'enabled');
        } else {
            modeToggle.textContent = 'Switch to Dark Mode';
            localStorage.setItem('darkMode', 'disabled');
        }
    });
}
