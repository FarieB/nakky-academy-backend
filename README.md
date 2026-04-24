Nakky Academy API Documentation
Base URL
http://localhost:5000/api

Example production URL:

https://api.nakkyacademy.com/api
Authentication
Register User

Creates a new user account.

Endpoint

POST /api/auth/register

Request Body

{
  "name": "Nomsa Moyo",
  "email": "nomsa@gmail.com",
  "password": "123456",
  "role": "employee"
}

Response

{
  "token": "JWT_TOKEN",
  "user": {
    "id": "65ff2...",
    "name": "Nomsa Moyo",
    "role": "employee"
  }
}
Login

Authenticates a user and returns a JWT token.

Endpoint

POST /api/auth/login

Request Body

{
  "email": "nomsa@gmail.com",
  "password": "123456"
}

Response

{
  "token": "JWT_TOKEN"
}
Job System
Create Job (Employer Only)

Employers can create job listings for domestic workers.

Endpoint

POST /api/jobs

Request Body

{
  "province": "Gauteng",
  "city": "Johannesburg",
  "requiredExperience": 3,
  "requiredSkills": ["Childcare", "Cooking"],
  "jobType": "nanny",
  "description": "Looking for a full-time nanny"
}
Smart Candidate Matching

Returns candidates that match a job post.

Endpoint

GET /api/jobs/:id/matches

Example:

GET /api/jobs/65ff3a/matches

Response

[
  {
    "candidateName": "Nomsa",
    "experience": 5,
    "skills": ["Childcare", "Cooking"]
  }
]
AI Recommended Candidates

Returns top-ranked candidates based on skills, experience, ratings and verification status.

Endpoint

GET /api/jobs/:id/recommended

Response

[
  {
    "candidate": {
      "name": "Mary Ndlovu",
      "skills": ["First Aid", "Childcare"],
      "yearsExperience": 6,
      "verifiedBadge": true
    },
    "score": 72
  }
]
Invite Candidate

Employers can invite a candidate to apply for a job.

Endpoint

POST /api/jobs/:jobId/invite

Request Body

{
  "candidateId": "65ff99..."
}
Hire Candidate

Employers can hire a candidate after reviewing their profile.

Endpoint

POST /api/jobs/:jobId/hire

Request Body

{
  "candidateId": "65ff99..."
}
Messaging System
Send Message

Allows employers and candidates to communicate.

Endpoint

POST /api/jobs/message

Request Body

{
  "receiverId": "65ff9a",
  "message": "Hello, I would like to interview you."
}
Course System
Create Course (Admin Only)

Admins can create new training courses.

Endpoint

POST /api/courses

Request Body

{
  "title": "Professional Caregiving",
  "price": 500
}
Add Lesson to Course

Adds video lessons to a course.

Endpoint

POST /api/courses/:courseId/content

Request Body

{
  "title": "Introduction to Caregiving",
  "videoUrl": "/uploads/videos/lesson1.mp4"
}
Enroll in Course

Students enroll in a course.

Endpoint

POST /api/courses/:courseId/enroll

Response

{
  "message": "Enrollment created. Please complete payment."
}
Access Course Content

Students can access lessons after payment.

Endpoint

GET /api/courses/:courseId/content
Update Lesson Progress

Tracks student progress.

Endpoint

PUT /api/courses/:courseId/progress

Request Body

{
  "lessonId": "lesson123"
}
Download Certificate

Downloads a PDF certificate after course completion.

Endpoint

GET /api/courses/:courseId/download-certificate
Candidate Verification
Upload Verification Documents

Candidates upload identification and verification documents.

Endpoint

POST /api/employee/upload-documents

Supported uploads:

ID Document

Police Clearance

References

Qualifications

Submit Verification Request

Candidates submit their documents for admin verification.

Endpoint

POST /api/employee/submit-verification

Response

{
  "status": "pending"
}
Admin Verify Candidate

Admins approve or reject verification requests.

Endpoint

PUT /api/admin/verify-user/:userId

Response

{
  "message": "Candidate verified successfully"
}

Verified candidates receive a Verified Badge.

Caregiver / Domestic Worker Profile
Create Worker Profile

Workers create professional profiles.

Endpoint

POST /api/profile

Request Body

{
  "workerType": "nanny",
  "skills": ["Childcare", "Cooking"],
  "yearsExperience": 4,
  "expectedSalary": 4500
}

Supported worker types:

caregiver

nanny

babysitter

housekeeper

helper

gardener

Get Worker Profile

Retrieve worker profile information.

Endpoint

GET /api/profile/:userId

Response

{
  "name": "Mary",
  "workerType": "caregiver",
  "skills": ["First Aid", "Cooking"],
  "yearsExperience": 6,
  "averageRating": 4.7,
  "verifiedBadge": true
}
Employer Subscriptions
Subscribe Employer

Employers must subscribe to post jobs and contact candidates.

Endpoint

POST /api/payment/subscribe

Request Body

{
  "planId": "basic"
}

Response

{
  "status": "active",
  "expires": "2026-06-01"
}
Dashboard
Unified Dashboard

Provides role-based dashboard data.

Endpoint

GET /api/dashboard

Requires authentication.

Employer Dashboard Example
{
  "role": "employer",
  "stats": {
    "totalJobs": 3,
    "totalInvitations": 10,
    "totalHires": 2,
    "totalMessages": 6
  }
}
Admin Dashboard Example
{
  "role": "admin",
  "stats": {
    "totalJobs": 50,
    "totalEmployers": 20,
    "totalCandidates": 200,
    "totalRevenue": 45000
  }
}
Tech Stack

Backend technologies used:

Node.js

Express.js

MongoDB

Mongoose

JWT Authentication

Socket.io (real-time messaging)

PDFKit (certificate generation)

Platform Overview

Nakky Academy combines two systems:

Domestic Worker Employment Marketplace

Training Academy for Domestic Workers

Supported worker types:

Caregivers

Nannies

Babysitters

Housekeepers

Domestic Helpers

Gardeners

Features include:

AI candidate matching

Verified worker profiles

Employer subscription system

Messaging between employers and candidates

Online training courses

Certificates for completed courses
