let currentSurveyId = null;
let currentResponseId = null;

const loadSurvey = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentSurveyId = urlParams.get('id');
    currentResponseId = urlParams.get('responseId');

    if (!currentSurveyId) {
        window.location.href = '/surveys.html';
        return;
    }

    try {
        // Fetch both survey and response (if exists) in parallel
        const [surveyResponse, responseResponse] = await Promise.all([
            fetch(`/api/survey/${currentSurveyId}`),
            currentResponseId ? fetch(`/api/responses/${currentResponseId}`) : Promise.resolve(null)
        ]);

        const survey = await surveyResponse.json();
        const response = responseResponse ? await responseResponse.json() : null;

        document.getElementById('surveyTitle').textContent = survey.title;
        document.getElementById('surveyDescription').textContent = survey.description;

        const questionContainer = document.getElementById('questionContainer');
        questionContainer.innerHTML = survey.questions.map((question, index) => `
            <div class="question-group">
                <label for="${question._id}">${question.text}</label>
                ${generateQuestionInput(question, question._id, response?.answers[`${question._id}`])}
            </div>
        `).join('');

        // If there's a response, disable all inputs
        if (response) {
            const questionGroups = questionContainer.querySelectorAll('.question-group');
            questionGroups.forEach(group => {
                group.classList.add('disabled');
                const inputs = group.querySelectorAll('input, textarea, select');
                inputs.forEach(input => input.disabled = true);
            });
            
            // Hide submit button and show back button
            document.querySelector('.form-actions').innerHTML = `
                <button type="button" class="btn-secondary" onclick="window.location.href='/surveys.html'">
                    <i class="fas fa-arrow-left"></i> Back to Surveys
                </button>
            `;
        }
    } catch (error) {
        console.error('Error loading survey:', error);
        alert('Failed to load survey. Please try again.');
    }
};

const generateQuestionInput = (question, questionId, value = '') => {
    switch (question.type) {
        case 'rating':
            return `
                <div class="rating-group">
                    <div class="rating-options">
                        ${[1,2,3,4,5].map(num => `
                            <div class="rating-option">
                                <input type="radio" 
                                    id="${questionId}_${num}" 
                                    name="${questionId}" 
                                    value="${num}" 
                                    ${value === num.toString() ? 'checked' : ''}
                                    required>
                                <label for="${questionId}_${num}">${num}</label>
                            </div>
                        `).join('')}
                    </div>
                    <div class="rating-labels">
                        <span>Poor</span>
                        <span>Excellent</span>
                    </div>
                </div>
            `;
        case 'text':
            return `<textarea id="${questionId}" name="${questionId}" rows="3" required>${value}</textarea>`;
        case 'choice':
            return `
                <select id="${questionId}" name="${questionId}" required>
                    <option value="" ${!value ? 'selected' : ''}>Select an option</option>
                    ${question.options.map(opt => 
                        `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
                    ).join('')}
                </select>
            `;
        default:
            return `<input type="text" id="${questionId}" name="${questionId}" value="${value}" required>`;
    }
};

const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Clear any existing error messages
    clearErrorMessages();
    
    // Check for incomplete fields and collect form data
    const formData = new FormData(event.target);
    const answers = {};
    let hasErrors = false;
    
    // Get all question elements
    const questionGroups = document.querySelectorAll('.question-group');
    
    questionGroups.forEach((group) => {
        const questionLabel = group.querySelector('label').textContent;
        // Extract the question ID from the input name
        const input = group.querySelector('input, textarea, select');
        const inputName = input.getAttribute('name');
        
        // Special handling for rating type questions
        const ratingGroup = group.querySelector('.rating-group');
        if (ratingGroup) {
            const selectedRating = formData.get(inputName);
            if (!selectedRating) {
                hasErrors = true;
                showError(group, 'Please select a rating');
            } else {
                answers[inputName] = selectedRating;
            }
        } else {
            const value = formData.get(inputName);
            if (!value || value.trim() === '') {
                hasErrors = true;
                showError(group, 'This field is required');
            } else {
                answers[inputName] = value;
            }
        }
    });
    
    if (hasErrors) {
        // Scroll to the first error
        const firstError = document.querySelector('.error-message');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    try {
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        const response = await fetch('/api/submit-survey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                surveyId: currentSurveyId,
                answers
            }),
        });

        if (response.ok) {
            alert('Survey submitted successfully!');
            window.location.href = '/surveys.html';
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to submit survey');
        }
    } catch (error) {
        console.error('Error submitting survey:', error);
        alert(error.message || 'Failed to submit survey. Please try again.');
    } finally {
        // Re-enable submit button
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Survey';
    }
};

// Helper function to show error message
const showError = (element, message) => {
    // Remove any existing error message
    const existingError = element.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create and add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    element.appendChild(errorDiv);
    
    // Add error class to the question group
    element.classList.add('has-error');
};

// Helper function to clear all error messages
const clearErrorMessages = () => {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.has-error').forEach(element => {
        element.classList.remove('has-error');
    });
};

function logout() {
    fetch('/api/logout', { method: 'POST' })
        .then(() => window.location.href = '/');
}

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

// Update the initialization code
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) return;

    loadSurvey();
    
    document.getElementById('surveyForm').addEventListener('submit', handleSubmit);
});

// Add these styles to your styles.css
const styles = `
.error-message {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.has-error input,
.has-error textarea,
.has-error select {
    border-color: #dc2626;
}

.question-group {
    margin-bottom: 1.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    transition: all 0.3s ease;
}

.has-error {
    background-color: #fef2f2;
    border: 1px solid #fee2e2;
}

.submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}
`; 