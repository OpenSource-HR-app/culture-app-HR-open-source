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

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) return;

    fetchProfile();
    setupTabs();
    
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updatePassword();
    });

    document.getElementById('emergencyContactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEmergencyContact();
    });
});

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function fetchProfile() {
    try {
        const response = await fetch('/api/employee/profile');
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/index.html';
                return;
            }
            throw new Error('Failed to fetch profile');
        }
        
        const profile = await response.json();
        if (profile.email) {
            // Populate form fields if profile exists
            document.getElementById('name').value = profile.name || '';
            document.getElementById('gender').value = profile.gender || '';
            document.getElementById('team').value = profile.team || '';
            if (profile.dateOfBirth) {
                document.getElementById('dateOfBirth').value = new Date(profile.dateOfBirth).toISOString().split('T')[0];
            }
            
            // Populate emergency contact fields
            if (profile.emergencyContact) {
                document.getElementById('emergencyName').value = profile.emergencyContact.name || '';
                document.getElementById('emergencyPhone').value = profile.emergencyContact.phone || '';
            }
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        alert('Failed to load profile data');
    }
}

async function saveProfile() {
    try {
        const formData = {
            name: document.getElementById('name').value,
            gender: document.getElementById('gender').value,
            team: document.getElementById('team').value,
            dateOfBirth: document.getElementById('dateOfBirth').value
        };

        const response = await fetch('/api/employee/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to save profile');
        }

        alert('Profile saved successfully!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile');
    }
}

async function updatePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const currentPassword = document.getElementById('currentPassword').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch('/api/employee/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update password');
        }

        alert('Password updated successfully!');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        console.error('Error updating password:', error);
        alert(error.message || 'Failed to update password');
    }
}

async function saveEmergencyContact() {
    try {
        const formData = {
            emergencyContact: {
                name: document.getElementById('emergencyName').value,
                phone: document.getElementById('emergencyPhone').value
            }
        };

        const response = await fetch('/api/employee/emergency-contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to save emergency contact');
        }

        alert('Emergency contact saved successfully!');
    } catch (error) {
        console.error('Error saving emergency contact:', error);
        alert('Failed to save emergency contact');
    }
}

function logout() {
    fetch('/api/logout', {
        method: 'POST'
    }).then(() => {
        window.location.href = '/index.html';
    });
} 