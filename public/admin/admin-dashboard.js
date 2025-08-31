// Global state
let surveys = [];
let allResponses = [];
let editingSurveyId = null;

// Global state for goals
let goals = [];
let editingGoalId = null;

let editingCourseId = null;
let courses = [];

// Add to your global state
let employees = [];

// Add flag to prevent multiple executions
let isInitialized = false;

// Modify showSection to handle both click and URL navigation
const showSection = (sectionName) => {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`.nav-btn[onclick="showSection('${sectionName}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Store the current section in sessionStorage
    sessionStorage.setItem('currentSection', sectionName);
    
    // Update URL without reloading the page
    const url = new URL(window.location);
    url.searchParams.set('section', sectionName);
    window.history.pushState({ section: sectionName }, '', url);
    
    // Load section-specific data
    switch(sectionName) {
        case 'employees':
            loadEmployees();
            break;
        case 'culture':
            loadCultureScore();
            break;
        case 'responses':
            loadAllResponses();
            loadSurveysAndResponses();
            break;
        case 'goals':
            loadGoals();
            break;
        case 'courses':
            loadCourses();
            break;
    }
};

// Single DOMContentLoaded event handler for all initialization
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return; // Prevent multiple executions
    isInitialized = true;
    
    // First check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sectionFromURL = urlParams.get('section');
    
    // Then check sessionStorage
    const sectionFromSession = sessionStorage.getItem('currentSection');
    
    // Determine which section to show
    const sectionToShow = sectionFromURL || sectionFromSession || 'culture';
    
    showSection(sectionToShow);
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    // Use the section from event.state if available, otherwise from URL, or fall back to culture
    const sectionToShow = (event.state && event.state.section) || sectionFromURL || 'culture';
    
    showSection(sectionToShow);
});

// Load and display all responses
async function loadAllResponses() {
    const responsesList = document.getElementById('responsesList');
    responsesList.innerHTML = '<div class="loading">Loading surveys...</div>';

    try {
        // Fetch all data in parallel if not already loaded
        if (!surveys.length) {
            const [surveysRes, responsesRes] = await Promise.all([
                fetch('/api/admin/surveys'),
                fetch('/api/admin/responses')
            ]);

            if (!surveysRes.ok || !responsesRes.ok) {
                throw new Error('Failed to fetch data');
            }

            surveys = await surveysRes.json();
            allResponses = await responsesRes.json();
        }

        // Display surveys list
        responsesList.innerHTML = `
            <div class="surveys-table-container">
                <table class="surveys-table">
                    <thead>
                        <tr>
                            <th>Survey Title</th>
                            <th>Responses</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${surveys.map(survey => {
                            const responseCount = allResponses.filter(r => r.surveyId === survey._id).length;
                            return `
                                <tr>
                                    <td>
                                        <a href="/admin/survey-responses.html?id=${survey._id}" class="survey-title-link">
                                            ${survey.title}
                                        </a>
                                    </td>
                                    <td>
                                        <span class="response-badge">
                                            ${responseCount} responses
                                        </span>
                                    </td>
                                    <td class="actions-cell">
                                        <button onclick="editSurvey('${survey._id}')" class="btn-icon" title="Edit Survey">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteSurvey('${survey._id}')" class="btn-icon delete" title="Delete Survey">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading surveys:', error);
        responsesList.innerHTML = `
            <div class="error-message">
                Error loading surveys. 
                <button onclick="loadAllResponses()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}

// View responses for a specific survey
const viewResponses = async (surveyTitle) => {
    // Switch to responses section
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('responses-section').classList.add('active');

    const responsesList = document.getElementById('responsesList');
    responsesList.innerHTML = '<div class="loading">Loading responses...</div>';

    try {
        // Fetch all data if not already loaded
        if (!surveys.length || !allResponses.length) {
            const [surveysRes, responsesRes] = await Promise.all([
                fetch('/api/admin/surveys'),
                fetch('/api/admin/responses')
            ]);

            if (!surveysRes.ok || !responsesRes.ok) {
                throw new Error('Failed to fetch data');
            }

            surveys = await surveysRes.json();
            allResponses = await responsesRes.json();
        }

        // Filter responses for the specific survey
        const surveyResponses = surveyTitle ? 
            allResponses.filter(response => response.surveyTitle === surveyTitle) : 
            allResponses;
            
        displayResponses(surveyResponses);
    } catch (error) {
        console.error('Error loading responses:', error);
        responsesList.innerHTML = `
            <div class="error-message">
                <p>Error loading responses. Please try again.</p>
                <button onclick="viewResponses('${surveyTitle}')" class="btn-secondary">Retry</button>
            </div>
        `;
    }
};

// Display responses in table format with expandable rows
const displayResponses = (responses) => {
    const responsesList = document.getElementById('responsesList');
    
    if (!responses.length) {
        responsesList.innerHTML = '<div class="no-data">No responses yet</div>';
        return;
    }

    // Group responses by survey
    const groupedResponses = responses.reduce((acc, response) => {
        const survey = surveys.find(s => s._id === response.surveyId);
        if (!acc[response.surveyId]) {
            acc[response.surveyId] = {
                survey: survey,
                responses: []
            };
        }
        acc[response.surveyId].responses.push(response);
        return acc;
    }, {});

    responsesList.innerHTML = Object.values(groupedResponses)
        .map(group => `
            <div class="response-group">
                <div class="response-group-header" onclick="toggleResponses('${group.survey._id}')">
                    <div class="header-left">
                        <i class="fas fa-chevron-right"></i>
                        <h3>${group.survey.title}</h3>
                        <span class="response-count">${group.responses.length} responses</span>
                    </div>
                    <div class="header-right">
                        <span class="date-range">
                            ${formatDate(group.responses[group.responses.length - 1].timestamp)} - 
                            ${formatDate(group.responses[0].timestamp)}
                        </span>
                    </div>
                </div>
                <div id="responses-${group.survey._id}" class="response-group-content">
                    ${group.responses
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map(response => `
                            <div class="response-card">
                                <div class="response-header">
                                    <strong>${response.email}</strong>
                                    <span>${formatDate(response.timestamp)}</span>
                                </div>
                                <div class="response-details">
                                    ${Object.entries(response.answers)
                                        .map(([question, answer]) => `
                                            <div class="response-item">
                                                <div class="question">${question}</div>
                                                <div class="answer">${answer}</div>
                                            </div>
                                        `)
                                        .join('')}
                                </div>
                            </div>
                        `)
                        .join('')}
                </div>
            </div>
        `)
        .join('');
};

// Add the toggle function
function toggleResponses(surveyId) {
    const content = document.getElementById(`responses-${surveyId}`);
    const header = content.previousElementSibling;
    const chevron = header.querySelector('.fa-chevron-right');
    
    content.classList.toggle('expanded');
    chevron.style.transform = content.classList.contains('expanded') ? 'rotate(90deg)' : '';
}

// Add toggle function for expanding/collapsing response details
const toggleResponseDetails = (responseId) => {
    const detailsRow = document.getElementById(`response-details-${responseId}`);
    const button = document.querySelector(`[data-response-id="${responseId}"] .expand-btn`);
    const icon = button.querySelector('i');
    
    if (detailsRow.classList.contains('expanded')) {
        detailsRow.classList.remove('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
    } else {
        detailsRow.classList.add('expanded');
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
    }
};

// Format answer based on question type
const formatAnswer = (answer, type) => {
    if (!answer) return 'No answer provided';
    
    switch (type) {
        case 'rating':
            return `
                <div class="rating-display">
                    <span class="rating-number">${answer}</span>
                    <div class="rating-stars">
                        ${Array(5).fill(0).map((_, i) => 
                            `<span class="star ${i < answer ? 'filled' : ''}">${i < answer ? '★' : '☆'}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        default:
            return answer;
    }
};

// Admin logout
const adminLogout = async () => {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin/login.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
};

// Load both surveys and responses
const loadSurveysAndResponses = async () => {
    const surveysList = document.getElementById('surveysList');
    surveysList.innerHTML = '<div class="loading">Loading surveys...</div>';

    try {
        // Fetch both surveys and responses in parallel
        const [surveysRes, responsesRes] = await Promise.all([
            fetch('/api/admin/surveys'),
            fetch('/api/admin/responses')
        ]);

        if (!surveysRes.ok || !responsesRes.ok) {
            throw new Error('Failed to fetch data');
        }

        surveys = await surveysRes.json();
        allResponses = await responsesRes.json();
        
        displaySurveys();
    } catch (error) {
        console.error('Error loading data:', error);
        surveysList.innerHTML = `
            <div class="error-message">
                <p>Failed to load data. Please try again.</p>
                <button onclick="loadSurveysAndResponses()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
};

// Display surveys in grid
const displaySurveys = () => {
    const surveysList = document.getElementById('surveysList');
    const surveyCount = document.querySelector('.survey-count');
    
    if (!surveys || surveys.length === 0) {
        surveysList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-clipboard fa-2x"></i>
                <p>No surveys found</p>
                <button onclick="showCreateSurveyForm()" class="btn-primary">
                    <i class="fas fa-plus"></i>
                    Create First Survey
                </button>
            </div>
        `;
        surveyCount.textContent = '0 Surveys';
        return;
    }

    // Update survey count
    surveyCount.textContent = `${surveys.length} Survey${surveys.length === 1 ? '' : 's'}`;

    // Count responses for each survey
    const responseCounts = {};
    allResponses.forEach(response => {
        if (response.surveyTitle) {
            responseCounts[response.surveyTitle] = (responseCounts[response.surveyTitle] || 0) + 1;
        }
    });

    surveysList.innerHTML = surveys.map(survey => `
        <div class="survey-card">
            <div class="survey-header">
                <h3 class="survey-title">${survey.title}</h3>
                <p class="survey-description">${survey.description || 'No description provided'}</p>
            </div>
            <div class="survey-meta">
                <span><i class="fas fa-question-circle"></i> ${survey.questions.length} questions</span>
                <span><i class="fas fa-reply"></i> ${responseCounts[survey.title] || 0} responses</span>
            </div>
            <div class="survey-actions">
                <button onclick="editSurvey('${survey._id}')" class="btn-secondary">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button onclick="viewResponses('${survey.title}')" class="btn-primary">
                    <i class="fas fa-eye"></i>
                    View Responses
                </button>
                <button onclick="deleteSurvey('${survey._id}')" class="btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
};

// Add click outside handler to close dropdowns
document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-select-container')) {
        document.querySelectorAll('.search-results').forEach(div => {
            div.style.display = 'none';
        });
    }
});

const showCreateSurveyForm = () => {
    editingSurveyId = null;
    document.getElementById('modalTitle').textContent = 'Create New Survey';
    document.getElementById('surveyForm').reset();
    document.getElementById('questionsList').innerHTML = '';
    document.getElementById('surveyModal').style.display = 'block';
};

const editSurvey = (surveyId) => {
    editingSurveyId = surveyId;
    const survey = surveys.find(s => s._id === surveyId);
    if (!survey) return;

    document.getElementById('modalTitle').textContent = 'Edit Survey';
    document.getElementById('surveyTitle').value = survey.title;
    document.getElementById('surveyDescription').value = survey.description || '';
    
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '';
    
    // Add each question with its index as a unique identifier
    survey.questions.forEach((question, index) => {
        addQuestion(question, `existing_${index}`);
    });

    document.getElementById('surveyModal').style.display = 'block';
};

const closeSurveyModal = () => {
    document.getElementById('surveyModal').style.display = 'none';
};

const addQuestion = (existingQuestion = null, questionId = Date.now()) => {
    const questionsList = document.getElementById('questionsList');

    // Handle options display
    let optionsDisplay = '';
    if (existingQuestion && existingQuestion.type === 'choice' && Array.isArray(existingQuestion.options)) {
        optionsDisplay = existingQuestion.options.join('\n');
    }

    const questionHtml = `
        <div class="question-item" id="question-${questionId}" data-question-id="${questionId}">
            <button type="button" class="remove-question" onclick="removeQuestion('${questionId}')">
                <i class="fas fa-times"></i>
            </button>
            <div class="form-group">
                <label>Question Text*</label>
                <input type="text" name="questions[${questionId}].text" required 
                    value="${existingQuestion?.text || ''}">
            </div>
            <div class="form-group">
                <label>Question Type*</label>
                <select name="questions[${questionId}].type" onchange="handleQuestionTypeChange('${questionId}')" required>
                    <option value="rating" ${existingQuestion?.type === 'rating' ? 'selected' : ''}>Rating (1-5)</option>
                    <option value="text" ${existingQuestion?.type === 'text' ? 'selected' : ''}>Text</option>
                    <option value="choice" ${existingQuestion?.type === 'choice' ? 'selected' : ''}>Multiple Choice</option>
                </select>
            </div>
            <div id="choices-${questionId}" class="choices-list" style="display: ${existingQuestion?.type === 'choice' ? 'block' : 'none'}">
                <div class="form-group">
                    <label>Choices (one per line)*</label>
                    <textarea name="questions[${questionId}].options" rows="4">${optionsDisplay}</textarea>
                </div>
            </div>
        </div>
    `;

    questionsList.insertAdjacentHTML('beforeend', questionHtml);
};

const removeQuestion = (questionId) => {
    const questionElement = document.getElementById(`question-${questionId}`);
    if (questionElement) {
        questionElement.remove();
    }
};

const handleQuestionTypeChange = (questionId) => {
    const select = document.querySelector(`[name="questions[${questionId}].type"]`);
    const choicesDiv = document.getElementById(`choices-${questionId}`);
    choicesDiv.style.display = select.value === 'choice' ? 'block' : 'none';
};

const handleSurveySubmit = async (event) => {
    event.preventDefault();
    
    try {
        const surveyData = {
            title: document.getElementById('surveyTitle').value.trim(),
            description: document.getElementById('surveyDescription').value.trim() || "",
            questions: []
        };

        // Gather questions data
        const questionItems = document.querySelectorAll('.question-item');
        if (questionItems.length === 0) {
            throw new Error('Please add at least one question');
        }

        questionItems.forEach((item, index) => {
            const questionId = item.dataset.questionId;
            const question = {
                text: item.querySelector(`[name="questions[${questionId}].text"]`).value.trim(),
                type: item.querySelector(`[name="questions[${questionId}].type"]`).value,
                options: []
            };

            if (!question.text) {
                throw new Error(`Question ${index + 1} text cannot be empty`);
            }

            if (question.type === 'choice') {
                const optionsText = item.querySelector(`[name="questions[${questionId}].options"]`).value;
                question.options = optionsText.split('\n')
                    .map(opt => opt.trim())
                    .filter(opt => opt.length > 0);
                
                if (question.options.length === 0) {
                    throw new Error(`Question ${index + 1} must have at least one option`);
                }
            }

            surveyData.questions.push(question);
        });

        const url = editingSurveyId ? 
            `/api/admin/surveys/${editingSurveyId}` : 
            '/api/admin/surveys';

        const response = await fetch(url, {
            method: editingSurveyId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(surveyData)
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to save survey');
        }

        await loadAllResponses();
        closeSurveyModal();
    } catch (error) {
        console.error('Error saving survey:', error);
        alert(error.message || 'Failed to save survey. Please try again.');
    }
};

// Add delete survey functionality
const deleteSurvey = async (surveyId) => {
    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/surveys/${surveyId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete survey');

        // Refresh surveys list
        await loadSurveysAndResponses();
    } catch (error) {
        console.error('Error deleting survey:', error);
        alert('Failed to delete survey. Please try again.');
    }
};

// Close modal when clicking outside
window.onclick = (event) => {
    const modal = document.getElementById('surveyModal');
    if (event.target === modal) {
        closeSurveyModal();
    }
};

// Add this function for logout
const logout = () => {
    // Clear any stored tokens/session data
    localStorage.removeItem('adminToken');
    // Redirect to login page with correct .html extension
    window.location.href = '/admin/login.html';
};

// Load goals
const loadGoals = async () => {
    const goalsList = document.getElementById('goalsList');
    goalsList.innerHTML = '<div class="loading">Loading goals...</div>';

    try {
        const response = await fetch('/api/admin/goals');
        if (!response.ok) throw new Error('Failed to fetch goals');
        
        goals = await response.json();
        displayGoals();
    } catch (error) {
        console.error('Error loading goals:', error);
        goalsList.innerHTML = `
            <div class="error-message">
                <p>Error loading goals. Please try again.</p>
                <button onclick="loadGoals()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
};

// Display goals
const displayGoals = () => {
    const goalsList = document.getElementById('goalsList');
    const goalsCount = document.querySelector('.goals-count');
    
    if (!goals || goals.length === 0) {
        goalsList.innerHTML = `
            <div class="no-data" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 300px; padding: 2rem;">
                <i class="fas fa-bullseye fa-3x" style="color: #ccc; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem; color: #666; margin-bottom: 1.5rem;">No goals found</p>
                <button onclick="showCreateGoalForm()" class="btn-primary" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem;">
                    <i class="fas fa-plus"></i>
                    Create First Goal
                </button>
            </div>
        `;
        goalsCount.textContent = '0 Goals';
        return;
    }

    goalsCount.textContent = `${goals.length} Goal${goals.length === 1 ? '' : 's'}`;

    goalsList.innerHTML = goals.map(goal => `
        <div class="goal-card">
            <div class="goal-header">
                <h3 class="goal-title">${goal.name}</h3>
                <p class="goal-description">${goal.description}</p>
            </div>
            <div class="goal-meta">
                <span><i class="fas fa-users"></i> ${goal.team}</span>
                <span class="quarter-badge">${goal.quarter}</span>
            </div>
            <div class="goal-actions">
                <button onclick="editGoal('${goal._id}')" class="btn-secondary">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button onclick="deleteGoal('${goal._id}')" class="btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
};

// Show create goal form
const showCreateGoalForm = () => {
    editingGoalId = null;
    document.getElementById('goalModalTitle').textContent = 'Create New Goal';
    document.getElementById('goalForm').reset();
    populateQuarterOptions();
    document.getElementById('goalModal').style.display = 'block';
};

// Populate quarter options
const populateQuarterOptions = () => {
    const quarterSelect = document.getElementById('goalQuarter');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const quarters = [];
    
    // Add next 4 quarters
    for (let i = 0; i < 4; i++) {
        const year = currentYear + Math.floor((currentDate.getMonth() + (i * 3)) / 12);
        const quarter = Math.floor((currentDate.getMonth() + (i * 3)) % 12 / 3) + 1;
        quarters.push(`Q${quarter}Y${year.toString().slice(-2)}`);
    }
    
    quarterSelect.innerHTML = quarters.map(q => 
        `<option value="${q}">${q}</option>`
    ).join('');
};

// Handle goal form submission
const handleGoalSubmit = async (event) => {
    event.preventDefault();
    
    const goalData = {
        name: document.getElementById('goalName').value,
        description: document.getElementById('goalDescription').value,
        team: document.getElementById('goalTeam').value,
        quarter: document.getElementById('goalQuarter').value
    };

    try {
        const url = editingGoalId 
            ? `/api/admin/goals/${editingGoalId}`
            : '/api/admin/goals';
            
        const response = await fetch(url, {
            method: editingGoalId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goalData)
        });

        if (!response.ok) throw new Error('Failed to save goal');

        closeGoalModal();
        await loadGoals();
    } catch (error) {
        console.error('Error saving goal:', error);
        alert('Failed to save goal. Please try again.');
    }
};

// Edit goal
const editGoal = (goalId) => {
    editingGoalId = goalId;
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    document.getElementById('goalModalTitle').textContent = 'Edit Goal';
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalDescription').value = goal.description;
    document.getElementById('goalTeam').value = goal.team;
    
    populateQuarterOptions();
    document.getElementById('goalQuarter').value = goal.quarter;
    
    document.getElementById('goalModal').style.display = 'block';
};

// Delete goal
const deleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
        const response = await fetch(`/api/admin/goals/${goalId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete goal');

        await loadGoals();
    } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal. Please try again.');
    }
};

// Close goal modal
const closeGoalModal = () => {
    document.getElementById('goalModal').style.display = 'none';
};

// Load courses
const loadCourses = async () => {
    const coursesList = document.getElementById('coursesList');
    coursesList.innerHTML = '<div class="loading">Loading courses...</div>';

    try {
        const response = await fetch('/api/admin/courses');
        if (!response.ok) throw new Error('Failed to fetch courses');
        
        courses = await response.json();
        displayCourses();
    } catch (error) {
        console.error('Error loading courses:', error);
        coursesList.innerHTML = `
            <div class="error-message">
                <p>Error loading courses. Please try again.</p>
                <button onclick="loadCourses()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
};

// Display courses
const displayCourses = () => {
    const coursesList = document.getElementById('coursesList');
    const coursesCount = document.querySelector('.courses-count');
    
    if (!courses || courses.length === 0) {
        coursesList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-graduation-cap fa-3x"></i>
                <p>No courses found</p>
                <button onclick="showCreateCourseForm()" class="btn-primary">
                    <i class="fas fa-plus"></i>
                    Create First Course
                </button>
            </div>
        `;
        coursesCount.textContent = '0 Courses';
        return;
    }

    coursesCount.textContent = `${courses.length} Course${courses.length === 1 ? '' : 's'}`;

    coursesList.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-header">
                <h3 class="course-title">${course.title}</h3>
                <p class="course-description">${course.description}</p>
            </div>
            <div class="course-meta">
                <span><i class="fas fa-book"></i> ${course.content.length} Items</span>
            </div>
            <div class="course-actions">
                <button onclick="editCourse('${course._id}')" class="btn-secondary">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button onclick="deleteCourse('${course._id}')" class="btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
};

// Show create course form
const showCreateCourseForm = () => {
    editingCourseId = null;
    document.getElementById('courseModalTitle').textContent = 'Create New Course';
    document.getElementById('courseForm').reset();
    document.getElementById('contentList').innerHTML = '';
    document.getElementById('courseModal').style.display = 'block';
};

// Add content item
const addContentItem = () => {
    const contentList = document.getElementById('contentList');
    const contentId = Date.now();
    
    const contentHtml = `
        <div class="content-item" id="content-${contentId}">
            <button type="button" class="remove-content" onclick="removeContent(${contentId})">
                <i class="fas fa-times"></i>
            </button>
            <div class="form-group">
                <label>Content Title*</label>
                <input type="text" name="content[${contentId}].title" required>
            </div>
            <div class="form-group">
                <label>Content Text*</label>
                <textarea name="content[${contentId}].text" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>External Link (optional)</label>
                <input type="url" name="content[${contentId}].link">
            </div>
        </div>
    `;

    contentList.insertAdjacentHTML('beforeend', contentHtml);
};

// Remove content item
const removeContent = (contentId) => {
    document.getElementById(`content-${contentId}`).remove();
};

// Close course modal
const closeCourseModal = () => {
    document.getElementById('courseModal').style.display = 'none';
};

// Handle course form submission
const handleCourseSubmit = async (event) => {
    event.preventDefault();
    
    try {
        const courseData = {
            title: document.getElementById('courseTitle').value.trim(),
            description: document.getElementById('courseDescription').value.trim(),
            content: []
        };

        // Gather content items
        const contentItems = document.querySelectorAll('.content-item');
        contentItems.forEach(item => {
            const contentId = item.id.split('-')[1];
            courseData.content.push({
                title: item.querySelector(`[name="content[${contentId}].title"]`).value.trim(),
                text: item.querySelector(`[name="content[${contentId}].text"]`).value.trim(),
                link: item.querySelector(`[name="content[${contentId}].link"]`).value.trim() || null
            });
        });

        const url = editingCourseId ? 
            `/api/admin/courses/${editingCourseId}` : 
            '/api/admin/courses';
            
        const response = await fetch(url, {
            method: editingCourseId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(courseData)
        });

        if (!response.ok) throw new Error('Failed to save course');

        closeCourseModal();
        await loadCourses();
    } catch (error) {
        console.error('Error saving course:', error);
        alert('Failed to save course. Please try again.');
    }
};

// Edit course
const editCourse = (courseId) => {
    editingCourseId = courseId;
    const course = courses.find(c => c._id === courseId);
    if (!course) return;

    document.getElementById('courseModalTitle').textContent = 'Edit Course';
    document.getElementById('courseTitle').value = course.title;
    document.getElementById('courseDescription').value = course.description;
    
    // Clear and repopulate content items
    const contentList = document.getElementById('contentList');
    contentList.innerHTML = '';
    
    course.content.forEach(item => {
        const contentId = Date.now() + Math.random();
        const contentHtml = `
            <div class="content-item" id="content-${contentId}">
                <button type="button" class="remove-content" onclick="removeContent(${contentId})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="form-group">
                    <label>Content Title*</label>
                    <input type="text" name="content[${contentId}].title" value="${item.title}" required>
                </div>
                <div class="form-group">
                    <label>Content Text*</label>
                    <textarea name="content[${contentId}].text" rows="3" required>${item.text}</textarea>
                </div>
                <div class="form-group">
                    <label>External Link (optional)</label>
                    <input type="url" name="content[${contentId}].link" value="${item.link || ''}">
                </div>
            </div>
        `;
        contentList.insertAdjacentHTML('beforeend', contentHtml);
    });
    
    document.getElementById('courseModal').style.display = 'block';
};

// Delete course
const deleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/courses/${courseId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete course');

        await loadCourses();
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course. Please try again.');
    }
};

// Rename this function to avoid conflict
function displayEmployeeActions(employees) {
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>${employee.name}</td>
            <td>${employee.email}</td>
            <td>${capitalizeFirst(employee.team)}</td>
            <td class="actions-cell">
                <button class="btn-icon" onclick="editEmployee('${employee._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteEmployee('${employee._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Update loadEmployees function to use the correct element ID
async function loadEmployees() {
    const employeesTableBody = document.getElementById('employeesTableBody');
    if (!employeesTableBody) {
        return;
    }

    employeesTableBody.innerHTML = '<tr><td colspan="6" class="loading">Loading employees...</td></tr>';

    try {
        // Load surveys and responses if not already loaded
        if (!surveys || !surveys.length) {
            const surveysRes = await fetch('/api/admin/surveys');
            if (!surveysRes.ok) throw new Error('Failed to fetch surveys');
            surveys = await surveysRes.json();
        }

        if (!allResponses || !allResponses.length) {
            const responsesRes = await fetch('/api/admin/responses');
            if (!responsesRes.ok) throw new Error('Failed to fetch responses');
            allResponses = await responsesRes.json();
        }

        const employeesRes = await fetch('/api/admin/employees');
        if (!employeesRes.ok) throw new Error('Failed to fetch employees');
        employees = await employeesRes.json();
        
        displayEmployees();
    } catch (error) {
        console.error('Error loading employees:', error);
        if (employeesTableBody) {
            employeesTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="error-message">
                        Error loading employees. 
                        <button onclick="loadEmployees()" class="btn-secondary">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
}

// Update displayEmployees function to use the correct element ID
function displayEmployees() {
    const employeesTableBody = document.getElementById('employeesTableBody');
    const employeeCount = document.querySelector('.employee-count');
    
    if (!employees || employees.length === 0) {
        employeesTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-data">
                    <div class="no-data-content">
                        <i class="fas fa-users"></i>
                        <p>No employees found</p>
                    </div>
                </td>
            </tr>
        `;
        employeeCount.textContent = '0 Employees';
        return;
    }
    
    employeeCount.textContent = `${employees.length} Employee${employees.length === 1 ? '' : 's'}`;
    
        employeesTableBody.innerHTML = employees
            .map(employee => {
                // Calculate completed surveys from existing responses data
                const employeeResponses = allResponses.filter(r => r.email === employee.email);
                const uniqueSurveyIds = new Set(employeeResponses.map(r => r.surveyId));
                const surveysCompleted = uniqueSurveyIds.size;
                
                const completionRate = (surveysCompleted / (surveys.length || 1)) * 100;
                const completionClass = getCompletionClass(completionRate);
                
                return `
                    <tr class="employee-row">
                        <td>
                            <a href="/admin/employee-profile.html?id=${employee._id}" class="employee-name-link">
                                ${employee.name || 'No Name'}
                            </a>
                        </td>
                        <td>${employee.email}</td>
                        <td>${employee.team ? capitalizeFirst(employee.team) : 'Not Assigned'}</td>
                        <td>
                            <span class="survey-completion ${completionClass}">
                                ${surveysCompleted}/${surveys.length || 0}
                            </span>
                        </td>
                        <td>${formatDate(employee.lastUpdated)}</td>
                        <td class="actions-cell">
                            <button onclick="editEmployee('${employee._id}')" class="btn-icon" title="Edit Employee">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteEmployee('${employee._id}')" class="btn-icon delete" title="Delete Employee">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
}

function toggleEmployeeDetails(employeeId) {
    const detailsRow = document.getElementById(`employee-details-${employeeId}`);
    const button = detailsRow.previousElementSibling.querySelector('.expand-btn');
    
    detailsRow.classList.toggle('expanded');
    button.classList.toggle('expanded');
}

function calculateCompletionRate(employee) {
    return ((employee.surveysCompleted || 0) / surveys.length) * 100;
}

function getCompletionClass(rate) {
    if (rate >= 80) return 'completion-high';
    if (rate >= 50) return 'completion-medium';
    return 'completion-low';
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


function displayCultureScore(data) {
    const lastUpdatedText = data?.lastUpdated ? 
        `Last updated: ${formatDate(data.lastUpdated)}` : '';

    // Check if there's enough data
    if (!data || data.companyOverview.employeesWithResponses === 0) {
        document.querySelector('.culture-grid').innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-chart-bar"></i>
                <h3>Not Enough Data</h3>
                <p>No survey responses have been collected yet. Analysis will be available once employees start submitting their responses.</p>
            </div>
        `;
        return;
    }

    // Update company overview
    document.getElementById('totalEmployees').innerHTML = `
        <span class="response-rate">${data.companyOverview.employeesWithResponses}/${data.companyOverview.totalEmployees}</span>
        <span class="rate-percentage">${data.companyOverview.responseRate}%</span>
    `;
    document.getElementById('avgSatisfaction').textContent = data.companyOverview.averageSatisfaction.toFixed(1);
    document.getElementById('avgWorkLife').textContent = data.companyOverview.averageWorkLifeBalance.toFixed(1);

    // Update team metrics with improved UI and response rates
    const teamMetricsHtml = data.teamMetrics.map(team => `
        <div class="team-card">
            <div class="team-header">
                <div class="team-name">
                    <i class="fas ${getTeamIcon(team.team)}"></i>
                    <h4>${capitalizeFirst(team.team)}</h4>
                </div>
                <div class="employee-count">
                    <i class="fas fa-users"></i>
                    <span>${team.respondedCount}/${team.totalCount}</span>
                    <span class="response-percentage">${team.responseRate}%</span>
                </div>
            </div>
            <div class="team-metrics">
                <div class="metric-row">
                    <div class="metric-label">
                        <i class="fas fa-smile"></i>
                        <span>Satisfaction</span>
                    </div>
                    <div class="metric-value">
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${(team.satisfaction / 5) * 100}%"></div>
                        </div>
                        <span>${team.satisfaction.toFixed(1)}</span>
                    </div>
                </div>
                <div class="metric-row">
                    <div class="metric-label">
                        <i class="fas fa-balance-scale"></i>
                        <span>Work-Life</span>
                    </div>
                    <div class="metric-value">
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${(team.workLifeBalance / 5) * 100}%"></div>
                        </div>
                        <span>${team.workLifeBalance.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('teamMetricsGrid').innerHTML = teamMetricsHtml;

    // Update action items
    const actionItemsHtml = data.actionItems.map(item => `
        <div class="action-item priority-${item.priority}">
            <div class="action-content">
                <p>${item.text}</p>
                <div class="action-tags">
                    ${item.tags.map(tag => `
                        <span class="tag">${tag}</span>
                    `).join('')}
                </div>
            </div>
            <div class="priority-badge">${capitalizeFirst(item.priority)}</div>
        </div>
    `).join('');
    document.getElementById('actionItemsList').innerHTML = actionItemsHtml;

    // Update last updated timestamp
    document.querySelector('.last-updated').textContent = lastUpdatedText;
}

// Update the refresh button text based on existing data
async function loadCultureScore() {
    try {
        const response = await fetch('/api/admin/culture-score');
        if (response.status === 404) {
            document.querySelector('.culture-grid').innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-chart-bar"></i>
                    <h3>No Analysis Available</h3>
                    <p>Click "Generate Analysis" to create your first culture score report.</p>
                </div>
            `;
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch culture score');
        }
        
        const data = await response.json();

        displayCultureScore(data);
    } catch (error) {
        console.error('Error loading culture score:', error);
    }
}

// Helper function to get team-specific icons
function getTeamIcon(team) {
    const icons = {
        tech: 'fa-laptop-code',
        sales: 'fa-handshake',
        product: 'fa-cube',
        marketing: 'fa-bullhorn'
    };
    return icons[team] || 'fa-users';
}



// Edit employee functions
let currentEmployeeId = null;

function openEditModal(employee) {
    currentEmployeeId = employee._id;
    document.getElementById('editName').value = employee.name;
    document.querySelector(`input[name="editGender"][value="${employee.gender}"]`).checked = true;
    document.getElementById('editTeam').value = employee.team;
    document.getElementById('editDateOfBirth').value = employee.dateOfBirth.split('T')[0];
    document.getElementById('editEmployeeModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editEmployeeModal').style.display = 'none';
    currentEmployeeId = null;
}

async function editEmployee(employeeId) {
    try {
        const response = await fetch(`/api/admin/employees/${employeeId}`);
        if (!response.ok) throw new Error('Failed to fetch employee data');
        const employee = await response.json();
        openEditModal(employee);
    } catch (error) {
        console.error('Error fetching employee:', error);
        alert('Failed to load employee data');
    }
}

// Handle edit form submission
document.getElementById('editEmployeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('editName').value,
        gender: document.querySelector('input[name="editGender"]:checked').value,
        team: document.getElementById('editTeam').value,
        dateOfBirth: document.getElementById('editDateOfBirth').value
    };

    try {
        const response = await fetch(`/api/admin/employees/${currentEmployeeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to update employee');

        closeEditModal();
        loadEmployees(); // Refresh the employees list
        alert('Employee updated successfully');
    } catch (error) {
        console.error('Error updating employee:', error);
        alert('Failed to update employee');
    }
});

// Delete employee function
async function deleteEmployee(employeeId) {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/employees/${employeeId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete employee');

        loadEmployees(); // Refresh the employees list
        alert('Employee deleted successfully');
    } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee');
    }
}

// Add this function to handle culture score refresh
async function refreshCultureScore() {
    try {
        const refreshBtn = document.querySelector('.culture-refresh-btn');
        const originalText = refreshBtn.innerHTML;
        
        // Update button to show loading state
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        refreshBtn.disabled = true;

        // Call the generate endpoint with force refresh
        const response = await fetch('/api/admin/generate-culture-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ forceRefresh: true })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Display the updated data
        displayCultureScore(data);

    } catch (error) {
        console.error('Error refreshing culture score:', error);
        alert('Failed to refresh culture score. Please try again.');
    } finally {
        // Reset button state
        const refreshBtn = document.querySelector('.culture-refresh-btn');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Analysis';
        refreshBtn.disabled = false;
    }
} 