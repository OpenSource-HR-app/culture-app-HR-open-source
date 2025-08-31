let currentSettings = {};

// Check admin authentication and load settings
(async () => {
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) return;

    await loadSettings();
})();

async function checkAdminAuth() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!response.ok || !data.user || !data.user.isAdmin) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

async function loadSettings() {
    try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
            throw new Error('Failed to fetch settings');
        }
        
        currentSettings = await response.json();
        populateSettingsForm();
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load settings', 'error');
    }
}

function populateSettingsForm() {
    // Organization settings
    document.getElementById('organizationName').value = currentSettings.organizationName || 'Culture App';
            document.getElementById('primaryDomain').value = currentSettings.primaryDomain || 'admin.com';
    
    // API credentials
    document.getElementById('gmailUser').value = currentSettings.gmailUser || '';
    document.getElementById('gmailAppPassword').value = currentSettings.gmailAppPassword || '';
    document.getElementById('openaiApiKey').value = currentSettings.openaiApiKey || '';
    
    // Feature toggles
    document.getElementById('surveysEnabled').checked = currentSettings.features?.surveys !== false;
    document.getElementById('coursesEnabled').checked = currentSettings.features?.courses !== false;
    document.getElementById('birthdaysEnabled').checked = currentSettings.features?.birthdays !== false;
    document.getElementById('teamGoalsEnabled').checked = currentSettings.features?.teamGoals !== false;
    
    // Logo
    if (currentSettings.logoUrl) {
        document.getElementById('currentLogo').src = currentSettings.logoUrl;
    }
}

// Organization Settings Form
document.getElementById('orgSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {
            organizationName: formData.get('organizationName'),
            primaryDomain: formData.get('primaryDomain'),
            features: currentSettings.features || {}
        };
        
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Failed to update settings');
        }

        currentSettings = await response.json();
        showNotification('Organization settings updated successfully', 'success');
    } catch (error) {
        console.error('Error updating organization settings:', error);
        showNotification('Failed to update organization settings', 'error');
    }
});

// Logo Upload Form
document.getElementById('logoUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const file = formData.get('logo');
        
        if (!file) {
            showNotification('Please select a file', 'error');
            return;
        }
        
        const uploadFormData = new FormData();
        uploadFormData.append('logo', file);
        
        const response = await fetch('/api/admin/settings/logo', {
            method: 'POST',
            body: uploadFormData
        });

        if (!response.ok) {
            throw new Error('Failed to upload logo');
        }

        const result = await response.json();
        document.getElementById('currentLogo').src = result.logoUrl;
        currentSettings = result.settings;
        showNotification('Logo uploaded successfully', 'success');
        
        // Reset form
        e.target.reset();
    } catch (error) {
        console.error('Error uploading logo:', error);
        showNotification('Failed to upload logo', 'error');
    }
});



// Features Form
document.getElementById('featuresForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {
            organizationName: currentSettings.organizationName || 'Culture App',
            primaryDomain: currentSettings.primaryDomain || 'admin.com',
            features: {
                surveys: formData.has('surveys'),
                courses: formData.has('courses'),
                birthdays: formData.has('birthdays'),
                teamGoals: formData.has('teamGoals')
            }
        };
        
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Failed to update features');
        }

        currentSettings = await response.json();
        showNotification('Features updated successfully', 'success');
    } catch (error) {
        console.error('Error updating features:', error);
        showNotification('Failed to update features', 'error');
    }
});

// API Credentials Form
document.getElementById('apiCredentialsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {
            organizationName: currentSettings.organizationName || 'Culture App',
            primaryDomain: currentSettings.primaryDomain || 'admin.com',
            gmailUser: formData.get('gmailUser'),
            gmailAppPassword: formData.get('gmailAppPassword'),
            openaiApiKey: formData.get('openaiApiKey'),
            features: currentSettings.features || {}
        };
        
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Failed to update API credentials');
        }

        currentSettings = await response.json();
        showNotification('API credentials updated successfully', 'success');
    } catch (error) {
        console.error('Error updating API credentials:', error);
        showNotification('Failed to update API credentials', 'error');
    }
});

// Remove Logo
async function removeLogo() {
    if (!confirm('Are you sure you want to remove the current logo?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/settings/logo', {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to remove logo');
        }

        currentSettings = await response.json();
        document.getElementById('currentLogo').src = '../images/black-logo-horizontal.png';
        showNotification('Logo removed successfully', 'success');
    } catch (error) {
        console.error('Error removing logo:', error);
        showNotification('Failed to remove logo', 'error');
    }
}

// File upload preview
document.getElementById('logoFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('currentLogo').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Logout function is now available from admin-dashboard.js 