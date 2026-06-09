# Contributing to MindMitra 🧠💚

Thanks for your interest in contributing to MindMitra! This is an open-source mental health platform and we welcome contributors of all skill levels.

---

## Table of Contents

- [Getting Started](https://claude.ai/chat/2ab695e1-790d-475a-b3d4-19249a79ba5b#getting-started)

- [How to Contribute](https://claude.ai/chat/2ab695e1-790d-475a-b3d4-19249a79ba5b#how-to-contribute)

- [Issue Guidelines](https://claude.ai/chat/2ab695e1-790d-475a-b3d4-19249a79ba5b#issue-guidelines)

- [Pull Request Guidelines](https://claude.ai/chat/2ab695e1-790d-475a-b3d4-19249a79ba5b#pull-request-guidelines)

- [Code of Conduct](https://claude.ai/chat/2ab695e1-790d-475a-b3d4-19249a79ba5b#code-of-conduct)

- [SSoC26 Contributors](https://claude.ai/chat/2ab695e1-790d-475a-b3d4-19249a79ba5b#ssoc26-contributors)

---

## Getting Started

### Prerequisites

- Python 3.9+

- Node.js 18+

- MongoDB

- Redis

- Docker (optional but recommended)

### Local Setup

```
# 1. Fork this repository
# 2. Clone your fork
git clone https://github.com//mind-mitra.git
cd mind-mitra

# 3. Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Set up environment variables
cp env.example .env
# Fill in your values in .env

# 6. Install frontend dependencies
cd mindmitra-frontend
npm install

# 7. Run with Docker (easiest)
docker-compose up

# OR run manually
# Backend: uvicorn app.main:app --reload
# Frontend: npm run dev
```

---

## How to Contribute

### Step 1 — Find an Issue

- Go to the [Issues tab](https://github.com/1809gaurav/mind-mitra/issues)

- Look for issues tagged with `SSoC26` and a difficulty label

- Pick one that matches your skill level

Label
Points
Good for

`Beginner`
50
First-time contributors

`Easy`
20
Simple fixes and UI tasks

`Medium`
30
Feature development

`Hard`
40
Complex features

`Intermediate`
150
Full modules

`Advanced`
200
System-level features

### Step 2 — Comment on the Issue

Leave a comment saying you'd like to work on it. Something like:

> 
> "Hey, I'd like to work on this. I'll submit a PR in X days."
> 
> **Important:** Issues are NOT pre-assigned. The best PR for each issue will be reviewed and merged. Multiple contributors can work on the same issue — the best solution wins.

### Step 3 — Create a Branch

```
git checkout -b feat/your-feature-name
# or
git checkout -b fix/bug-name
```

### Step 4 — Make Your Changes

- Write clean, readable code

- Follow existing code structure and naming conventions

- Add comments where needed

- Test your changes locally before submitting

### Step 5 — Commit Your Changes

```
git add .
git commit -m "feat: add mood tracking chart component"
```

Follow this commit message format:

- `feat:` for new features

- `fix:` for bug fixes

- `docs:` for documentation

- `chore:` for maintenance tasks

- `test:` for adding tests

### Step 6 — Push and Open a PR

```
git push origin feat/your-feature-name
```

Then open a Pull Request on GitHub against the `main` branch.

---

## Issue Guidelines

- Do not ask for issues to be assigned to you — the best PR wins

- Do not open duplicate issues

- If you find a bug, open a new issue with clear steps to reproduce

- If you want a new feature, open a feature request issue first before coding

---

## Pull Request Guidelines

- Link the issue your PR solves using `Closes #` in the PR description

- Make sure your code runs locally without errors

- Keep PRs focused — one feature or fix per PR

- Add a clear description of what you changed and why

- Screenshots are appreciated for UI changes

- PRs without a linked issue may not be reviewed

### PR Template

```
## What does this PR do?
Brief description of changes.

## Related Issue
Closes #

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update

## Screenshots (if UI change)

## Checklist
- [ ] Code runs locally
- [ ] No breaking changes
- [ ] Follows existing code style
```

---

## Code of Conduct

- Be respectful and supportive to all contributors

- No spam, self-promotion, or off-topic comments

- Keep discussions focused on the project

- Any form of harassment will result in removal

---

## SSoC26 Contributors

This project is part of **Social Summer of Code 2026 (SSoC26)**.

- All PRs must have the `SSoC26` label on the corresponding issue

- Points are awarded based on issue difficulty label

- The best PR for each issue gets merged and earns the points

- Stay active — contributors who disappear mid-PR may lose priority

### Project Admin & Mentor

**Gaurav Kaushik** — [GitHub](https://github.com/1809gaurav) — [LinkedIn](https://www.linkedin.com/in/gaurav-kaushik1809)

### Mentor

**Srijita Chakraborty** — [GitHub](https://github.com/srijitac1) — [LinkedIn](https://www.linkedin.com/in/srijita-chakraborty-a61a88290)

Feel free to reach out in the SSoC Discord/WhatsApp group if you have questions about the project!

---

Made with 💚 by the MindMitra team use this as contributing .md content