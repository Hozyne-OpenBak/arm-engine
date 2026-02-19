# Development Guidelines

## Canonical Repository Slug

The canonical repository slug for this project is `Hozyne-OpenBak/arm-engine`. Ensure all work is performed within this repository to avoid inconsistencies.

## Repository Root Verification

Before performing any Git operations, ensure you are at the root of the repository where the `.git` directory is located.

Use the script `scripts/verify-repo.sh` to validate your environment before starting development.

## JavaScript Tooling Standards

- Use only the provided `npm` scripts for executing tasks. Avoid installing packages globally unless explicitly directed to do so.
- Ensure Node.js version matches the project requirement specified in the `package.json` file.

### NPM Scripts
Some commonly used scripts:
- `npm install`: Install dependencies for current environment.
- `npm run build`: Build the project.
- `npm test`: Run test suites.

## QA Verification Workflow

All QA validations must start from a **fresh clone** of the repository. Use the `scripts/qa-verify.sh` script to automate the workflow, which includes:

- Cloning the repository.
- Installing dependencies.
- Building the project.

This workflow prevents issues caused by environmental artifacts.

## Message Routing Standards

All message routing and utilities should define explicit targets as their destination. Avoid assumptions about default behavior.

## Node.js Version Requirements

This project ensures compatibility with the Node.js LTS version defined in `.nvmrc`. Install and switch to the correct version using NVM:

```bash
nvm use
```

## Common Pitfalls

1. **Global CLIs causing inconsistencies**
   - **Solution:** Use `npm` script commands instead.
2. **Outdated Node.js version**
   - **Solution:** Check `.nvmrc` and use NVM for version management.
3. **Incorrect repository path**
   - **Solution:** Use `scripts/verify-repo.sh` to avoid mismatches.