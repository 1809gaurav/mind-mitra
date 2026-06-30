# 💚 Contributing to MindMitra 🧠

### Thank you for your interest in contributing to MindMitra! We appreciate contributions from developers, designers, writers, testers, and open-source enthusiasts of all experience levels.

This guide explains how to set up the project locally, contribute effectively, and submit high-quality pull requests.

---

## Table of Contents

* [Getting Started](#getting-started)
* [Prerequisites](#prerequisites)
* [Local Development Setup](#local-development-setup)
* [Environment Variables](#environment-variables)
* [MongoDB Local Setup](#mongodb-local-setup)
* [How to Contribute](#how-to-contribute)
* [Testing](#testing)
* [Branch Naming Convention](#branch-naming-convention)
* [Issue Guidelines](#issue-guidelines)
* [Pull Request Guidelines](#pull-request-guidelines)
* [Pull Request Checklist](#pull-request-checklist)
* [Code of Conduct](#code-of-conduct)
* <a href="#ssoc26-contributors">SSoC26 Contributors</a>

---

## Getting Started

### Prerequisites

Before setting up the project, ensure the following tools are installed:

* Python 3.9+
* Node.js 18+
* MongoDB
* Redis
* Git
* Docker (optional but recommended)

---

## Local Development Setup

### 1. Fork the Repository

Fork the repository to your GitHub account.

### 2. Clone Your Fork

```bash
git clone https://github.com/<your-username>/mind-mitra.git
cd mind-mitra
```

### 3. Create and Activate a Virtual Environment

```bash
python -m venv venv
```

Linux/macOS:

```bash
source venv/bin/activate
```

Windows:

```bash
venv\Scripts\activate
```

### 4. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

```bash
cp env.example .env
```

Open the `.env` file and update the values according to your local environment.

### 6. Install Frontend Dependencies

```bash
cd mindmitra-frontend
npm install
```

### 7. Run the Application

Using Docker:

```bash
docker-compose up
```

Or run services manually:

Backend:

```bash
uvicorn app.main:app --reload
```

Frontend:

```bash
npm run dev
```

---

## Environment Variables

MindMitra uses a `.env` file to manage application configuration.

Create a local environment file:

```bash
cp env.example .env
```

### Important Environment Variables

| Variable                    | Description                        |
| --------------------------- | ---------------------------------- |
| MONGODB_URL                 | MongoDB connection string          |
| DATABASE_NAME               | Database name                      |
| SECRET_KEY                  | Secret key used for authentication |
| ALGORITHM                   | JWT signing algorithm              |
| ACCESS_TOKEN_EXPIRE_MINUTES | Access token expiry duration       |
| REFRESH_TOKEN_EXPIRE_DAYS   | Refresh token expiry duration      |
| FRONTEND_URL                | Frontend application URL           |
| FIREBASE_PROJECT_ID         | Firebase project identifier        |
| TWILIO_ACCOUNT_SID          | Twilio account SID                 |
| SMTP_SERVER                 | SMTP server for email services     |
| HUGGINGFACE_API_KEY         | Hugging Face API key               |
| REDIS_URL                   | Redis connection URL               |
| DEBUG                       | Application debug mode             |

**Important:** Never commit your `.env` file or any secrets to version control.

---

## MongoDB Local Setup

Ensure MongoDB is installed and running before starting the backend.

### Verify Installation

```bash
mongod --version
```

### Start MongoDB

Linux/macOS:

```bash
sudo systemctl start mongod
```

Windows:

```bash
net start MongoDB
```

### Verify Connection

```bash
mongosh
```

If the MongoDB shell opens successfully, your local database server is running correctly.

---

## How to Contribute

## Step 1 — Find an Issue

* Visit the repository Issues tab.
* Look for issues tagged with `SSoC26`.
* Choose an issue that matches your experience level.

| Label        | Points | Suitable For                     |
| ------------ | ------ | -------------------------------- |
| Beginner     | 50     | First-time contributors          |
| Easy         | 20     | Simple fixes and UI improvements |
| Medium       | 30     | Feature development              |
| Hard         | 40     | Complex implementations          |
| Intermediate | 150    | Complete modules                 |
| Advanced     | 200    | System-level contributions       |

---

## Step 2 — Comment on the Issue

Leave a comment indicating your interest.

Example:

> Hey, I'd like to work on this issue and will submit a PR within X days.

**Note:** Issues are not pre-assigned. Multiple contributors may work on the same issue, and the best solution will be selected. Start working only when you are assigned and then raise the pr,else pr will not be valid

---

## Step 3 — Create a Branch

```bash
git checkout -b feature/your-feature-name
```

or

```bash
git checkout -b bugfix/your-bug-fix
```

---

## Step 4 — Make Your Changes

* Follow the existing project structure.
* Write clean and maintainable code.
* Add comments where necessary.
* Test your changes before submission.

---

## Step 5 — Commit Your Changes

```bash
git add .
git commit -m "feat: add mood tracking chart component"
```

Recommended commit prefixes:

* `feat:` New feature
* `fix:` Bug fix
* `docs:` Documentation changes
* `test:` Test updates
* `chore:` Maintenance tasks
* `refactor:` Code improvements

---

## Step 6 — Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Open a Pull Request against the `main` branch.

---

## Testing

MindMitra uses **pytest** for backend testing.

### Run All Tests

```bash
pytest
```

### Run Tests with Detailed Output

```bash
pytest -v
```

### Run a Specific Test File

```bash
pytest tests/test_auth.py
```

### Run a Specific Test Case

```bash
pytest tests/test_auth.py::test_login
```

Please ensure all tests pass successfully before opening a Pull Request.

---

## Branch Naming Convention

Use one of the following naming formats:

### Features

```text
feature/add-mood-tracker
```

### Bug Fixes

```text
bugfix/fix-login-error
```

### Documentation

```text
docs/update-contributing-guide
```

### Refactoring

```text
refactor/improve-api-structure
```

---

## Issue Guidelines

* Do not create duplicate issues.
* Search existing issues before opening a new one.
* Include clear reproduction steps when reporting bugs.
* Discuss major features before implementation.
* Respect community discussions and feedback.

---

## Pull Request Guidelines

* Link related issues using `Closes #issue_number`.
* Keep PRs focused on a single feature or fix.
* Verify that your code runs without errors.
* Include screenshots for UI-related changes when applicable.
* Provide a clear explanation of the changes made.
* Ensure documentation is updated when necessary.

### Pull Request Template

```md
## What does this PR do?
Brief description of changes.

## Related Issue
Closes #

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update

## Screenshots (if UI change or any major feature added)

## Checklist
- [ ] Code runs locally
- [ ] No breaking changes
- [ ] Follows existing code style
```

---

## Pull Request Checklist

Before submitting your PR, ensure that:

* [ ] All tests pass successfully (`pytest`)
* [ ] Linting checks pass
* [ ] Code follows existing project standards
* [ ] Changes have been tested locally
* [ ] Documentation has been updated if required
* [ ] PR description clearly explains the purpose of the changes
* [ ] Related issue is linked using `Closes #issue_number`
* [ ] No secrets, credentials, or sensitive information are included

---

## Code of Conduct

* Be respectful and welcoming to all contributors.
* Avoid spam, self-promotion, and off-topic discussions.
* Keep communication professional and constructive.
* Harassment or abusive behavior will not be tolerated.

---

## SSoC26 Contributors

This project is a part of **Social Summer of Code 2026 (SSoC26)**.

* PRs should be associated with issues labeled `SSoC26`.
* Points are awarded according to issue difficulty.
* The highest-quality contribution will be merged.
* Active contributors will be prioritized during reviews.

### Project Admin & Mentor

**Gaurav Kaushik**

* GitHub: https://github.com/1809gaurav
* LinkedIn: https://www.linkedin.com/in/gaurav-kaushik1809

### Mentor

**Srijita Chakraborty**

* GitHub: https://github.com/srijitac1
* LinkedIn: https://www.linkedin.com/in/srijita-chakraborty-a61a88290

For questions and community discussions, feel free to reach out through the SSoC Discord or WhatsApp groups.

---

Made with 💚 by the MindMitra Team
