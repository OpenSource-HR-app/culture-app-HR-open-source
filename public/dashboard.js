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

// Initialize dashboard
async function initDashboard() {
    // Load app settings first
    let appSettings = {};
    try {
        const settingsResponse = await fetch('/api/settings');
        if (settingsResponse.ok) {
            appSettings = await settingsResponse.json();
            console.log('App settings loaded:', appSettings);
            updateDashboardWithSettings(appSettings);
        } else {
            console.error('Failed to load settings:', settingsResponse.status);
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    try {
        // Fetch employee profile for name and team
        const profileResponse = await fetch('/api/employee/profile');
        if (!profileResponse.ok) {
            throw new Error('Failed to fetch employee profile');
        }
        const profileData = await profileResponse.json();
        console.log('Profile data:', profileData);
        
        // Update dashboard greeting
        const dashboardName = document.getElementById('dashboardName');
        if (dashboardName) {
            dashboardName.textContent = profileData.name || profileData.email;
        } else {
            console.error('Dashboard name element not found');
        }

        // Capitalize team name for display
        const teamName = profileData.team.charAt(0).toUpperCase() + profileData.team.slice(1);
        document.querySelector('.dashboard-card .card-title i.fa-bullseye')
            .closest('.card-title').innerHTML = `
                <i class="fas fa-bullseye"></i>
                ${teamName} Team Goals
                <span id="teamGoalsQuarter" class="quarter-badge"></span>
            `;

        // Fetch upcoming birthdays (only if enabled)
        if (appSettings.features?.birthdays !== false) {
            const birthdaysResponse = await fetch('/api/upcoming-birthdays');
            if (!birthdaysResponse.ok) {
                throw new Error('Failed to fetch birthdays');
            }
            const birthdaysData = await birthdaysResponse.json();
        
        // Display birthdays
        const birthdaysList = document.getElementById('birthdaysList');
        birthdaysList.innerHTML = `
            <table class="birthdays-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${birthdaysData.length ? 
                        birthdaysData
                            .slice(0, 8)
                            .map(birthday => {
                                const date = new Date(birthday.dateOfBirth);
                                const today = new Date();
                                const isBirthdayToday = date.getMonth() === today.getMonth() && 
                                                      date.getDate() === today.getDate();
                                
                                const formattedDate = date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                });
                                
                                return `
                                    <tr class="${isBirthdayToday ? 'birthday-today' : ''}">
                                        <td>
                                            <i class="fas fa-gift"></i>
                                            ${birthday.name}
                                            ${isBirthdayToday ? 
                                                '<span class="birthday-today-icon" title="Birthday Today!">🎂</span>' 
                                                : ''}
                                        </td>
                                        <td>${formattedDate}</td>
                                    </tr>
                                `;
                            })
                            .join('') 
                        : 
                        '<tr><td colspan="2" class="no-birthdays">No upcoming birthdays</td></tr>'
                    }
                </tbody>
            </table>
        `;
        }

        // Fetch survey statistics (only if enabled)
        if (appSettings.features?.surveys !== false) {
            const statsResponse = await fetch('/api/survey-stats');
            if (!statsResponse.ok) {
                throw new Error('Failed to fetch survey statistics');
            }
            const statsData = await statsResponse.json();
        
            // Update quarter badge for survey stats
            if (statsData.quarter) {
                document.getElementById('surveyQuarter').textContent = statsData.quarter;
            }

            // Update survey statistics display
            const surveyStatsContainer = document.getElementById('surveyStats');
            
            if (statsData.surveys.length === 0) {
                surveyStatsContainer.innerHTML = '<p class="placeholder-text">No surveys available</p>';
            } else {
                surveyStatsContainer.innerHTML = `
                    <table class="survey-stats-table">
                        <tbody>
                            ${statsData.surveys.map(survey => {
                                const completionPercentage = Math.round((survey.completedCount / statsData.totalEmployees) * 100);
                                return `
                                    <tr>
                                        <td>
                                            <div class="survey-name">${survey.title} </div>
                                            <span class="response-count">
                                                ${survey.completedCount}/${statsData.totalEmployees} responses
                                            </span>
                                            <div class="stats-row">
                                                <div class="progress-bar">
                                                    <div class="progress" style="width: ${completionPercentage}%"></div>
                                                </div>
                                                <span class="percentage">${completionPercentage}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }
        }

        // Fetch team goals (only if enabled)
        if (appSettings.features?.teamGoals !== false) {
            const goalsResponse = await fetch('/api/team-goals');
            if (!goalsResponse.ok) {
                throw new Error('Failed to fetch team goals');
            }
            const goalsData = await goalsResponse.json();
        
            // Update quarter badge
            const now = new Date();
            const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}Y${now.getFullYear().toString().slice(-2)}`;
            document.getElementById('teamGoalsQuarter').textContent = quarter;

            // Display goals
            const teamGoalsContainer = document.getElementById('teamGoals');
            
            if (goalsData.length === 0) {
                teamGoalsContainer.innerHTML = '<div class="no-goals">No goals set for this quarter</div>';
            } else {
                teamGoalsContainer.innerHTML = goalsData
                    .map(goal => `
                        <div class="goal-item">
                            <div class="goal-name">${goal.name}</div>
                            <div class="goal-description">${goal.description}</div>
                        </div>
                    `)
                    .join('');
            }
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        const birthdaysList = document.getElementById('birthdaysList');
        if (birthdaysList) {
            birthdaysList.innerHTML = '<p class="placeholder-text">Error loading birthdays</p>';
        }
        const surveyStats = document.getElementById('surveyStats');
        if (surveyStats) {
            surveyStats.innerHTML = '<p class="placeholder-text">Error loading survey statistics</p>';
        }
        const teamGoals = document.getElementById('teamGoals');
        if (teamGoals) {
            teamGoals.innerHTML = '<p class="placeholder-text">Error loading team goals</p>';
        }
    }
}

// Update dashboard with settings
function updateDashboardWithSettings(settings) {
    // Update organization name in title
    if (settings.organizationName) {
        document.title = `${settings.organizationName} - Dashboard`;
    }
    
    // Hide disabled features
    if (settings.features?.birthdays === false) {
        const birthdaysCard = document.querySelector('.birthdays-card');
        if (birthdaysCard) {
            birthdaysCard.style.display = 'none';
        }
    }
    
    if (settings.features?.surveys === false) {
        const surveyStatsCard = document.querySelector('.dashboard-card:has(#surveyStats)');
        if (surveyStatsCard) {
            surveyStatsCard.style.display = 'none';
        }
    }
    
    if (settings.features?.teamGoals === false) {
        const teamGoalsCard = document.querySelector('.team-goals-card');
        if (teamGoalsCard) {
            teamGoalsCard.style.display = 'none';
        }
    }
}

// Check session and initialize dashboard when the page loads
(async () => {
    const isAuthenticated = await checkSession();
    if (isAuthenticated) {
        await initDashboard();
    }
})();