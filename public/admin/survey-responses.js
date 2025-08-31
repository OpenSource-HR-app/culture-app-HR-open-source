let survey = null;
let responses = [];

async function loadSurveyResponses() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const surveyId = urlParams.get('id');
        
        if (!surveyId) {
            throw new Error('No survey ID provided');
        }

        // Use existing surveys and responses from the dashboard
        const [surveysRes, responsesRes] = await Promise.all([
            fetch('/api/admin/surveys'),
            fetch('/api/admin/responses')
        ]);

        if (!surveysRes.ok || !responsesRes.ok) {
            throw new Error('Failed to fetch data');
        }

        const surveys = await surveysRes.json();
        survey = surveys.find(s => s._id === surveyId);
        
        if (!survey) {
            throw new Error('Survey not found');
        }

        responses = (await responsesRes.json())
            .filter(r => r.surveyId === surveyId);

        // Update page title and response count
        document.getElementById('surveyTitle').textContent = survey.title;
        document.getElementById('responseCount').textContent = 
            `${responses.length} Response${responses.length === 1 ? '' : 's'}`;

        displayQuestionResponses();
    } catch (error) {
        console.error('Error loading survey responses:', error);
        document.getElementById('questionsList').innerHTML = `
            <div class="error-message">
                <p>Error loading responses. Please try again.</p>
                <button onclick="loadSurveyResponses()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}

function displayQuestionResponses() {
    const questionsList = document.getElementById('questionsList');
    
    if (!responses.length) {
        questionsList.innerHTML = '<div class="no-data">No responses yet</div>';
        return;
    }

    // Helper function to generate star rating HTML
    const getStarRating = (rating) => {
        const fullStar = '<i class="fas fa-star"></i>';
        const emptyStar = '<i class="far fa-star"></i>';
        return Array(5).fill('')
            .map((_, i) => i < rating ? fullStar : emptyStar)
            .join('');
    };

    // Format the answer display based on question type
    const formatAnswer = (answer, questionType) => {
        if (!answer) return 'No response';
        
        switch (questionType) {
            case 'rating':
                return `
                    <div class="star-rating">
                        ${getStarRating(parseInt(answer))}
                        <span class="rating-number">${answer}/5</span>
                    </div>`;
            case 'choice':
            case 'text':
                return answer;
            default:
                return answer;
        }
    };

    questionsList.innerHTML = survey.questions.map((question, index) => {
        // Get answers for this question
        const answers = responses.map(response => ({
            answer: response.answers[question._id],
            email: response.email,
            timestamp: response.timestamp
        }));

        return `
            <div class="question-block">
                <div class="question-header" onclick="toggleQuestion(${index})">
                    <div class="question-title">
                        <i class="fas fa-chevron-right question-toggle"></i>
                        ${question.text}
                        <span class="answer-count">${answers.length} answers</span>
                    </div>
                </div>
                <div class="answers-list collapsed" id="question-${index}-answers">
                    ${answers.map(answer => `
                        <div class="answer-item">
                            <div class="answer-left">
                                <div class="respondent">${answer.email}:</div>
                                <div class="answer-content">
                                    ${formatAnswer(answer.answer, question.type)}
                                </div>
                            </div>
                            <div class="answer-date">
                                ${formatDate(answer.timestamp)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Add toggle function for questions
function toggleQuestion(index) {
    const answersDiv = document.getElementById(`question-${index}-answers`);
    const questionBlock = answersDiv.closest('.question-block');
    const chevron = questionBlock.querySelector('.question-toggle');
    
    answersDiv.classList.toggle('collapsed');
    chevron.style.transform = answersDiv.classList.contains('collapsed') ? 'rotate(0deg)' : 'rotate(90deg)';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

function goBack() {
    window.location.replace('/admin/dashboard.html?section=responses');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', loadSurveyResponses); 