# Omen - Dream Analysis App Architecture and Rules

## 1. Project Overview
Omen is a mobile application where users input their dreams as text. The app uses AI to provide a psychological/mystical analysis of the dream and generates a contextual image representing the dream's atmosphere. We are building upon an existing MVP codebase.

## 2. Tech Stack
- **Frontend:** React Native (Using Expo).
- **Backend / Database:** Firebase (Authentication and Cloud Firestore).
- **API Security (Proxy):** Cloudflare Workers (Serverless architecture to hide API keys).
- **Text AI:** Google Gemini API (For dream interpretation - Free tier).
- **Image AI:** Pollinations.ai (For text-to-image generation - MVP phase, keyless).

## 3. Core Rules & Security (CRITICAL)
- **Rule 1:** NEVER hardcode Gemini or any other external API keys directly into the React Native (Frontend) codebase. All external AI API calls MUST be routed through Cloudflare Workers.
- **Rule 2:** Keeping costs at zero is our primary goal. Do not suggest or implement paid libraries or services.
- **Rule 3:** Users have a strict limit of "3 Dream Interpretations per Day". This limit must be managed and validated on Firebase Firestore using the user's UID. 
- **Rule 4:** **Developer Bypass:** To allow seamless testing, check for an `isDeveloper: true` field in the user's Firestore document. If true, the user bypasses the daily quota limit entirely.
- **Rule 5:** Code must be modular, clean, and utilize reusable components. If existing code is messy, it must be refactored before adding new features.

## 4. User Flow
1. User logs in via Firebase Auth (Google/Apple/Email).
2. On the home screen, the user types their dream into a text input.
3. The app checks the user's daily quota from Firestore (unless `isDeveloper` is true).
4. If quota allows, the dream text is sent to the Cloudflare Worker.
5. Cloudflare Worker:
   - Calls the Gemini API to get the interpretation (and an English image prompt).
   - Calls Pollinations.ai using a simple GET request with the generated prompt to get the image URL.
6. The results (Interpretation + Image URL) are returned to the app and saved to Firestore.
7. The user is presented with a visually appealing "Dream Card" UI.

## 5. Development Roadmap
- **Phase 1:** Refactor existing code, Firebase setup, Auth integration, and Firestore schema design.
- **Phase 2:** Cloudflare Workers development and Gemini/Pollinations integration.
- **Phase 3:** React Native UI/UX improvements, animations, and API connections.
- **Phase 4:** Testing, bug fixing, and deployment preparation.