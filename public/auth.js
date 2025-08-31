let currentEmail = '';
let isPasswordReset = false;
let appSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Load app settings
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            appSettings = await response.json();
            updateLoginPage();
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // Update active tab
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Show relevant form
            const formId = e.target.dataset.tab === 'login' ? 'loginForm' : 'signupForm';
            ['loginForm', 'signupForm', 'otpForm', 'setPasswordForm'].forEach(id => {
                document.getElementById(id).style.display = 'none';
            });
            document.getElementById(formId).style.display = 'block';
        });
    });

    // Login Form Handler
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Check profile completion before redirecting
            const isProfileComplete = await checkProfileCompletion();
            window.location.href = isProfileComplete ? '/surveys.html' : '/complete-profile.html';
        } catch (error) {
            alert(error.message || 'Login failed');
        }
    });

    // Signup Form Handler
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        currentEmail = email;

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Show OTP form
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById('otpForm').style.display = 'block';
        } catch (error) {
            alert(error.message || 'Signup failed');
        }
    });

    // OTP Verification Handler
    document.getElementById('otpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('otp').value;

        try {
            const response = await fetch('/api/verify-signup-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, otp })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Show set password form
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById('setPasswordForm').style.display = 'block';
        } catch (error) {
            alert(error.message || 'OTP verification failed');
        }
    });

    // Set Password Handler
    document.getElementById('setPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        try {
            // Create account
            const response = await fetch('/api/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: currentEmail, 
                    password: newPassword 
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Auto login after successful account creation
            const loginResponse = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: currentEmail, 
                    password: newPassword 
                })
            });

            const loginData = await loginResponse.json();
            if (!loginResponse.ok) throw new Error(loginData.error);

            // Redirect to profile completion page
            window.location.href = '/complete-profile.html';
        } catch (error) {
            alert(error.message || 'Failed to set password');
        }
    });

    // Forgot Password Handler
    document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        if (!email) {
            alert('Please enter your email first');
            return;
        }
        
        const allowedDomain = appSettings.primaryDomain || 'admin.com';
        if (!email.endsWith(`@${allowedDomain}`)) {
            alert(`Please use your @${allowedDomain} email`);
            return;
        }

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            currentEmail = email;
            isPasswordReset = true;

            // Hide all forms and show OTP form
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById('resetPasswordOtpForm').style.display = 'block';
            alert('OTP has been sent to your email');
        } catch (error) {
            alert(error.message || 'Failed to process request');
        }
    });

    // Reset Password OTP Verification Handler
    document.getElementById('resetPasswordOtpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('resetOtp').value;

        try {
            const response = await fetch('/api/verify-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, otp })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Show new password form
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById('newPasswordForm').style.display = 'block';
        } catch (error) {
            alert(error.message || 'OTP verification failed');
        }
    });

    // New Password Form Handler
    document.getElementById('newPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('resetNewPassword').value;
        const confirmPassword = document.getElementById('resetConfirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentEmail,
                    password: newPassword
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert('Password reset successful! Please login with your new password.');
            
            // Show login form and clear all inputs
            document.querySelectorAll('.auth-form').forEach(form => {
                form.style.display = 'none';
                form.reset();
            });
            document.getElementById('loginForm').style.display = 'block';
            
            // Reset the flags
            currentEmail = '';
            isPasswordReset = false;
        } catch (error) {
            alert(error.message || 'Failed to reset password');
        }
    });
});

// Update login page with settings
function updateLoginPage() {
    // Update organization name
    if (appSettings.organizationName) {
        document.getElementById('welcomeTitle').textContent = `Welcome to ${appSettings.organizationName}`;
        document.title = `${appSettings.organizationName} - Login`;
    }
    
    // Update logo
    if (appSettings.logoUrl) {
        document.getElementById('loginLogo').src = appSettings.logoUrl;
    }
    
    // Update email placeholders
    const allowedDomain = appSettings.primaryDomain || 'admin.com';
    document.getElementById('loginEmail').placeholder = `your@${allowedDomain}`;
    document.getElementById('signupEmail').placeholder = `your@${allowedDomain}`;
}

// Add profile check function
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