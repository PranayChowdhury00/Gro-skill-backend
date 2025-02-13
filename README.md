GroSkill Backend

GroSkill is the backend service for the GroSkill platform, providing APIs for user authentication, skill management, and course handling.

Table of Contents

Purpose

Technologies Used

API Endpoints

Installation Instructions

Environment Variables

Contributing

License

Purpose

The backend serves as the core engine for GroSkill, handling user authentication, database interactions, and API logic. It ensures a secure and scalable way to manage users, skills, and courses.

Technologies Used

Node.js - JavaScript runtime for server-side applications.

Express.js - Web framework for handling API requests.

MongoDB - NoSQL database for storing user and course data.

JWT - JSON Web Token for secure authentication.

Mongoose - ODM for MongoDB schema management.

Firebase Authentication - Handles user login/signup.

Cors - Middleware for handling cross-origin requests.

API Endpoints

Authentication

POST /api/auth/register - Register a new user.

POST /api/auth/login - Authenticate user and issue JWT.

POST /api/auth/logout - Log out user.

User Management

GET /api/users/:id - Fetch user details.

PUT /api/users/:id - Update user profile.

DELETE /api/users/:id - Delete user account.

Skills & Courses

GET /api/skills - Get all available skills.

POST /api/skills - Add a new skill.

GET /api/courses - Fetch all courses.

POST /api/courses - Create a new course.

PUT /api/courses/:id - Update course details.

DELETE /api/courses/:id - Remove a course.

Installation Instructions

Clone the Repository:

git clone https://github.com/YOUR-USERNAME/groskill-backend.git
cd groskill-backend

Install Dependencies:

npm install

Set Up Environment Variables:

Create a .env file in the root directory.

Add required variables (see Environment Variables).

Run the Server:

npm start

Environment Variables

Create a .env file in the root directory and add:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FIREBASE_API_KEY=your_firebase_api_key

Contributing

We welcome contributions to improve GroSkill! Follow these steps:

Fork the repository.

Create a new branch.

Make your changes and commit them.

Push to your branch and submit a pull request.

License

This project is licensed under the Pranay Chowdhury .
