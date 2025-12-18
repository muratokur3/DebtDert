# PROJECT DEBTDERT - AI & AGENT MANIFESTO

This document outlines the core rules, architectural decisions, and coding standards for the "DebtDert" project. All AI agents (Jules, Copilot, etc.) MUST adhere to these guidelines strictly.

## 1. TECH STACK & ARCHITECTURE
* **Frontend Library:** React (Functional Components with Hooks ONLY).
* **Language:** JavaScript (ES6+) / React JSX.
* **Backend / Database:** Firebase (Firestore, Authentication, Hosting).
* **Styling:** CSS Modules or Styled Components (Check existing files for consistency).
* **Routing:** React Router DOM.
* **Platform:** Web (deployed via Firebase Hosting).

## 2. CRITICAL RULES (NEVER BREAK THESE)
1.  **NO Class Components:** Always use Functional Components and Hooks (`useState`, `useEffect`, etc.).
2.  **NO Direct DOM Manipulation:** Never use `document.getElementById` or `querySelector`. Use `useRef` if absolutely necessary.
3.  **NO SQL:** This is a Firebase project. Do not generate SQL queries. Use Firestore SDK methods (`collection`, `doc`, `getDocs`, `addDoc`).
4.  **NO Secrets in Code:** Never hardcode API keys or secrets. Use `process.env` or Firebase config variables.
5.  **Preserve Directory Structure:** Do not move existing files unless explicitly asked.

## 3. CODING STANDARDS & BEST PRACTICES
* **Error Handling:** All asynchronous operations (especially Firebase calls) MUST be wrapped in `try/catch` blocks.
* **User Feedback:** Always provide UI feedback for loading states and errors (e.g., toast notifications, alert banners). Do not just log to console.
* **Component Structure:**
    * Keep components small and focused.
    * Use descriptive variable and function names (e.g., `handleSaveDebt` instead of `save`).
* **Firebase Usage:**
    * Use `serverTimestamp()` for `createdAt` and `updatedAt` fields.
    * Validate data types before sending to Firestore.

## 4. WORKFLOW & PR GUIDELINES
* **Atomic Commits:** Focus on one task per PR.
* **Self-Correction:** If you modify a file, ensure the app still builds. Check for unused imports.
* **Explanation:** In PR descriptions, clearly state WHAT changed and HOW to test it.

---
*If you are unsure about a specific implementation details, refer to the existing code patterns in the `src/` directory.*