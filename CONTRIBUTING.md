# Contributing to DashGenAI

Thank you for your interest in contributing to DashGenAI! We welcome contributions from the community.

## 📋 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and considerate in all interactions.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/dashgenai.git
   cd dashgenai
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## 💻 Development Workflow

### 1. Set Up Your Environment

Follow the setup instructions in [README.md](README.md) to configure your development environment.

### 2. Make Your Changes

- Write clear, readable code
- Follow the existing code style
- Add comments for complex logic
- Keep functions small and focused
- Use TypeScript types appropriately

### 3. Test Your Changes

- Ensure the application runs without errors
- Test all affected functionality
- Add new tests if applicable

### 4. Commit Your Changes

We follow conventional commit messages:

```bash
git commit -m "feat: add new dashboard widget"
git commit -m "fix: resolve MongoDB connection issue"
git commit -m "docs: update API documentation"
git commit -m "refactor: improve project service structure"
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create a Pull Request

```bash
git push origin feature/my-new-feature
```

Then create a Pull Request on GitHub.

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define interfaces for all data structures
- Avoid `any` types when possible
- Use meaningful variable and function names

```typescript
// Good
interface UserProfile {
  id: string;
  email: string;
  name: string;
}

// Avoid
interface User {
  data: any;
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop typing

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return <button onClick={onClick} className={variant}>{label}</button>;
};
```

### Backend Code

- Follow MVC pattern (Models, Routes, Services)
- Keep route handlers thin - move logic to services
- Add comprehensive error handling
- Log important operations

```typescript
// Good - Route handler delegates to service
router.post('/projects', requireUser(), async (req, res) => {
  try {
    const project = await ProjectService.createProject(req.user._id, req.body);
    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Error Handling

- Always handle errors appropriately
- Provide meaningful error messages
- Log errors with context

```typescript
// Good
try {
  const result = await someOperation();
  return result;
} catch (error) {
  console.error('Failed to perform operation:', error);
  throw new Error(`Operation failed: ${error.message}`);
}
```

## 🧪 Testing Guidelines

- Write tests for new features
- Ensure existing tests still pass
- Test edge cases and error conditions
- Use meaningful test descriptions

## 📚 Documentation

- Update README.md if you change functionality
- Add JSDoc comments for complex functions
- Update API documentation for new endpoints
- Include examples in documentation

```typescript
/**
 * Analyzes a MongoDB database and generates documentation
 * @param connectionUri - MongoDB connection string
 * @param projectId - The project ID to associate with this analysis
 * @returns Promise<DatabaseDocumentation> - The generated documentation
 * @throws {Error} If connection fails or database is invalid
 */
async function analyzeDatabase(connectionUri: string, projectId: string): Promise<DatabaseDocumentation> {
  // Implementation
}
```

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the problem
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, Node version, browser, etc.
6. **Screenshots**: If applicable
7. **Error Logs**: Any relevant error messages

## 💡 Suggesting Features

When suggesting features:

1. **Use Case**: Explain why this feature would be useful
2. **Description**: Detailed description of the feature
3. **Examples**: Provide examples or mockups if possible
4. **Alternatives**: Any alternative solutions you've considered

## 📋 Pull Request Process

1. **Update Documentation**: Ensure README and other docs are updated
2. **Run Linter**: `npm run lint` before submitting
3. **Test Thoroughly**: Test your changes in multiple scenarios
4. **Write Clear PR Description**: Explain what changes you made and why
5. **Link Issues**: Reference any related issues
6. **Wait for Review**: Be patient and respond to feedback

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe how you tested your changes

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have tested my changes thoroughly
```

## 🔍 Code Review Process

All submissions require review. We'll review your PR and may:

- Request changes
- Ask questions
- Approve and merge

Please be patient and responsive during the review process.

## 🏗️ Project Structure

Understanding the project structure will help you contribute effectively:

```
dashgenai/
├── client/           # React frontend
│   ├── src/
│   │   ├── api/     # API client functions
│   │   ├── components/  # Reusable components
│   │   ├── pages/   # Page components
│   │   └── ...
│
├── server/          # Express backend
│   ├── models/      # Mongoose models
│   ├── routes/      # API routes
│   ├── services/    # Business logic
│   └── ...
│
└── shared/          # Shared code
    ├── config/      # Shared configuration
    └── types/       # Shared TypeScript types
```

## 🎯 Areas We Need Help

- **Frontend**: UI/UX improvements, new dashboard widgets
- **Backend**: Performance optimization, new integrations
- **Documentation**: Tutorials, examples, API docs
- **Testing**: Unit tests, integration tests, E2E tests
- **DevOps**: Docker support, CI/CD improvements

## 📧 Questions?

If you have questions, feel free to:

- Open a GitHub issue
- Email us at support@pythagora.ai
- Join our community discussions

## 🙏 Thank You!

Your contributions make this project better for everyone. Thank you for taking the time to contribute!

---

**Happy Coding! 🚀**
