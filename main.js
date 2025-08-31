import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import session from 'express-session';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();

// Export app for testing
export { app };
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Function to get OpenAI API key from settings or environment variables
const getOpenAIApiKey = async () => {
    try {
        const settings = await Settings.findOne();
        return settings?.openaiApiKey || process.env.OPENAI_API_KEY;
    } catch (error) {
        console.error('Error getting OpenAI API key:', error);
        return process.env.OPENAI_API_KEY;
    }
};

// Initialize OpenAI with API key
let openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Function to update OpenAI client with new API key
const updateOpenAIClient = async () => {
    const apiKey = await getOpenAIApiKey();
    openai = new OpenAI({ apiKey });
};

// MongoDB Connection
await mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define MongoDB Schemas
const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    type: { type: String, enum: ['rating', 'text', 'choice'], required: true },
    options: [String] // Optional, used only for choice type
});

const SurveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: [QuestionSchema]
});

const ResponseSchema = new mongoose.Schema({
    email: { type: String, required: true },
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
    answers: { type: Map, of: String },
    timestamp: { type: Date, default: Date.now }
});

const EmployeeSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    team: { type: String, enum: ['tech', 'sales', 'product', 'marketing'], required: true },
    dateOfBirth: { type: Date, required: true },
    password: { type: String }, // Optional initially, but required once set
    emergencyContact: {
        name: { type: String },
        phone: { type: String }
    },
    lastUpdated: { type: Date, default: Date.now },
    aiSummary: {
        text: String,
        lastUpdated: Date
    }
});

// Create models from schemas
const Survey = mongoose.model('Survey', SurveySchema);
const Response = mongoose.model('Response', ResponseSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);

// Settings Schema
const SettingsSchema = new mongoose.Schema({
    organizationName: { type: String, default: 'Culture App' },
            primaryDomain: { type: String, default: 'admin.com' },
    logoUrl: { type: String },
    logoFile: { type: String }, // For uploaded logo file

    // Email configuration
    gmailUser: { type: String },
    gmailAppPassword: { type: String },

    // OpenAI configuration
    openaiApiKey: { type: String },

    features: {
        surveys: { type: Boolean, default: true },
        courses: { type: Boolean, default: true },
        birthdays: { type: Boolean, default: true },
        teamGoals: { type: Boolean, default: true }
    },
    lastUpdated: { type: Date, default: Date.now }
});

const Settings = mongoose.model('Settings', SettingsSchema);

// Admin Model
const AdminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Admin = mongoose.model('Admin', AdminSchema);

// Update session configuration for production
const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Add trust proxy for production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // trust first proxy
    sessionConfig.cookie.secure = true; // serve secure cookies
}

app.use(session(sessionConfig));

// Add CORS configuration for production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', 'https://culture-app.onrender.com');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        next();
    });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define routes BEFORE static file serving
// API Routes
app.get('/api/check-session', (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ 
                error: 'Not authenticated',
                sessionExists: false,
                user: null
            });
        }
        
        res.json({
            sessionExists: true,
            user: req.session.user,
            sessionID: req.sessionID
        });
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({ error: 'Failed to check session' });
    }
});

app.get('/api/employee/responses', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        console.log('Fetching responses for email:', req.session.user.email);

        const responses = await Response.find({ 
            email: req.session.user.email 
        }).populate({
            path: 'surveyId',
            select: '_id title'
        });

        console.log('Found responses:', responses);

        const formattedResponses = responses.map(response => ({
            _id: response._id,
            email: response.email,
            surveyId: response.surveyId._id,
            surveyTitle: response.surveyId.title,
            answers: Object.fromEntries(response.answers),
            timestamp: response.timestamp
        }));

        res.json(formattedResponses);
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ 
            error: 'Failed to fetch responses',
            details: error.message
        });
    }
});

// Other API routes...

// Add this middleware function before the routes
const checkAdminAuth = (req, res, next) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(401).json({ error: 'Not authorized' });
    }
    next();
};

