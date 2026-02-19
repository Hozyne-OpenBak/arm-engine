## Tooling Standards

This project adheres to strict JavaScript tooling standards:

- **NPM Scripts Only**: Always use the `npm` scripts defined in the `package.json`. Avoid globally installing tools.
- **Node.js Version**: The required Node.js version for this project is specified in `.nvmrc`. Use NVM to switch to the correct version.

## NPM Scripts

| Command        | Description                           |
|----------------|---------------------------------------|
| `npm install`  | Install all dependencies.             |
| `npm run dev`  | Start the development environment.    |
| `npm run test` | Run all test suites.                  |
| `npm run build`| Build the production-ready project.   |

## Troubleshooting

### Common Issues

- **Error: Tailwind CLI not found**
Ensure you are running `npm` scripts instead of invoking the Tailwind CLI directly. Reinstall dependencies if needed.

- **Node.js version mismatch**
Verify the Node.js version specified in `.nvmrc`.

- **Build failures**
Reset your local environment and execute `npm install` before rebuilding. If problems persist, verify the `frontend` directory consistency.