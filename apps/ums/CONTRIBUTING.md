# Contributing to BMI University Management System

Thank you for your interest in contributing to BMI UMS! This project is 100% open source and welcomes contributions from the community.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment

## How to Contribute

### Reporting Bugs

1. Check if the issue already exists
2. Use the issue template
3. Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Open an issue with the "feature request" label
2. Describe the use case
3. Explain why it would benefit the project

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation
4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add student bulk import feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**

## Development Setup

```bash
# Clone your fork
git clone git@github.com:YOUR_USERNAME/BMI-PORTAL.git
cd BMI-PORTAL

# Install dependencies
npm install

# Start development environment
make dev
```

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for type safety
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for complex functions

### React Components
- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Follow React best practices

### Commits
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Project Structure

```
bmi-ums/
├── src/              # React frontend
│   ├── components/   # UI components
│   ├── services/     # API services
│   └── types/        # TypeScript types
├── backend/          # Hono.js API
├── scripts/          # Utility scripts
└── docs/             # Documentation
```

## Testing

```bash
# Run tests
make test-all

# Run linter
make lint-all

# Run all pre-PR checks (recommended)
make verify
```

## Questions?

- Open an issue for questions
- Check existing documentation
- Review closed issues for similar questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
