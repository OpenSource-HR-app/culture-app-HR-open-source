// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // Update active tab
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Show relevant form
            const formId = e.target.dataset.tab === 'login' ? 'loginForm' : 'signupForm';
            ['loginForm', 'signupForm', 'otpForm'].forEach(id => {
                document.getElementById(id).style.display = 'none';
            });
            document.getElementById(formId).style.display = 'block';
        });
    });
});

let currentEmail = '';

const handleLogin = async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        
        if (response.ok) {
            // Check profile completion before redirecting
            const isProfileComplete = await checkProfileCompletion();
            window.location.href = isProfileComplete ? '/surveys.html' : '/complete-profile.html';
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
    }
};

const handleSignup = async (event) => {
    event.preventDefault();
    const email = document.getElementById('signupEmail').value;
    currentEmail = email;

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        
        if (response.ok) {
            // Show OTP form
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById('otpForm').style.display = 'block';
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
    }
};

const handleOTPVerification = async (event) => {
    event.preventDefault();
    const otp = document.getElementById('otp').value;

    try {
        const response = await fetch('/api/verify-signup-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: currentEmail, otp }),
        });

        const data = await response.json();
        
        if (response.ok) {
            // Show set password form
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById('setPasswordForm').style.display = 'block';
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
    }
};

const checkProfileCompletion = async () => {
    try {
        const response = await fetch('/api/check-profile');
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        if (!data.isProfileComplete) {
            window.location.href = '/complete-profile.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Profile check failed:', error);
        return false;
    }
};

// Event Listeners
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('signupForm').addEventListener('submit', handleSignup);
document.getElementById('otpForm').addEventListener('submit', handleOTPVerification); 