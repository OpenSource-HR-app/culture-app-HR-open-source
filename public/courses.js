document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) return;

    // Check if courses are enabled
    try {
        const settingsResponse = await fetch('/api/settings');
        if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            if (settings.features?.courses === false) {
                window.location.href = '/dashboard.html';
                return;
            }
        }
    } catch (error) {
        console.error('Failed to check settings:', error);
    }

    try {
        const response = await fetch('/api/courses');
        if (!response.ok) {
            throw new Error('Failed to fetch courses');
        }
        
        const courses = await response.json();
        displayCourses(courses);
    } catch (error) {
        console.error('Error:', error);
        const courseList = document.getElementById('courseList');
        courseList.innerHTML = '<p class="error-message">Failed to load courses. Please try again later.</p>';
    }
});

function displayCourses(courses) {
    const courseList = document.getElementById('courseList');
    courseList.innerHTML = '';

    if (courses.length === 0) {
        courseList.innerHTML = '<p>No courses available.</p>';
        return;
    }

    courses.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-card';
        
        courseElement.innerHTML = `
            <div class="course-info">
                <h2>${course.title}</h2>
                <p>${course.description}</p>
            </div>
            <button onclick="window.location.href='/course.html?id=${course._id}'">
                View Course <i class="fas fa-arrow-right"></i>
            </button>
        `;
        
        courseList.appendChild(courseElement);
    });
}

// Reuse the session check function
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