import 'dotenv/config';
import mongoose from 'mongoose';

// Define MongoDB Schemas
const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    type: { type: String, enum: ['rating', 'text', 'choice'], required: true },
    options: [String]
});

const SurveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: [QuestionSchema]
});

// Create model from schema
const Survey = mongoose.model('Survey', SurveySchema);

// Sample survey data
const sampleSurveys = [
    {
        title: "Employee Engagement Survey",
        description: "Help us understand how engaged you feel at work",
        questions: [
            {
                text: "How satisfied are you with your current role?",
                type: "rating"
            },
            {
                text: "Do you feel valued at work?",
                type: "rating"
            },
            {
                text: "How likely are you to recommend our company as a place to work?",
                type: "rating"
            },
            {
                text: "What would make our company a better place to work?",
                type: "text"
            },
            {
                text: "How often do you feel stressed at work?",
                type: "choice",
                options: ["Never", "Rarely", "Sometimes", "Often", "Always"]
            }
        ]
    },
    {
        title: "Work Culture Survey",
        description: "Share your thoughts about our company culture",
        questions: [
            {
                text: "How well do our company values align with your personal values?",
                type: "rating"
            },
            {
                text: "How would you rate the work-life balance at our company?",
                type: "rating"
            },
            {
                text: "What aspects of our culture could be improved?",
                type: "text"
            },
            {
                text: "How often do you participate in company events?",
                type: "choice",
                options: ["Never", "Rarely", "Sometimes", "Often", "Always"]
            }
        ]
    }
];

// Function to initialize database
const initializeDB = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing surveys
        await Survey.deleteMany({});
        console.log('Cleared existing surveys');

        // Insert sample surveys
        await Survey.insertMany(sampleSurveys);
        console.log('Added sample surveys');

        console.log('Database initialization completed successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await mongoose.disconnect();
    }
};

// Run the initialization
initializeDB(); 