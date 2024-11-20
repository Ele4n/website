// theme.js

// Load saved preferences on page load
document.addEventListener('DOMContentLoaded', function () {
    const savedTheme = localStorage.getItem('selectedTheme');
    const savedBgColor = localStorage.getItem('backgroundColor');

    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }
    if (savedBgColor) {
        document.body.style.backgroundColor = savedBgColor;
    }
});
