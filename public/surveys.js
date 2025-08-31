// Check session status first
async function checkSession() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!response.ok || !data.user) {
            console.error('Session invalid:', data.error);
            window.location.href = '/index.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Session check failed:', error);
        window.location.href = '/index.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) return;

    // Check if surveys are enabled
    try {
        const settingsResponse = await fetch('/api/settings');
        if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            if (settings.features?.surveys === false) {
                window.location.href = '/dashboard.html';
                return;
            }
        }
    } catch (error) {
        console.error('Failed to check settings:', error);
    }

    try {
        // Fetch employee profile for name
        const profileResponse = await fetch('/api/employee/profile');
        const profileData = await profileResponse.json();
        
        // Update employee name in navbar
        const employeeNameElement = document.getElementById('employeeName');
        if (employeeNameElement) {
            employeeNameElement.textContent = profileData.name || profileData.email;
        }

        // If authenticated, fetch surveys
        const surveysResponse = await fetch('/api/surveys');
        if (!surveysResponse.ok) {
            throw new Error('Failed to fetch surveys');
        }
        
        const surveys = await surveysResponse.json();
        await displaySurveys(surveys);

    } catch (error) {
        console.error('Error:', error);
        if (error.message === 'Failed to fetch surveys') {
            window.location.href = '/index.html';
        }
    }
});

async function displaySurveys(surveys) {
    const surveyList = document.getElementById('surveyList');
    surveyList.innerHTML = '';

    if (surveys.length === 0) {
        surveyList.innerHTML = '<p>No surveys available.</p>';
        return;
    }

    try {
        const responsesResponse = await fetch('/api/responses');
        if (!responsesResponse.ok) {
            throw new Error(`Failed to fetch responses: ${responsesResponse.statusText}`);
        }
        const completedResponses = await responsesResponse.json();

        // Get current quarter info
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const currentYear = now.getFullYear();

        // Filter responses to only include those from current quarter
        const currentQuarterResponses = completedResponses.filter(response => {
            const responseDate = new Date(response.timestamp);
            const responseQuarter = Math.floor(responseDate.getMonth() / 3);
            const responseYear = responseDate.getFullYear();
            return (responseQuarter === currentQuarter && responseYear === currentYear);
        });

        // Create map of current quarter responses
        const surveyToResponseMap = new Map(
            currentQuarterResponses.map(response => [response.surveyId, response._id])
        );

        // Sort surveys: incomplete first, then completed
        const sortedSurveys = [...surveys].sort((a, b) => {
            const aCompleted = surveyToResponseMap.has(a._id);
            const bCompleted = surveyToResponseMap.has(b._id);
            return aCompleted - bCompleted;
        });

        // Get quarter name for display
        const quarterNames = ['JFM', 'AMJ', 'JAS', 'OND'];
        const currentQuarterName = quarterNames[currentQuarter];

        sortedSurveys.forEach(survey => {
            const isCompleted = surveyToResponseMap.has(survey._id);
            const responseId = surveyToResponseMap.get(survey._id);
            
            // Calculate estimated time
            const questionCount = survey.questions.length;
            const estimatedSeconds = questionCount * 15;
            const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
            const timeDisplay = `<${estimatedMinutes} mins`;
            
            const surveyElement = document.createElement('div');
            surveyElement.className = 'survey-card';
            
            surveyElement.innerHTML = `
                <div class="survey-info">
                    <h2>${survey.title}</h2>
                    
                    <div class="survey-meta">
                        <span class="time-estimate">
                            <i class="far fa-clock"></i> ${timeDisplay}
                        </span>
                    </div>
                    <p>${survey.description}</p>
                </div>
                ${isCompleted ? 
                    `<button class="completed-button" onclick="window.location.href='/survey.html?id=${survey._id}&responseId=${responseId}'">
                        View Response
                    </button>` : 
                    `<button onclick="window.location.href='/survey.html?id=${survey._id}'">
                        Take Survey
                    </button>`
                }
                ${isCompleted ? 
                    `<div class="completion-tag">Done</div>` : 
                    `<div class="completion-tag" style="background-color: #fff3e0; color: #e65100;">Due for ${currentQuarterName}</div>`
                }
            `;
            
            surveyList.appendChild(surveyElement);
        });
    } catch (error) {
        console.error('Error displaying surveys:', error);
        surveyList.innerHTML = '<p>Error loading surveys. Please try again later.</p>';
    }
}

// Add these utility functions
function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('active');
}

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

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    const trigger = e.target.closest('.profile-trigger');
    
    if (!trigger && dropdown?.classList.contains('active')) {
        dropdown.classList.remove('active');
    }
});