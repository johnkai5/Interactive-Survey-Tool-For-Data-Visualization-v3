/* Detect device appearance and apply selected theme */

(() => {
    const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Get saved preference or default to system
    function getThemePreference() {
        try {
            const savedTheme = localStorage.getItem('theme');

            if (savedTheme === 'light' || savedTheme === 'dark') {
                return savedTheme;
            }
        }  catch (error) {
            // Use system preference if storage is unavailable
        }
        return 'system';
    }
    //Apply either the manual preference or device appearance
    function applyTheme() {
        const preference = getThemePreference();

        const theme = preference === 'system'
            ? (deviceTheme.matches ? 'dark' : 'light')
            : preference;
        document.documentElement.setAttribute('data-theme', theme);
    }
    // Save the user manual selection
    function saveThemePreference(preference) {
        try {
            if (preference === 'system') {
                localStorage.removeItem('theme');
            } else if (preference === 'light' || preference === 'dark') {
                localStorage.setItem('theme', preference);
            }
        } catch (error) {
            // storage may not be available
        }
        applyTheme();
    }
    // Connect the appearance dropdown when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            // Show the user's currently selected preference
            themeSelector.value = getThemePreference();

            // Save changes when user select a new option
            themeSelector.addEventListener('change', () => {
                saveThemePreference(themeSelector.value);
            });
        }
    });
    // Apply appearance when page loads
    applyTheme();

    //Follow device changes unless manual overide
    deviceTheme.addEventListener('change', applyTheme);
})();