// Then add the generate-summary endpoint
app.post('/api/admin/generate-summary', checkAdminAuth, async (req, res) => {
    try {
        const { employee, responses, forceRefresh } = req.body;

        // Check if employee has any survey responses
        if (!responses || responses.length === 0) {
            return res.json({ 
                summary: "Not enough survey data available to generate a summary." 
            });
        }

        // Find employee in database
        const employeeDoc = await Employee.findById(employee._id);
        if (!employeeDoc) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Only return cached summary if forceRefresh is false and summary exists
        if (!forceRefresh && employeeDoc.aiSummary?.text) {
            return res.json({ summary: employeeDoc.aiSummary.text });
        }
        // Generate new summary with OpenAI
        const formattedResponses = responses.map(response => {
            const answers = response.answers.map(a => 
                `Question: ${a.question}\nAnswer: ${a.answer}`
            ).join('\n');
            return `Survey: ${response.surveyTitle}\n${answers}`;
        }).join('\n\n');

        const prompt = `Based on the following survey responses from ${employee.name} (${employee.team} team), 
            generate a brief, professional 7 crisp bulletpoints summary of their engagement, well-being, and general 
            sentiment in HTML format. Focus on key insights and patterns. Keep the tone positive and constructive.
            
            Survey Responses:
            ${formattedResponses}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a professional HR analyst who provides concise, insightful summaries of employee survey responses."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 400,
            temperature: 0.7
        });

        const summary = completion.choices[0].message.content.trim();

        // Store the new summary in the database
        await Employee.findByIdAndUpdate(employee._id, {
            aiSummary: {
                text: summary,
                lastUpdated: new Date()
            }
        });

        res.json({ summary });

    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

// Serve static files AFTER defining API routes
app.use(express.static('public'));

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Function to get email credentials from settings or environment variables
const getEmailCredentials = async () => {
    try {
        const settings = await Settings.findOne();
        return {
            user: settings?.gmailUser || process.env.GMAIL_USER,
            pass: settings?.gmailAppPassword || process.env.GMAIL_APP_PASSWORD
        };
    } catch (error) {
        console.error('Error getting email credentials:', error);
        return {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        };
    }
};

// Function to create transporter with current credentials
const createTransporter = async () => {
    const credentials = await getEmailCredentials();
    return nodemailer.createTransport({
        service: 'gmail',
        auth: credentials
    });
};

// Initialize transporter
let transporter = null;

// Add a verification step to ensure transporter is working
const verifyTransporter = async () => {
    try {
        transporter = await createTransporter();
        await transporter.verify();
        console.log('Nodemailer is configured correctly');
    } catch (error) {
        console.error('Nodemailer configuration error:', error);
        throw error;
    }
};

// Call verify after creating transporter
verifyTransporter();

// Store OTPs temporarily
const otpStore = new Map();

// Initialize admin account and settings if they don't exist
const initializeAdmin = async () => {
    try {
        const adminExists = await Admin.findOne({ email: 'admin@admin.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await Admin.create({
                email: 'admin@admin.com',
                password: hashedPassword
            });
            console.log('Admin account initialized');
        } else {
            console.log('Admin account already exists');
        }

        // Initialize settings if they don't exist
        const settingsExist = await Settings.findOne();
        if (!settingsExist) {
            await Settings.create({
                organizationName: 'Culture App',
                primaryDomain: 'admin.com',
                features: {
                    surveys: true,
                    courses: true,
                    birthdays: true,
                    teamGoals: true
                }
            });
            console.log('Settings initialized');
        } else {
            console.log('Settings already exist');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
};

initializeAdmin();

// Routes
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Get settings to check allowed domain
        const settings = await Settings.findOne();
        const allowedDomain = settings?.primaryDomain || 'admin.com';
        
        if (!email.endsWith(`@${allowedDomain}`)) {
            return res.status(400).json({ error: `Please use your @${allowedDomain} email` });
        }

        const employee = await Employee.findOne({ email });
        
        if (!employee || !employee.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, employee.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = { 
            email,
            id: employee._id 
        };
        
        await new Promise((resolve) => req.session.save(resolve));

        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/signup', async (req, res) => {
    const { email } = req.body;
    
    try {
        // Get settings to check allowed domain
        const settings = await Settings.findOne();
        const allowedDomain = settings?.primaryDomain || 'admin.com';
        
        if (!email.endsWith(`@${allowedDomain}`)) {
            return res.status(400).json({ error: `Please use your @${allowedDomain} email` });
        }

        const existingEmployee = await Employee.findOne({ email });
        if (existingEmployee && existingEmployee.password) {
            return res.status(400).json({ error: 'Account already exists' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStore.set(email, { otp, timestamp: Date.now(), isSignup: true });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Signup OTP for Culture App',
            html: `
                <h1>Welcome to Culture App!</h1>
                <p>Use the following OTP to complete your signup:</p>
                <h2 style="color: #007bff;">${otp}</h2>
                <p>This OTP will expire in 5 minutes.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/api/verify-signup-otp', (req, res) => {
    const { email, otp } = req.body;
    const storedData = otpStore.get(email);

    if (!storedData || storedData.otp !== parseInt(otp) || !storedData.isSignup) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() - storedData.timestamp > 300000) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP expired' });
    }

    otpStore.delete(email);
    res.json({ message: 'OTP verified successfully' });
});

app.post('/api/set-password', async (req, res) => {
    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await Employee.findOneAndUpdate(
            { email },
            { 
                email,
                password: hashedPassword
            },
            { upsert: true }
        );

        res.json({ message: 'Password set successfully' });
    } catch (error) {
        console.error('Set password error:', error);
        res.status(500).json({ error: 'Failed to set password' });
    }
});

