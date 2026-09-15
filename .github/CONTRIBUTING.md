# Contributing Guidelines

Thank you for your interest in contributing to the **GMAHK Galilea Digital Archive**.

## Development Workflow

1. **Environment Setup:**
   Copy the environment template:
   ``bash
   cp .env.example .env.local
   ``
   Fill in the required Firebase and Google Drive variables. (Never commit .env.local to Git).

2. **Automated Verification:**
   Before pushing changes or submitting a PR, run the local verification suite:
   ``bash
   # Run linter:
   npm run lint

   # Run automated unit tests (30 tests):
   npm run test

   # Run production build verification:
   npm run build
   ``

3. **Commit Standards:**
   Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `ci:`, `chore:`).

4. **Pull Requests:**
   - Target the `main` branch.
   - Fill out the PR template checklist completely.
   - GitHub Actions CI (Lint, Test & Build) must pass before merging.
