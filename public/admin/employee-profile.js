let employee = null;
let surveys = [];
let responses = [];

async function loadEmployeeProfile() {
    try {
        // Get employee ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const employeeId = urlParams.get('id');
        
        if (!employeeId) {
            throw new Error('No employee ID provided');
        }

        // Fetch all required data in parallel
        const [employeeRes, surveysRes, responsesRes] = await Promise.all([
            fetch(`/api/admin/employees/${employeeId}`),
            fetch('/api/admin/surveys'),
            fetch('/api/admin/responses')
        ]);

        if (!employeeRes.ok || !surveysRes.ok || !responsesRes.ok) {
            throw new Error('Failed to fetch data');
        }

        employee = await employeeRes.json();
        surveys = await surveysRes.json();
        responses = await responsesRes.json();

        // Display sections that don't depend on AI summary
        displayBasicInfo();
        displaySurveyStats();
        displayRecentResponses();

        // Show loading state for AI summary section
        const surveyStatsSection = document.querySelector('.survey-stats');
        const existingSummary = document.querySelector('.employee-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
        
        surveyStatsSection.insertAdjacentHTML('afterend', `
            <div class="profile-section employee-summary">
                <div class="summary-header">
                    <h3>Employee Summary</h3>
                    <button onclick="confirmRefreshSummary()" class="refresh-btn" title="Generate new summary">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="summary-content">
                    <div class="summary-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Generating AI summary... This may take 30-60 seconds</p>
                    </div>
                </div>
            </div>
        `);

        // Generate AI summary independently
        generateAndDisplaySummary();

    } catch (error) {
        console.error('Error loading profile:', error);
        document.querySelector('.profile-content').innerHTML = `
            <div class="error-message">
                <p>Error loading employee profile. Please try again.</p>
                <button onclick="loadEmployeeProfile()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}

function displayBasicInfo() {
    document.getElementById('employeeName').textContent = employee.name;
    document.getElementById('employeeEmail').textContent = employee.email;
    document.getElementById('employeeTeam').textContent = capitalizeFirst(employee.team);
    document.getElementById('employeeGender').textContent = capitalizeFirst(employee.gender);
    document.getElementById('employeeDOB').textContent = formatDate(employee.dateOfBirth);
    document.getElementById('employeeLastUpdated').textContent = formatDate(employee.lastUpdated);

    // Emergency contact display
    document.getElementById('emergencyContactName').textContent = 
        employee.emergencyContact?.name || 'Not provided';
    document.getElementById('emergencyContactPhone').textContent = 
        employee.emergencyContact?.phone || 'Not provided';
}

function displaySurveyStats() {
    const employeeResponses = responses.filter(r => r.email === employee.email);
    const uniqueSurveyIds = new Set(employeeResponses.map(r => r.surveyId));
    
    const stats = {
        completed: uniqueSurveyIds.size,
        total: surveys.length,
        completion: Math.round((uniqueSurveyIds.size / surveys.length) * 100),
        lastResponse: employeeResponses.length > 0 ? 
            employeeResponses.reduce((latest, current) => 
                new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
            ).timestamp : null
    };

    document.getElementById('surveyStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.completed}/${stats.total}</div>
            <div class="stat-label">Surveys Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.completion}%</div>
            <div class="stat-label">Completion Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatDate(stats.lastResponse) || 'N/A'}</div>
            <div class="stat-label">Last Response</div>
        </div>
    `;
}

async function generateAndDisplaySummary(forceRefresh = false) {
    try {
        const employeeResponses = responses.filter(r => r.email === employee.email);
        const formattedResponses = employeeResponses.map(response => {
            const survey = surveys.find(s => s._id === response.surveyId);
            const answers = Object.entries(response.answers).map(([questionId, answer]) => {
                const question = survey.questions.find(q => q._id === questionId);
                return {
                    question: question?.text || 'Unknown Question',
                    answer: answer
                };
            });
            return {
                surveyTitle: survey?.title || 'Unknown Survey',
                answers: answers
            };
        });

        const summaryResponse = await fetch('/api/admin/generate-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employee: {
                    _id: employee._id,
                    name: employee.name,
                    team: employee.team
                },
                responses: formattedResponses,
                forceRefresh
            })
        });

        if (!summaryResponse.ok) {
            throw new Error('Failed to generate summary');
        }

        const { summary } = await summaryResponse.json();

        // Update the summary section with the generated content
        const summaryContent = document.querySelector('.summary-content');
        if (summaryContent) {
            summaryContent.innerHTML = `
                <i class="fas fa-lightbulb summary-icon"></i>
                <p>${summary}</p>
            `;
        }

    } catch (error) {
        console.error('Error generating summary:', error);
        const summaryContent = document.querySelector('.summary-content');
        if (summaryContent) {
            summaryContent.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to generate summary at this time.</p>
                </div>
            `;
        }
    }
}

function confirmRefreshSummary() {
    if (confirm('This will generate a new summary using OpenAI API, which may incur costs. Do you want to continue?')) {
        generateAndDisplaySummary(true);
    }
}

function displayRecentResponses() {
    const employeeResponses = responses
        .filter(r => r.email === employee.email)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    // Helper function to generate star rating HTML
    const getStarRating = (rating) => {
        const fullStar = '<i class="fas fa-star"></i>';
        const emptyStar = '<i class="far fa-star"></i>';
        return `
            <div class="star-rating">
                ${Array(5).fill('').map((_, i) => i < rating ? fullStar : emptyStar).join('')}
                <span class="rating-number">${rating}/5</span>
            </div>
        `;
    };

    const responsesHtml = employeeResponses.length ? 
        employeeResponses.map(response => {
            const survey = surveys.find(s => s._id === response.surveyId);
            
            // Get the questions from the survey
            const answersHtml = survey ? Object.entries(response.answers).map(([questionId, answer]) => {
                // Find the question text and type from the survey questions
                const question = survey.questions.find(q => q._id === questionId);
                const questionText = question ? question.text : 'Unknown Question';
                
                // Format answer based on question type
                let formattedAnswer = answer;
                if (question && question.type === 'rating') {
                    formattedAnswer = getStarRating(parseInt(answer));
                }

                return `
                    <div class="response-answer">
                        <div class="question-text">${questionText}</div>
                        <div class="answer-text">${formattedAnswer}</div>
                    </div>
                `;
            }).join('') : '<div class="no-data">Survey questions not found</div>';

            return `
                <div class="response-item">
                    <div class="response-header">
                        <div class="response-survey">${survey?.title || 'Unknown Survey'}</div>
                        <div class="response-date">${formatDate(response.timestamp)}</div>
                    </div>
                    <div class="response-content">
                        ${answersHtml}
                    </div>
                </div>
            `;
        }).join('') :
        '<div class="no-responses">No survey responses yet</div>';

    document.getElementById('recentResponses').innerHTML = responsesHtml;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', loadEmployeeProfile);

// Add this function at the end of the file
function logout() {
    // Clear any stored tokens/session data
    localStorage.removeItem('adminToken');
    // Redirect to login page
    window.location.href = '/admin/login.html';
}

// Add this function at the top with your other functions
function goBack() {
    window.location.href = '/admin/dashboard.html?section=employees';
} 