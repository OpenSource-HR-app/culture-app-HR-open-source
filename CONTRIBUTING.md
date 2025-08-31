# Contributing to Culture App

Thank you for your interest in contributing to Culture App! This document provides guidelines and information for contributors.

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/yourusername/culture-app.git`
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`
4. **Install dependencies**: `npm install`
5. **Set up environment**: `cp env.example .env` and configure it

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 📝 Code Style Guidelines

### JavaScript/Node.js
- Use ES6+ features (arrow functions, destructuring, etc.)
- Use `const` and `let` instead of `var`
- Use template literals for string interpolation
- Keep functions small and focused (max 20-30 lines)
- Add JSDoc comments for complex functions

### Example:
```javascript
/**
 * Formats an error object for API responses
 * @param {Error|string} error - The error to format
 * @returns {Object} Formatted error object
 */
const formatError = (error) => {
  const message = error.message || error;
  const statusCode = error.statusCode || 500;
  
  return { message, statusCode };
};
```

### HTML/CSS
- Use semantic HTML elements
- Follow BEM methodology for CSS classes
- Keep CSS organized and commented
- Use CSS variables for consistent theming

## 🔧 Development Workflow

1. **Create your feature branch** from `main`
2. **Make your changes** following the code style guidelines
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Ensure all tests pass**: `npm test`
6. **Commit your changes** with clear commit messages

### Commit Message Format
```
type(scope): description

feat(auth): add password reset functionality
fix(api): resolve email validation issue
docs(readme): update installation instructions
```

## 🧪 Testing Guidelines

- Write tests for all new functionality
- Aim for at least 80% code coverage
- Test both success and error cases
- Use descriptive test names
- Group related tests using `describe` blocks

### Test Structure
```javascript
describe('User Authentication', () => {
  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      // Test implementation
    });

    it('should reject invalid credentials', async () => {
      // Test implementation
    });
  });
});
```

## 📚 Documentation

- Update README.md for new features
- Add JSDoc comments for new functions
- Update API documentation if endpoints change
- Include examples in documentation

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected vs actual behavior**
4. **Environment details** (OS, Node.js version, etc.)
5. **Screenshots** if applicable

## 💡 Feature Requests

For feature requests:

1. **Describe the feature** clearly
2. **Explain the use case** and benefits
3. **Provide examples** if possible
4. **Consider implementation** complexity

## 🔒 Security

- Never commit sensitive information (API keys, passwords)
- Report security vulnerabilities privately
- Follow security best practices
- Validate and sanitize all user inputs

## 📋 Pull Request Process

1. **Ensure your branch is up to date** with main
2. **Run all tests** and ensure they pass
3. **Update documentation** as needed
4. **Provide a clear description** of your changes
5. **Reference any related issues**
6. **Request review** from maintainers

### PR Checklist
- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] No sensitive data is exposed
- [ ] Changes are focused and minimal

## 🏷️ Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## 📞 Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Contact maintainers for urgent issues
- Join our community channels

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to Culture App! 🎉
