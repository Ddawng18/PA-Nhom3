# PA6ma Digital Art Training Prototype

PA6ma is implemented here as a client-only React/Vite prototype. It uses localStorage to simulate user state, lesson progress, saved artwork, exercise submissions, and analytics. There is no server or SQL dependency in this version.

## Run

```bash
npm install
npm run dev
```

## Checks

```bash
npm run build
npm run test
npm run lint
```

## What Is Simulated

- Authentication is local prototype validation, not a real account system.
- Course video content is intentionally marked as placeholder.
- Review feedback is rule-based demo feedback, not AI image analysis.
- Progress and analytics are calculated from localStorage data created in the browser.

## Figma Access Note

The Figma MCP integration returned `INVALID_ARGUMENT` during this pass, including for metadata reads, so the current Figma canvas and prototype links could not be independently verified from the tool. The implementation preserves the LINEA dark creative workspace identity established in the existing file.
