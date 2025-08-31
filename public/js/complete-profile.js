document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    fetch('/api/check-session')
        .then(res => res.json())
        .then(data => {
            if (!data.user) {
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Session check failed:', error);
            window.location.href = '/';
        });

    // Load existing profile data if any
    fetch('/api/employee/profile')
        .then(res => res.json())
        .then(data => {
            if (data && data.name) {
                document.getElementById('name').value = data.name;
                document.querySelector(`input[name="gender"][value="${data.gender}"]`).checked = true;
                document.getElementById('team').value = data.team;
                // Format date to YYYY-MM-DD for input
                const date = new Date(data.dateOfBirth);
                const formattedDate = date.toISOString().split('T')[0];
                document.getElementById('dateOfBirth').value = formattedDate;
            }
        })
        .catch(error => console.error('Failed to load profile:', error));

    // Handle form submission
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            gender: document.querySelector('input[name="gender"]:checked').value,
            team: document.getElementById('team').value,
            dateOfBirth: document.getElementById('dateOfBirth').value
        };

        try {
            const response = await fetch('/api/employee/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            // Redirect to surveys page after successful profile completion
            window.location.href = '/surveys.html';
        } catch (error) {
            alert(error.message || 'Failed to update profile');
        }
    });
}); 