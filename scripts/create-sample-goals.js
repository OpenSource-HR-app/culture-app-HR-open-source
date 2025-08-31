import mongoose from 'mongoose';
import 'dotenv/config';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Goal Schema (copy from main.js)
const GoalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    quarter: { type: String, required: true },
    team: { type: String, enum: ['tech', 'sales', 'product', 'marketing'], required: true },
    timestamp: { type: Date, default: Date.now }
});

const Goal = mongoose.model('Goal', GoalSchema);

// Sample data
const teams = ['tech', 'sales', 'product', 'marketing'];
const currentQuarter = `Q${Math.floor((new Date().getMonth() / 3) + 1)}Y${new Date().getFullYear().toString().slice(-2)}`;

const sampleGoals = [
    {
        team: 'tech',
        name: 'Implement Microservices Architecture',
        description: 'Break down monolithic application into microservices to improve scalability and maintainability.'
    },
    {
        team: 'tech',
        name: 'Achieve 99.9% System Uptime',
        description: 'Implement robust monitoring and automated recovery systems to ensure high availability.'
    },
    {
        team: 'sales',
        name: 'Expand Market Presence',
        description: 'Increase market share by 25% through strategic partnerships and targeted campaigns.'
    },
    {
        team: 'sales',
        name: 'Optimize Sales Pipeline',
        description: 'Implement new CRM system and reduce sales cycle time by 30%.'
    },
    {
        team: 'product',
        name: 'Launch Mobile App',
        description: 'Develop and launch native mobile applications for iOS and Android platforms.'
    },
    {
        team: 'product',
        name: 'User Experience Enhancement',
        description: 'Improve user satisfaction scores by 40% through UI/UX improvements.'
    },
    {
        team: 'marketing',
        name: 'Social Media Growth',
        description: 'Increase social media engagement by 50% across all platforms.'
    }
];

// Function to create goals
const createSampleGoals = async () => {
    try {
        // Clear existing goals
        await Goal.deleteMany({});
        console.log('Cleared existing goals');

        // Create new goals
        const goals = await Promise.all(
            sampleGoals.map(goal => {
                return Goal.create({
                    ...goal,
                    quarter: currentQuarter,
                    timestamp: new Date()
                });
            })
        );

        console.log(`Created ${goals.length} sample goals:`);
        goals.forEach(goal => {
            console.log(`- [${goal.team}] ${goal.name}`);
        });

    } catch (error) {
        console.error('Error creating sample goals:', error);
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    }
};

// Run the script
createSampleGoals(); 