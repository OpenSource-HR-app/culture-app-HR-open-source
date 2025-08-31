# 🏢 Culture App

A comprehensive employee culture and survey application built with Node.js, Express, and MongoDB. This app helps organizations gather feedback, manage employee surveys, track team goals, and foster a positive workplace culture.

## ✨ Features

- **Employee Surveys**: Create and distribute customizable surveys
- **Course Management**: Organize and track employee training courses
- **Team Goals**: Set, track, and manage team objectives
- **Birthday Celebrations**: Never miss an employee's special day
- **Admin Dashboard**: Comprehensive management interface
- **Email Notifications**: Automated OTP and survey reminders
- **AI-Powered Insights**: OpenAI integration for survey analysis
- **Responsive Design**: Works on desktop and mobile devices
- **PDF Reports**: Generate detailed culture score reports

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 18.0.0 or higher) - [Download here](https://nodejs.org/)
- **MongoDB Atlas account** (free tier available) - [Sign up here](https://www.mongodb.com/atlas)
- **Gmail account** (for sending emails)
- **OpenAI API key** (optional, for AI features) - [Get one here](https://platform.openai.com/api-keys)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/culture-app.git
cd culture-app
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/culture-app?retryWrites=true&w=majority

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-random-string-here

# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# OpenAI API (optional)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Environment
NODE_ENV=development

# Port (optional, defaults to 3000)
PORT=3000
```

### Step 4: Initialize the Database

```bash
npm run init-db
```

### Step 5: Start the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The app will be available at `http://localhost:3000`

## 🔐 Default Admin Access

After running `npm run init-db`, you'll have a default admin account:

- **Email**: `admin@admin.com`
- **Password**: `admin123`

**Important**: Change these credentials immediately after first login!

## 📁 Project Structure

```
culture-app/
├── main.js                 # Main server file
├── init-db.js             # Database initialization
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create this)
├── env.example            # Environment variables template
├── public/                # Frontend files
│   ├── index.html         # Login/signup page
│   ├── dashboard.html     # Employee dashboard
│   ├── admin/             # Admin interface
│   ├── styles.css         # Main stylesheet
│   ├── admin/             # Admin interface
│   │   ├── admin.css      # Admin styles
│   │   ├── dashboard.html # Admin dashboard
│   │   └── settings.html  # Admin settings
│   └── js/                # Frontend JavaScript
├── scripts/               # Utility scripts
│   ├── add-surveys.js     # Add sample surveys
│   ├── create-sample-goals.js # Create sample goals
│   └── update-survey.js   # Update surveys
├── utils/                 # Helper functions
│   ├── errorHandler.js    # Error handling utilities
│   └── security.js        # Security utilities
└── uploads/               # File uploads (auto-created)
```

## 🌐 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ Yes | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `SESSION_SECRET` | Secret for session encryption | ✅ Yes | `my-super-secret-random-key-123` |
| `GMAIL_USER` | Gmail address for sending emails | ✅ Yes | `your-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail app password | ✅ Yes | `abcd efgh ijkl mnop` |
| `OPENAI_API_KEY` | OpenAI API key for AI features | ❌ No | `sk-...` |
| `NODE_ENV` | Environment mode | ❌ No | `development` or `production` |
| `PORT` | Server port | ❌ No | `3000` |

## 🛠️ Available Scripts

```bash
# Start development server with auto-restart
npm run dev

# Start production server
npm start

# Initialize database
npm run init-db

# Add sample surveys
node scripts/add-surveys.js

# Create sample team goals
node scripts/create-sample-goals.js

# Run tests
npm test
```

## 🚀 Deployment

### Deploy to Render (Recommended for beginners)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Render**:
   - Go to [Render](https://render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Set build command: `npm ci`
   - Set start command: `npm start`
   - Add environment variables from your `.env` file
   - Click "Create Web Service"

### Deploy to Heroku

1. **Install Heroku CLI**:
   ```bash
   npm install -g heroku
   ```

2. **Deploy**:
   ```bash
   heroku create your-app-name
   heroku config:set MONGODB_URI="your-mongodb-uri"
   heroku config:set SESSION_SECRET="your-session-secret"
   heroku config:set GMAIL_USER="your-gmail"
   heroku config:set GMAIL_APP_PASSWORD="your-app-password"
   git push heroku main
   ```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 🔧 Development

### Adding New Features

1. **Backend**: Add routes in `main.js`
2. **Frontend**: Create HTML files in `public/` and JS files in `public/js/`
3. **Database**: Update schemas in `main.js` or create new model files
4. **Styling**: Modify `public/styles.css`

### Code Style

- Use ES6+ features
- Follow consistent naming conventions
- Add JSDoc comments for complex functions
- Keep functions small and focused

## 🔧 Troubleshooting

### Common Issues

**"MongoDB connection error"**
- Check your `MONGODB_URI` in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify username/password are correct

**"Email sending failed"**
- Check Gmail credentials in `.env`
- Ensure 2FA is enabled and app password is correct

**"Port already in use"**
- Change `PORT` in `.env` file
- Kill the process using the port: `lsof -ti:3000 | xargs kill -9`

**"Module not found"**
- Run `npm install` to install dependencies
- Check Node.js version: `node --version` (should be ≥18.0.0)

### Getting Help

1. Check the browser console for JavaScript errors
2. Check the terminal for server-side errors
3. Verify all environment variables are set correctly
4. Ensure MongoDB Atlas is accessible from your IP

## 📚 API Endpoints

### Public Endpoints
- `POST /api/login` - Employee login
- `POST /api/signup` - Employee registration
- `GET /api/surveys` - Get available surveys
- `POST /api/responses` - Submit survey responses

### Admin Endpoints
- `GET /api/admin/settings` - Get app settings
- `PUT /api/admin/settings` - Update app settings
- `POST /api/admin/surveys` - Create new surveys
- `GET /api/admin/responses` - Get survey responses
- `GET /api/admin/culture-score/pdf` - Generate PDF reports

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** following the code style guidelines
4. **Add tests** for new functionality
5. **Commit your changes**: `git commit -m 'Add feature'`
6. **Push to the branch**: `git push origin feature-name`
7. **Submit a pull request**

### Contribution Guidelines

- Keep changes focused and small
- Add tests for new features
- Update documentation as needed
- Follow the existing code style
- Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Database powered by [MongoDB](https://www.mongodb.com/)
- Styled with modern CSS
- Icons from [Font Awesome](https://fontawesome.com/)
- PDF generation with [PDFKit](https://pdfkit.org/)

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/culture-app/issues) page
2. Create a new issue with detailed information
3. Include your environment details and error messages

## 🚀 Roadmap

- [ ] Enhanced survey analytics
- [ ] Mobile app development
- [ ] Advanced reporting features
- [ ] Integration with HR systems
- [ ] Multi-language support

---

**Happy coding! 🎉**

Made with ❤️ for better workplace culture
