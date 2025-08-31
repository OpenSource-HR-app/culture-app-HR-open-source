// Function to load navbar
async function loadNavbar() {
    try {
        const response = await fetch('/navbar.html');
        const html = await response.text();
        
        // Insert the navbar at the start of the body
        document.body.insertAdjacentHTML('afterbegin', html);
        
        // After navbar is loaded, display user info, check for incomplete surveys, and load settings
        await Promise.all([
            displayUserInfo(),
            checkIncompleteSurveys(),
            loadSettings()
        ]);
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Add displayUserInfo function
async function displayUserInfo() {
    try {
        const response = await fetch('/api/employee/profile');
        const profile = await response.json();
        
        const nameElement = document.getElementById('employeeName');
        nameElement.textContent = profile.name || profile.email;
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');

    // Close the dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.nav-profile')) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// Add CSS for dropdown visibility
const style = document.createElement('style');
style.textContent = `
    .profile-dropdown {
        display: none;
        position: absolute;
        right: 0;
        top: 100%;
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 1000;
    }

    .profile-dropdown.show {
        display: block;
    }
`;
document.head.appendChild(style);

function logout() {
    fetch('/api/logout', {
        method: 'POST'
    }).then(() => {
        window.location.href = '/index.html';
    }).catch(error => {
        console.error('Logout error:', error);
        window.location.href = '/index.html';
    });
}

// Add this function to check for incomplete surveys
async function checkIncompleteSurveys() {
    try {
        // Fetch surveys
        const surveysResponse = await fetch('/api/surveys');
        if (!surveysResponse.ok) throw new Error('Failed to fetch surveys');
        const surveys = await surveysResponse.json();

        // Fetch responses
        const responsesResponse = await fetch('/api/responses');
        if (!responsesResponse.ok) throw new Error('Failed to fetch responses');
        const responses = await responsesResponse.json();

        // Get current quarter info
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const currentYear = now.getFullYear();

        // Filter responses to current quarter
        const currentQuarterResponses = responses.filter(response => {
            const responseDate = new Date(response.timestamp);
            const responseQuarter = Math.floor(responseDate.getMonth() / 3);
            const responseYear = responseDate.getFullYear();
            return (responseQuarter === currentQuarter && responseYear === currentYear);
        });

        // Create map of completed surveys
        const completedSurveyIds = new Set(
            currentQuarterResponses.map(response => response.surveyId)
        );

        // Check if there are any incomplete surveys
        const hasIncompleteSurveys = surveys.some(survey => !completedSurveyIds.has(survey._id));

        // Show/hide notification dot
        const notificationDot = document.getElementById('surveysNotification');
        if (notificationDot) {
            notificationDot.style.display = hasIncompleteSurveys ? 'block' : 'none';
        }

    } catch (error) {
        console.error('Error checking incomplete surveys:', error);
    }
}

// Load settings and update navbar
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const settings = await response.json();
            
            // Update navbar logo
            if (settings.logoUrl) {
                const navbarLogo = document.getElementById('navbarLogo');
                if (navbarLogo) {
                    navbarLogo.src = settings.logoUrl;
                }
            }
            
            // Hide disabled navigation tabs
            if (settings.features?.surveys === false) {
                const surveysTab = document.querySelector('a[href="/surveys.html"]');
                if (surveysTab) {
                    surveysTab.style.display = 'none';
                }
            }
            
            if (settings.features?.courses === false) {
                const coursesTab = document.querySelector('a[href="/courses.html"]');
                if (coursesTab) {
                    coursesTab.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Load navbar when the document loads
document.addEventListener('DOMContentLoaded', loadNavbar); 