// Add session check middleware
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Get all surveys
app.get('/api/surveys', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const surveys = await Survey.find({})
            .select({
                _id: 1,
                title: 1,
                description: 1,
                questions: 1  // Add this line to include questions
            });
        res.json(surveys);
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ error: 'Failed to fetch surveys' });
    }
});

app.get('/api/survey/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const survey = await Survey.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        res.json(survey);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch survey' });
    }
});

app.post('/api/submit-survey', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { surveyId, answers } = req.body;
    const email = req.session.user.email;

    try {
        const response = new Response({
            email,
            surveyId,
            answers
        });
        await response.save();
        res.json({ message: 'Survey submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit survey' });
    }
});

// Update logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Logged out successfully' });
    });
});

// Admin middleware
const adminAuth = async (req, res, next) => {
    if (!req.session.admin) {
        return res.status(401).json({ error: 'Admin authentication required' });
    }
    next();
};

// Admin routes
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set admin session with isAdmin flag
        req.session.user = {
            email: admin.email,
            isAdmin: true
        };
        
        await new Promise((resolve) => req.session.save(resolve));
        
        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/admin/surveys', checkAdminAuth, async (req, res) => {
    try {
        const surveys = await Survey.find().sort({ timestamp: -1 });
        res.json(surveys);
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ error: 'Failed to fetch surveys' });
    }
});

app.post('/api/admin/surveys', checkAdminAuth, async (req, res) => {
    try {
        const survey = new Survey(req.body);
        await survey.save();
        res.status(201).json(survey);
    } catch (error) {
        console.error('Error creating survey:', error);
        res.status(500).json({ error: 'Failed to create survey' });
    }
});

