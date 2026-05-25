# Food Waste Reducer Web Application

A React and Supabase based food waste reduction web application. The system allows users to create food listings, save food pickup locations, view available food on a UK map, reserve food, chat with food owners, receive notifications, and manage listings through profile and admin dashboards.

## Project Structure

```text
Final-Project-Food-Wastage-App/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── .env.example
│
├── backend/
│   ├── supabase_schema.sql
│   └── migrations/
│
├── README.md
└── .gitignore
Main Features
User registration and login
Protected routes for authenticated users
Create food listings
Upload food images
Save food pickup location using latitude and longitude
UK-based food map
Automatic map zoom to available food markers
Distance shown in miles
View listing details
Claim / reserve food
Reserved food removed from public Home and Map pages
Chat between food owner and receiver
Notifications for reservation activity
User profile with created and reserved food
Reserved food history
Admin panel for managing listings
Admin analytics dashboard
Performance metrics page
Technologies Used
React
React Router
Supabase Authentication
Supabase Database
Supabase Storage
Supabase Realtime
React Leaflet / Leaflet
Capacitor Geolocation
Gemini AI
Installation

Go to the frontend folder:

cd frontend

Install dependencies:

npm install

Run the project:

npm run dev
Environment Variables

Create a .env file inside the frontend folder.

Use .env.example as a template:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

Do not upload the real .env file to GitHub.

Supabase Database

The backend folder contains the Supabase database schema and migration files.

Main tables include:

food_listings
messages
notifications
admin_users

The food_listings table stores the food item name, category, description, pickup window, pickup area, image URL, status, latitude, longitude, reservation user ID, and reservation time.

Main System Workflow
User registers or logs in.
User creates a food listing.
Food location is saved at listing creation time.
Available food appears on the Home page and UK Food Map.
Another user opens the listing details page.
User claims or reserves the food.
Food status changes from available to reserved.
Reserved food is removed from the public Home page and public Map.
Reserved food remains visible in Profile and Reserved History.
Food Status Logic
available  → visible on Home and Map
reserved   → hidden from public Home and Map
picked_up  → hidden from public Home and Map
cancelled  → hidden from public Home and Map
expired    → hidden from public Home and Map
Security
Supabase Authentication is used for login and registration.
Protected routes prevent unauthorised access.
Admin pages are restricted using the admin_users table.
Real API keys are stored in .env and are not uploaded to GitHub.
Reserved food is hidden from public listings to prevent duplicate reservations.
Admin Features

The admin can:

View all food listings
Delete listings
Flag listings
Mark food as available or unavailable
View analytics dashboard
View performance metrics
Notes

This repository does not include real environment variables or secret API keys. To run the project, create your own .env file using the .env.example template.
