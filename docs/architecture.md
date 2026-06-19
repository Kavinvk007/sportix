# Architecture Overview

Sportix is built as a Single-Page Application (SPA) where the frontend handles rendering and state, and the backend acts as a stateless, JSON-based REST API.

## Frontend (Client-Side)
- **Vanilla JavaScript**: We use ES6 modules to manage application logic without heavy framework overhead.
- **State Management**: App state (cart, auth token, theme) is managed globally within `app.js` and persisted across reloads using `localStorage`.
- **View Routing**: An SPA router approach is implemented by dynamically hiding/showing DOM sections (`.view-section`) based on state changes.
- **Styling**: Vanilla CSS utilizing CSS variables (`var(--bg-primary)`) to natively support a robust Dark/Light Theme Engine and glassmorphic UI tokens.

## Backend (Server-Side)
- **FastAPI**: The backend is powered by FastAPI, leveraging Python's async features for high-performance route handling.
- **Database (SQLite + SQLAlchemy)**: A relational database schema manages Users, Products, Orders, and Reviews. SQLAlchemy ORM is used for safe query execution.
- **Security**: Passlib secures passwords with bcrypt hashing, and PyJWT generates access tokens for protected API routes (like Checkout and Admin operations).
- **Payment Gateway**: Stripe's Python SDK integrates directly to validate cart sums and generate an encrypted `clientSecret` for Payment Intents, preventing client-side price manipulation.

## Interaction Flow
1. The Frontend loads statically and checks `localStorage` for a JWT.
2. If authenticated, the user interacts with the app, sending API calls with an `Authorization: Bearer <token>` header.
3. For checkouts, the Frontend requests a `clientSecret` from the Backend, renders the Stripe form, and directly confirms the transaction with Stripe's servers.
4. Only upon Stripe's success response does the Frontend signal the Backend to commit the Order to the database.
