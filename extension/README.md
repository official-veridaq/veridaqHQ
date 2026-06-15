# VERIDAQ Companion Extension

## Overview

The extension provides quick institution and verifier actions from any tab.
It uses a short lived access token issued by the backend and refreshes it using the existing web session.

## Setup

1. Update `config.js` with the backend and web URLs you use.
2. Add your extension origin to `EXTENSION_ORIGINS` in the backend environment.
3. Load the extension folder in the browser developer mode.

## Security model

- The extension reads the refresh token cookie via the browser cookies API.
- The backend exchanges the refresh token for a short lived access token.
- The access token is stored in session storage inside the extension.
- Sensitive workflows should still redirect to the full web app.
