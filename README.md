# CampusBite — College Canteen Queue Optimizer

A full-stack college project built with React, Node.js and Express. It helps students order food ahead and helps canteen staff manage the preparation queue.

## Features

- Student food menu, search, category filters and cart
- Order tokens and order tracking
- Estimated waiting time and queue position
- Admin dashboard with order status controls
- Add menu items and mark items available/unavailable
- Daily order, sales and popular-item metrics
- Smart operational suggestions
- Optional Google Gemini API integration for AI-generated suggestions
- Responsive layout for laptop and mobile

## Requirements

- Node.js 18 or newer
- npm
- VS Code (recommended)

## Run the project

1. Extract the ZIP and open the `canteen-queue-optimizer` folder in VS Code.
2. Open the VS Code terminal.
3. Install dependencies:

   ```bash
   npm run install-all
   ```

4. Optional Gemini setup:
   - Copy `.env.example` to `.env` in the project root.
   - Add your Gemini API key after `GEMINI_API_KEY=`.
   - Get a key from https://aistudio.google.com/app/apikey
   - Keep the key in `.env`; never put it in React/frontend code.

5. Start the frontend and backend:

   ```bash
   npm run dev
   ```

6. Open http://localhost:5173

The API runs at http://localhost:5000.

## How to demonstrate

1. Open the student ordering page.
2. Add items to the cart, enter a student name and place an order.
3. Note the generated token (for example, C001).
4. Open **Track order** and enter the token.
5. Open **Admin dashboard** and change the order from Received to Preparing, then Ready.
6. Show the live queue, wait-time estimate, popular items and AI assistant panel.

## How the smart queue estimate works

Each menu item has an estimated preparation time. The backend adds the preparation times of active orders ahead of the selected order and applies a simple efficiency factor. This is a transparent heuristic estimate, not a trained machine-learning model. Real canteens should calibrate prep times and account for multiple kitchen stations.

## AI integration

Without a Gemini key, the app uses built-in rule-based operational suggestions. With a valid Gemini key in the backend `.env`, the AI assistant sends aggregate queue and popular-item metrics to Gemini and displays its suggestions. Do not send student personal data or secrets to the AI service.

## Important demo note

This is a college-project prototype. The admin panel is not password-protected and is intended for local demonstration only. Before real deployment, add admin authentication, database backups, input validation/rate limiting, payment integration if needed, and a proper database such as PostgreSQL.
