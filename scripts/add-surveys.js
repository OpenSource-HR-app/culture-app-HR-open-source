import 'dotenv/config';
import mongoose from 'mongoose';

// Define MongoDB Schemas (same as in init-db.js)
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

const newSurveys = [
    {
        "title": "Employee Wellbeing & Work-Life Balance Survey",
        "description": "Help us understand your work-life balance and overall wellbeing at work",
        "questions": [
            {
                "text": "I am able to arrange time out from work when I need to",
                "type": "rating",
                "options": []
            },
            {
                "text": "The pace of work here enables me to do a good job",
                "type": "rating",
                "options": []
            },
            {
                "text": "How often do you feel stressed at work?",
                "type": "choice",
                "options": [
                    "Never",
                    "Rarely",
                    "Sometimes",
                    "Often",
                    "Very Often"
                ]
            },
            {
                "text": "What would help improve your work-life balance?",
                "type": "text",
                "options": []
            },
            {
                "text": "I believe my workload is reasonable for my role",
                "type": "rating",
                "options": []
            }
        ]
    },
    {
        "title": "Career Growth & Development Survey",
        "description": "Help us understand your career aspirations and development needs",
        "questions": [
            {
                "text": "I believe there are good career opportunities for me at this company",
                "type": "rating",
                "options": []
            },
            {
                "text": "What type of learning opportunities would you like to see more of?",
                "type": "choice",
                "options": [
                    "Technical skills training",
                    "Leadership development",
                    "Soft skills workshops",
                    "Industry certifications",
                    "Mentorship programs"
                ]
            },
            {
                "text": "My manager has shown genuine interest in my career aspirations",
                "type": "rating",
                "options": []
            },
            {
                "text": "I have access to the learning and development I need to do my job well",
                "type": "rating",
                "options": []
            },
            {
                "text": "What specific skills would you like to develop in the next 6 months?",
                "type": "text",
                "options": []
            }
        ]
    }
];

// Function to add new surveys
const addNewSurveys = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Add new surveys
        await Survey.insertMany(newSurveys);
        console.log('Added new surveys successfully');

    } catch (error) {
        console.error('Error adding surveys:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the function
addNewSurveys(); 