app.put('/api/admin/surveys/:surveyId', checkAdminAuth, async (req, res) => {
    try {
        const updatedSurvey = await Survey.findByIdAndUpdate(
            req.params.surveyId,
            req.body,
            { new: true }
        );
        if (!updatedSurvey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        res.json(updatedSurvey);
    } catch (error) {
        console.error('Error updating survey:', error);
        res.status(500).json({ error: 'Failed to update survey' });
    }
});

app.delete('/api/admin/surveys/:surveyId', checkAdminAuth, async (req, res) => {
    try {
        const deletedSurvey = await Survey.findByIdAndDelete(req.params.surveyId);
        if (!deletedSurvey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        // Also delete associated responses
        await Response.deleteMany({ surveyId: req.params.surveyId });
        res.json({ message: 'Survey and associated responses deleted successfully' });
    } catch (error) {
        console.error('Error deleting survey:', error);
        res.status(500).json({ error: 'Failed to delete survey' });
    }
});

app.get('/api/admin/responses', checkAdminAuth, async (req, res) => {
    try {
        const responses = await Response.find()
            .populate('surveyId', 'title')
            .sort({ timestamp: -1 });

        const formattedResponses = responses.map(response => ({
            _id: response._id,
            email: response.email,
            surveyId: response.surveyId._id,
            surveyTitle: response.surveyId.title,
            answers: Object.fromEntries(response.answers),
            timestamp: response.timestamp
        }));

        res.json(formattedResponses);
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

app.delete('/api/admin/responses/:responseId', checkAdminAuth, async (req, res) => {
    try {
        const deletedResponse = await Response.findByIdAndDelete(req.params.responseId);
        if (!deletedResponse) {
            return res.status(404).json({ error: 'Response not found' });
        }
        res.json({ message: 'Response deleted successfully' });
    } catch (error) {
        console.error('Error deleting response:', error);
        res.status(500).json({ error: 'Failed to delete response' });
    }
});

app.get('/api/employee/profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const employee = await Employee.findOne({ email: req.session.user.email });
        res.json(employee || { email: req.session.user.email });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.post('/api/employee/profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { name, gender, team, dateOfBirth } = req.body;
        
        // Validate required fields
        if (!name || !gender || !team || !dateOfBirth) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Convert dateOfBirth string to Date object
        const parsedDate = new Date(dateOfBirth);
        
        const employee = await Employee.findOneAndUpdate(
            { email: req.session.user.email },
            { 
                email: req.session.user.email,
                name,
                gender,
                team,
                dateOfBirth: parsedDate,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );
        res.json(employee);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
});

// Add emergency contact endpoint here
app.post('/api/employee/emergency-contact', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { emergencyContact } = req.body;
        
        // Basic validation
        if (!emergencyContact.name || !emergencyContact.phone) {
            return res.status(400).json({ error: 'Both name and phone are required' });
        }

        // Update only emergency contact fields
        const employee = await Employee.findOneAndUpdate(
            { email: req.session.user.email },
            { 
                $set: {
                    'emergencyContact.name': emergencyContact.name,
                    'emergencyContact.phone': emergencyContact.phone,
                    lastUpdated: new Date()
                }
            },
            { new: true }
        );

        res.json({ 
            message: 'Emergency contact updated successfully',
            emergencyContact: employee.emergencyContact 
        });
    } catch (error) {
        console.error('Emergency contact update error:', error);
        res.status(500).json({ error: 'Failed to update emergency contact' });
    }
});

// Add new endpoint for password update
app.post('/api/employee/update-password', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const employee = await Employee.findOne({ email: req.session.user.email });
        
        // If password exists, verify current password
        if (employee.password) {
            const isValidPassword = await bcrypt.compare(currentPassword, employee.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        employee.password = hashedPassword;
        await employee.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Get specific response endpoint
app.get('/api/responses/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const response = await Response.findOne({
            _id: req.params.id,
            email: req.session.user.email
        });
        
        if (!response) {
            return res.status(404).json({ error: 'Response not found' });
        }
        
        res.json(response);
    } catch (error) {
        console.error('Error fetching response:', error);
        res.status(500).json({ error: 'Failed to fetch response' });
    }
});

// Add this with your other API endpoints
app.get('/api/check-profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const employee = await Employee.findOne({ email: req.session.user.email });
        const isProfileComplete = !!(employee && employee.name && employee.gender && employee.team && employee.dateOfBirth);
        
        res.json({ 
            isProfileComplete,
            profile: isProfileComplete ? employee : null
        });
    } catch (error) {
        console.error('Profile check error:', error);
        res.status(500).json({ error: 'Failed to check profile' });
    }
});

// Add these routes for forgot password flow
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        // Get settings to check allowed domain
        const settings = await Settings.findOne();
        const allowedDomain = settings?.primaryDomain || 'admin.com';
        
        if (!email.endsWith(`@${allowedDomain}`)) {
            return res.status(400).json({ error: `Please use your @${allowedDomain} email` });
        }

        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(400).json({ error: 'No account found with this email' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStore.set(email, { 
            otp, 
            timestamp: Date.now(), 
            isPasswordReset: true 
        });

        // Send OTP email
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Password Reset OTP for Culture App',
            html: `
                <h1>Password Reset Request</h1>
                <p>Use the following OTP to reset your password:</p>
                <h2 style="color: #007bff;">${otp}</h2>
                <p>This OTP will expire in 5 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/api/verify-reset-otp', async (req, res) => {
    const { email, otp } = req.body;
    const storedData = otpStore.get(email);

    if (!storedData || storedData.otp !== parseInt(otp) || !storedData.isPasswordReset) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() - storedData.timestamp > 300000) { // 5 minutes
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP expired' });
    }

    otpStore.delete(email);
    res.json({ message: 'OTP verified successfully' });
});

app.post('/api/reset-password', async (req, res) => {
    const { email, password } = req.body;

    try {
        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(400).json({ error: 'No account found with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        employee.password = hashedPassword;
        await employee.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Change from '/api/responses/user' to '/api/responses'
app.get('/api/responses', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Find all responses for the current user by email
        const userResponses = await Response.find({ 
            email: req.session.user.email 
        }).select('surveyId timestamp _id').lean();  // Added timestamp to selected fields

        // Format the response
        const formattedResponses = userResponses.map(response => ({
            surveyId: response.surveyId.toString(),
            _id: response._id.toString(),
            timestamp: response.timestamp  // Include timestamp in the response
        }));

        console.log('Found responses:', formattedResponses);  // Debug log
        res.json(formattedResponses);
    } catch (error) {
        console.error('Error in /api/responses:', error);
        res.status(500).json({ 
            error: 'Failed to fetch responses',
            details: error.message 
        });
    }
});

// Add endpoint for upcoming birthdays
app.get('/api/upcoming-birthdays', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Get all employees with date of birth
        const employees = await Employee.find({ dateOfBirth: { $exists: true } }).select('name dateOfBirth').lean();

        // Get current date
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        // Process and sort upcoming birthdays
        const upcomingBirthdays = employees
            .map(employee => {
                const dob = new Date(employee.dateOfBirth);
                const birthMonth = dob.getMonth();
                const birthDay = dob.getDate();

                // Calculate days until next birthday
                let daysUntil;
                if (birthMonth > currentMonth || (birthMonth === currentMonth && birthDay >= currentDay)) {
                    // Birthday is later this year
                    daysUntil = new Date(today.getFullYear(), birthMonth, birthDay).getTime() - today.getTime();
                } else {
                    // Birthday is next year
                    daysUntil = new Date(today.getFullYear() + 1, birthMonth, birthDay).getTime() - today.getTime();
                }

                return {
                    ...employee,
                    daysUntil: Math.ceil(daysUntil / (1000 * 60 * 60 * 24))
                };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil); // Sort by closest birthday

        res.json(upcomingBirthdays);

    } catch (error) {
        console.error('Error fetching upcoming birthdays:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
    }
});

// Add shutdown flag
let isShuttingDown = false;

// Update graceful shutdown handling
const gracefulShutdown = async (signal) => {
    // Prevent multiple shutdown calls
    if (isShuttingDown) {
        return;
    }
    
    isShuttingDown = true;
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    try {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        
        // Exit process
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
};

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('Uncaught Exception');
});

// Update the survey stats endpoint
app.get('/api/survey-stats', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Get total number of employees
        const totalEmployees = await Employee.countDocuments();
        
        // Calculate current quarter date range
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        const quarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59, 999);
        
        // Get all surveys with their completion counts for current quarter only
        const surveys = await Survey.find().lean();
        
        // Get completion counts for each survey in current quarter
        const surveysWithStats = await Promise.all(surveys.map(async (survey) => {
            const completedCount = await Response.countDocuments({ 
                surveyId: survey._id,
                timestamp: { 
                    $gte: quarterStart, 
                    $lte: quarterEnd 
                }
            });
            return {
                _id: survey._id,
                title: survey.title,
                completedCount
            };
        }));
        
        res.json({
            totalEmployees,
            surveys: surveysWithStats,
            quarter: `Q${currentQuarter}Y${now.getFullYear().toString().slice(-2)}`
        });
    } catch (error) {
        console.error('Error fetching survey stats:', error);
        res.status(500).json({ error: 'Failed to fetch survey statistics' });
    }
});

// Add Goal Schema
const GoalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    quarter: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^Q[1-4]Y\d{2}$/.test(v);  // Validates format like Q1Y24
            },
            message: props => `${props.value} is not a valid quarter format! Use Q1Y24, Q2Y24, etc.`
        }
    },
    team: { 
        type: String, 
        enum: ['tech', 'sales', 'product', 'marketing'], 
        required: true 
    },
    timestamp: { type: Date, default: Date.now }
});

// Create Goal model
const Goal = mongoose.model('Goal', GoalSchema);

// Add endpoint to fetch team goals
app.get('/api/team-goals', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Get user's team from employee profile
        const employee = await Employee.findOne({ email: req.session.user.email });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get current quarter
        const now = new Date();
        const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}Y${now.getFullYear().toString().slice(-2)}`;

        // Fetch goals for user's team and current quarter
        const goals = await Goal.find({ 
            team: employee.team,
            quarter: quarter
        }).sort({ timestamp: -1 });

        res.json(goals);
    } catch (error) {
        console.error('Error fetching team goals:', error);
        res.status(500).json({ error: 'Failed to fetch team goals' });
    }
});

