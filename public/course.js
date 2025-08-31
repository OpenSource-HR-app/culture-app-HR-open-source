document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) return;

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    if (!courseId) {
        window.location.href = '/courses.html';
        return;
    }

    try {
        const response = await fetch(`/api/courses/${courseId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch course');
        }
        
        const course = await response.json();
        displayCourse(course);
        document.title = `${course.title} - Culture App`;
    } catch (error) {
        console.error('Error:', error);
        const contentList = document.getElementById('contentList');
        contentList.innerHTML = '<p class="error-message">Failed to load course. Please try again later.</p>';
    }
});

function displayCourse(course) {
    document.getElementById('courseTitle').textContent = course.title;
    document.getElementById('courseDescription').textContent = course.description;

    const contentList = document.getElementById('contentList');
    contentList.innerHTML = '';

    course.content.forEach((item, index) => {
        const contentCard = document.createElement('div');
        contentCard.className = 'content-card';
        
        // Check if description is long enough to need truncation
        const isLongDescription = item.text.length > 150;
        const truncatedText = isLongDescription ? item.text.substring(0, 150) + '...' : item.text;
        
        contentCard.innerHTML = `
            <div class="content-number">${index + 1}</div>
            <div class="content-details">
                <h3>${item.title}</h3>
                <div class="content-description">
                    <p class="description-text ${isLongDescription ? 'truncated' : ''}">${truncatedText}</p>
                    ${isLongDescription ? `
                        <p class="description-text full" style="display: none;">${item.text}</p>
                        <button class="see-more-btn" onclick="toggleDescription(this)">
                            See more
                        </button>
                    ` : ''}
                </div>
            </div>
            ${item.link ? `
                <div class="content-action">
                    <a href="${item.link}" target="_blank" class="link-btn">
                        <i class="fas fa-external-link-alt"></i> Open Resource
                    </a>
                </div>
            ` : ''}
        `;
        
        contentList.appendChild(contentCard);
    });
}

function toggleDescription(button) {
    const card = button.closest('.content-card');
    const truncatedText = card.querySelector('.description-text.truncated');
    const fullText = card.querySelector('.description-text.full');
    
    if (truncatedText.style.display !== 'none') {
        // Show full text
        truncatedText.style.display = 'none';
        fullText.style.display = 'block';
        button.textContent = 'See less';
    } else {
        // Show truncated text
        truncatedText.style.display = 'block';
        fullText.style.display = 'none';
        button.textContent = 'See more';
    }
}



async function checkSession() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!response.ok || !data.user) {
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