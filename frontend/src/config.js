// Set VITE_CHAT_API_URL in an .env file (see .env.example) once the Lambda
// Function URL from backend/DEPLOY.md exists.
export const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3000/chat'