// Get all goals
app.get('/api/admin/goals', checkAdminAuth, async (req, res) => {
    try {
        const goals = await Goal.find().sort({ quarter: -1, timestamp: -1 });
        res.json(goals);
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// Create new goal
app.post('/api/admin/goals', checkAdminAuth, async (req, res) => {
    try {
        const { name, description, team, quarter } = req.body;

        // Validate required fields
        if (!name || !description || !team || !quarter) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate quarter format (Q1Y24, Q2Y24, etc.)
        if (!/^Q[1-4]Y\d{2}$/.test(quarter)) {
            return res.status(400).json({ error: 'Invalid quarter format' });
        }

        // Create new goal
        const goal = new Goal({
            name,
            description,
            team,
            quarter,
            timestamp: new Date()
        });

        await goal.save();
        res.status(201).json(goal);
    } catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// Update goal
app.put('/api/admin/goals/:goalId', checkAdminAuth, async (req, res) => {
    try {
        const { goalId } = req.params;
        const { name, description, team, quarter } = req.body;

        // Validate required fields
        if (!name || !description || !team || !quarter) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate quarter format
        if (!/^Q[1-4]Y\d{2}$/.test(quarter)) {
            return res.status(400).json({ error: 'Invalid quarter format' });
        }

        const updatedGoal = await Goal.findByIdAndUpdate(
            goalId,
            {
                name,
                description,
                team,
                quarter
            },
            { new: true }
        );

        if (!updatedGoal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        res.json(updatedGoal);
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// Delete goal
app.delete('/api/admin/goals/:goalId', checkAdminAuth, async (req, res) => {
    try {
        const { goalId } = req.params;
        const deletedGoal = await Goal.findByIdAndDelete(goalId);

        if (!deletedGoal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

// Define Course Schema
const ContentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    text: { type: String, required: true },
    link: { type: String } // Optional link to external resource
});

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: [ContentSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Create Course model
const Course = mongoose.model('Course', CourseSchema);

// Add Course API endpoints
app.get('/api/courses', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const courses = await Course.find({})
            .select({
                _id: 1,
                title: 1,
                description: 1
            });
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.get('/api/courses/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});

// Course management endpoints
app.post('/api/admin/courses', checkAdminAuth, async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json(course);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

app.get('/api/admin/courses', checkAdminAuth, async (req, res) => {
    try {
        const courses = await Course.find({});
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.put('/api/admin/courses/:id', checkAdminAuth, async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

app.delete('/api/admin/courses/:id', checkAdminAuth, async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

// Employee management endpoints
app.get('/api/admin/employees', checkAdminAuth, async (req, res) => {
    try {
        const employees = await Employee.find().select('-password');
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

app.get('/api/admin/employees/:id', checkAdminAuth, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-password');
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

app.put('/api/admin/employees/:id', checkAdminAuth, async (req, res) => {
    try {
        const { name, gender, team, dateOfBirth } = req.body;
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { name, gender, team, dateOfBirth },
            { new: true }
        ).select('-password');

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

app.delete('/api/admin/employees/:id', checkAdminAuth, async (req, res) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Also delete their responses
        await Response.deleteMany({ email: employee.email });

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// Add this endpoint to get employee's AI summary
app.get('/api/employee/ai-summary', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const employee = await Employee.findOne({ email: req.session.user.email });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (!employee.aiSummary?.text) {
            return res.json({ 
                summary: null,
                lastUpdated: null
            });
        }

        res.json({
            summary: employee.aiSummary.text,
            lastUpdated: employee.aiSummary.lastUpdated
        });

    } catch (error) {
        console.error('Error fetching AI summary:', error);
        res.status(500).json({ error: 'Failed to fetch AI summary' });
    }
});

// Settings API endpoints
app.get('/api/admin/settings', checkAdminAuth, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json(settings || {});
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Public settings endpoint for frontend
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json(settings || {});
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

app.put('/api/admin/settings', checkAdminAuth, async (req, res) => {
    try {
        const { organizationName, primaryDomain, features, gmailUser, gmailAppPassword, openaiApiKey } = req.body;
        
        const updatedSettings = await Settings.findOneAndUpdate(
            {},
            {
                organizationName,
                primaryDomain,
                features,
                gmailUser,
                gmailAppPassword,
                openaiApiKey,
                lastUpdated: new Date()
            },
            { new: true, upsert: true }
        );

        // Update email transporter if Gmail credentials changed
        if (gmailUser || gmailAppPassword) {
            try {
                transporter = await createTransporter();
                await transporter.verify();
                console.log('Email transporter updated with new credentials');
            } catch (error) {
                console.error('Failed to update email transporter:', error);
            }
        }

        // Update OpenAI client if API key changed
        if (openaiApiKey) {
            try {
                await updateOpenAIClient();
                console.log('OpenAI client updated with new API key');
            } catch (error) {
                console.error('Failed to update OpenAI client:', error);
            }
        }

        res.json(updatedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

app.post('/api/admin/settings/logo', checkAdminAuth, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const logoUrl = `/uploads/${req.file.filename}`;
        
        const updatedSettings = await Settings.findOneAndUpdate(
            {},
            {
                logoUrl,
                logoFile: req.file.filename,
                lastUpdated: new Date()
            },
            { new: true, upsert: true }
        );

        res.json({ 
            logoUrl,
            settings: updatedSettings
        });
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

app.delete('/api/admin/settings/logo', checkAdminAuth, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (settings?.logoFile) {
            // Delete the file
            const filePath = path.join(uploadsDir, settings.logoFile);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        const updatedSettings = await Settings.findOneAndUpdate(
            {},
            {
                $unset: { logoUrl: 1, logoFile: 1 },
                lastUpdated: new Date()
            },
            { new: true }
        );

        res.json(updatedSettings);
    } catch (error) {
        console.error('Error deleting logo:', error);
        res.status(500).json({ error: 'Failed to delete logo' });
    }
});



// Update the CultureScore Schema
const CultureScoreSchema = new mongoose.Schema({
    lastUpdated: { type: Date, default: Date.now },
    companyOverview: {
        totalEmployees: Number,
        employeesWithResponses: Number,
        responseRate: String,
        averageSatisfaction: Number,
        averageWorkLifeBalance: Number
    },
    teamMetrics: [{
        team: { 
            type: String, 
            enum: ['tech', 'sales', 'product', 'marketing'] 
        },
        totalCount: Number,
        respondedCount: Number,
        responseRate: String,
        satisfaction: Number,
        workLifeBalance: Number
    }],
    actionItems: [{
        text: String,
        tags: [String],
        priority: { type: String, enum: ['high', 'medium', 'low'] }
    }],
    aiGenerated: Boolean
});

const CultureScore = mongoose.model('CultureScore', CultureScoreSchema);

// Generate culture score using OpenAI
app.post('/api/admin/generate-culture-score', checkAdminAuth, async (req, res) => {
    try {
        // Check if we already have a recent culture score
        const existingScore = await CultureScore.findOne({
            lastUpdated: { 
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
        });

        if (existingScore && !req.body.forceRefresh) {
            return res.json(existingScore);
        }

        // Fetch all necessary data
        const [employees, responses, surveys] = await Promise.all([
            Employee.find(),
            Response.find().populate('surveyId'),
            Survey.find()
        ]);

        // Calculate employee counts and response rates
        const totalEmployees = employees.length;
        const employeesWithResponses = new Set(responses.map(r => r.email)).size;
        const responseRate = ((employeesWithResponses / totalEmployees) * 100).toFixed(1);

        // Calculate team-wise counts and response rates
        const teamStats = employees.reduce((acc, emp) => {
            if (!emp.team) return acc;
            
            if (!acc[emp.team]) {
                acc[emp.team] = {
                    totalCount: 0,
                    respondedCount: 0
                };
            }
            
            acc[emp.team].totalCount++;
            
            // Check if employee has any responses
            if (responses.some(r => r.email === emp.email)) {
                acc[emp.team].respondedCount++;
            }
            
            return acc;
        }, {});

        // Format the data for OpenAI
        const teamResponses = employees.reduce((acc, emp) => {
            if (!acc[emp.team]) acc[emp.team] = [];
            const empResponses = responses.filter(r => r.email === emp.email);
            if (empResponses.length > 0) {  // Only include employees with responses
                acc[emp.team].push({
                    responses: empResponses.map(r => ({
                        survey: r.surveyId.title,
                        answers: Object.fromEntries(r.answers)
                    }))
                });
            }
            return acc;
        }, {});

        // Modify prompt to exclude employee counts
        const prompt = `Analyze the following employee survey data and generate a comprehensive culture score report. 
            For each team (${Object.keys(teamResponses).join(', ')}), calculate:
            1. Average satisfaction score (1-5)
            2. Average work-life balance score (1-5)
            3. Key themes in feedback

            Then, provide 5 specific, actionable recommendations for management, each with relevant tags and priority levels.
            Format the response as a JSON object with the following structure:
            {
                "companyOverview": {
                    "averageSatisfaction": number,
                    "averageWorkLifeBalance": number
                },
                "teamMetrics": [
                    {
                        "team": string,
                        "satisfaction": number,
                        "workLifeBalance": number
                    }
                ],
                "actionItems": [
                    {
                        "text": string,
                        "tags": string[],
                        "priority": "high" | "medium" | "low"
                    }
                ]
            }

            Survey Data:
            ${JSON.stringify(teamResponses, null, 2)}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert HR analyst who provides detailed cultural analysis of organizations. Always respond with valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1500,
            temperature: 0.7
        });

        let aiAnalysis;
        try {
            // Extract JSON from markdown code blocks if present
            let content = completion.choices[0].message.content.trim();
            
            // Remove markdown code block formatting if present
            if (content.startsWith('```json')) {
                content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (content.startsWith('```')) {
                content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            aiAnalysis = JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse AI response:', completion.choices[0].message.content);
            throw new Error('AI analysis returned invalid JSON format');
        }

        // Validate AI analysis structure
        if (!aiAnalysis.companyOverview || !aiAnalysis.teamMetrics || !aiAnalysis.actionItems) {
            throw new Error('AI analysis returned incomplete data structure');
        }

        // Combine AI analysis with actual employee counts
        const analysisResult = {
            companyOverview: {
                ...aiAnalysis.companyOverview,
                totalEmployees,
                employeesWithResponses,
                responseRate
            },
            teamMetrics: aiAnalysis.teamMetrics.map(metric => ({
                ...metric,
                totalCount: teamStats[metric.team]?.totalCount || 0,
                respondedCount: teamStats[metric.team]?.respondedCount || 0,
                responseRate: teamStats[metric.team] 
                    ? ((teamStats[metric.team].respondedCount / teamStats[metric.team].totalCount) * 100).toFixed(1)
                    : '0'
            })),
            actionItems: aiAnalysis.actionItems
        };

        // Save to database
        const cultureScore = new CultureScore({
            ...analysisResult,
            aiGenerated: true,
            lastUpdated: new Date()
        });
        await cultureScore.save();

        res.json(cultureScore);

    } catch (error) {
        console.error('Error generating culture score:', error);
        res.status(500).json({ error: 'Failed to generate culture score' });
    }
});

// Fetch latest culture score
app.get('/api/admin/culture-score', checkAdminAuth, async (req, res) => {
    try {
        const latestScore = await CultureScore.findOne().sort({ lastUpdated: -1 });
        if (!latestScore) {
            return res.status(404).json({ error: 'No culture score available' });
        }
        res.json(latestScore);
    } catch (error) {
        console.error('Error fetching culture score:', error);
        res.status(500).json({ error: 'Failed to fetch culture score' });
    }
});

// PDF Generation endpoint
app.get('/api/admin/culture-score/pdf', checkAdminAuth, async (req, res) => {
    try {
        const cultureScore = await CultureScore.findOne().sort({ lastUpdated: -1 });
        if (!cultureScore) {
            return res.status(404).json({ error: 'No culture score available' });
        }
        
        // Get app settings for logo
        const settings = await Settings.findOne();

        // Create PDF document with better formatting
        const doc = new PDFDocument({
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            size: 'A4',
            bufferPages: true // Enable page buffering
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=culture-score-${new Date().toISOString().split('T')[0]}.pdf`);
        doc.pipe(res);

        // Helper function for consistent section headers using text symbols instead of emojis
        const addSectionHeader = (text, symbol) => {
            const symbols = {
                '📊': '>>',
                '🏢': '##',
                '👥': '**',
                '📋': '>>'
            };
            
            doc.moveDown()
                .font('Helvetica-Bold')
                .fontSize(16)
                .text(`${symbols[symbol] || '-'} ${text}`, { underline: true })
                .moveDown();
        };

        // Add company logo and title
        const logoPath = settings?.logoFile ? path.join(uploadsDir, settings.logoFile) : 'public/images/black-logo-horizontal.png';
        const logoWidth = 200; // Increased from 150 for better visibility
        
        try {
            doc.image(logoPath, 50, 50, { width: logoWidth });
        } catch (error) {
            // Fallback to default logo if custom logo fails
            doc.image('public/images/black-logo-horizontal.png', 50, 50, { width: logoWidth });
        }
        
        doc.moveDown(2)
            .font('Helvetica-Bold')
            .fontSize(24)
            .text('Culture Score Report', { align: 'center' })
            .moveDown();

        // Add introduction section
        doc.font('Helvetica')
            .fontSize(12)
            .text('This report provides an AI-powered analysis of your organization\'s cultural health based on employee survey responses. The insights and recommendations are generated using advanced analytics and machine learning algorithms to identify patterns and trends in employee feedback.', { align: 'justify' })
            .moveDown()
            .text(`Generated on: ${new Date(cultureScore.lastUpdated).toLocaleString()}`, { align: 'right' })
            .moveDown(2);

        // Add executive summary
        addSectionHeader('Executive Summary', '📊');
        doc.font('Helvetica')
            .fontSize(11)
            .text('This analysis is based on employee survey responses and provides insights into company culture, team dynamics, and recommended actions for improvement. The scores are calculated on a scale of 1-5, where 5 represents the highest level of satisfaction.', { align: 'justify' })
            .moveDown(2);

        // Company Overview section with improved layout
        addSectionHeader('Company Overview', '🏢');
        
        // Create a table-like structure for metrics
        const metrics = [
            ['Total Employees', `${cultureScore.companyOverview.employeesWithResponses}/${cultureScore.companyOverview.totalEmployees}`],
            ['Response Rate', `${cultureScore.companyOverview.responseRate}%`],
            ['Average Satisfaction', `${cultureScore.companyOverview.averageSatisfaction.toFixed(1)}/5`],
            ['Work-Life Balance', `${cultureScore.companyOverview.averageWorkLifeBalance.toFixed(1)}/5`]
        ];

        metrics.forEach(([label, value]) => {
            doc.font('Helvetica-Bold')
                .fontSize(11)
                .text(label, { continued: true, width: 150 })
                .font('Helvetica')
                .text(`: ${value}`)
                .moveDown(0.5);
        });

        // Team Metrics section with visual improvements
        addSectionHeader('Team Metrics', '👥');
        cultureScore.teamMetrics.forEach(team => {
            // Team header with custom styling
            doc.font('Helvetica-Bold')
                .fontSize(14)
                .text(`>> ${capitalizeFirst(team.team)} Team`)
                .moveDown(0.5);

            // Team metrics in a structured format
            doc.font('Helvetica')
                .fontSize(11)
                .text(`* Team Size: ${team.totalCount} members`)
                .text(`* Response Rate: ${team.responseRate}% (${team.respondedCount}/${team.totalCount} responded)`)
                .text(`* Satisfaction Score: ${team.satisfaction.toFixed(1)}/5`)
                .text(`* Work-Life Balance Score: ${team.workLifeBalance.toFixed(1)}/5`)
                .moveDown();
        });

        // Action Items section with priority-based formatting
        addSectionHeader('Recommended Actions', '📋');
        cultureScore.actionItems.forEach((item, index) => {
            const prioritySymbols = {
                high: '[!]',
                medium: '[*]',
                low: '[.]'
            };

            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text(`${index + 1}. ${prioritySymbols[item.priority]} Priority: ${capitalizeFirst(item.priority)}`)
                .font('Helvetica')
                .fontSize(11)
                .text(item.text, { indent: 20 })
                .font('Helvetica-Oblique')
                .fontSize(10)
                .text(`Tags: ${item.tags.join(', ')}`, { indent: 20 })
                .moveDown();
        });

        // Instead of using pageAdded event, add page numbers at the end
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            
            // Add page number
            doc.fontSize(10)
                .text(
                    `Page ${i + 1} of ${range.count}`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );

            // Add disclaimer on each page
            doc.fontSize(8)
                .font('Helvetica-Oblique')
                .text(
                    'This report is generated using AI analysis of survey responses. Recommendations should be reviewed in context of your organization\'s specific needs and circumstances.',
                    50,
                    doc.page.height - 30,
                    { align: 'center' }
                );
        }

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Helper function for capitalization
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
} 