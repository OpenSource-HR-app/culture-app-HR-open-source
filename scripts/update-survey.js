import 'dotenv/config';
import mongoose from 'mongoose';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

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

const Survey = mongoose.model('Survey', SurveySchema);

// Example survey update
const surveyUpdate = {
    "_id": "679416ded09c65c1671ccf78",
    "title": "Wellbeing & Work-Life Balance",
    "description": "Help us understand your work-life balance and overall wellbeing at work",
    "questions": [
        {
            "text": "I am able to arrange time out from work when I need to",
            "type": "rating",
            "options": [],
            "_id": "6795502d65e4c1191eff2217"
        },
        {
            "text": "The pace of work here enables me to do a good job",
            "type": "rating",
            "options": [],
            "_id": "6795502d65e4c1191eff2218"
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
            ],
            "_id": "6795502d65e4c1191eff2219"
        },
        {
            "text": "I believe my workload is reasonable for my role",
            "type": "rating",
            "options": [],
            "_id": "6795502d65e4c1191eff221b"
        },
        {
            "text": "Do you feel like your organization supports your overall well-being?",
            "type": "rating",
            "options": [],
            "_id": "6795502d65e4c1191eff221c"
        },
        {
            "text": "Do you have access to comfortable and adequate office equipment and infrastructure?",
            "type": "rating",
            "options": [],
            "_id": "6795502d65e4c1191eff221d"
        },
        {
            "text": "Do you feel like your organization provides adequate resources to support your mental health?",
            "type": "rating",
            "options": [],
            "_id": "6795502d65e4c1191eff2221"
        },
        {
            "text": "Are you able to eat a nutritionally balanced lunch during office hours?",
            "type": "choice",
            "options": [
                "Never",
                "Rarely",
                "Sometimes",
                "Often",
                "Always"
            ],
            "_id": "6795502d65e4c1191eff221f"
        },
        {
            "text": "Do you feel like you can take breaks away from your computer during work hours?",
            "type": "choice",
            "options": [
                "Never",
                "Rarely",
                "Sometimes",
                "Often",
                "Always"
            ],
            "_id": "6795502d65e4c1191eff2220"
        },
        {
            "text": "What would help improve your work-life balance?",
            "type": "text",
            "options": [],
            "_id": "6795502d65e4c1191eff221a"
        }
    ],
    "__v": 0
};

  

// Function to update survey
const updateSurvey = async () => {
    try {
        // Update by ID instead of title
        const surveyId = "679416ded09c65c1671ccf78";
        const existingSurvey = await Survey.findById(surveyId);

        if (!existingSurvey) {
            console.error('Survey not found');
            return;
        }

        // Update the survey
        const updatedSurvey = await Survey.findByIdAndUpdate(
            existingSurvey._id,
            surveyUpdate,
            { new: true, runValidators: true }
        );

        console.log('Survey updated successfully:');
        console.log(JSON.stringify(updatedSurvey, null, 2));

    } catch (error) {
        console.error('Error updating survey:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the function
updateSurvey(); 