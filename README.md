# GEOTAS: Geofenced Time-synced Attendance System (Web Portal)

![GEOTAS Dashboard](https://img.shields.io/badge/Status-Production_Ready-success.svg) ![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

**GEOTAS** is a modern, high-precision attendance management system designed to eliminate buddy-punching and proxy attendance in university lecture halls. 

This repository contains the **Lecturer Web Portal**, a sleek, highly-responsive React SPA built for course instructors to manage sessions, project dynamic QR codes in lecture halls, and analyze cryptographically-verified attendance records.

---

## Core Features

### 1. The Projector UI (Live Sessions)
Designed specifically for massive lecture halls, the Live Session view transforms the lecturer's laptop into a full-screen kiosk.
* **Massive Legibility:** Displays a 95vh Dynamic QR Code that can be scanned from the back row.
* **Server-Synced Expiration:** Timers use absolute server timestamps (`expires_at`), completely immune to browser tab-sleeping or client-side clock manipulation.
* **Darkness/Contrast Calibration:** Built-in UI slider to adjust screen contrast instantly for better projector visibility without touching OS settings.
* **Fallback OTPs:** Auto-rotating alphanumeric fallback codes for students whose cameras are broken.

### 2. Multi-Factor Risk Assessment (Confidence Scores)
GEOTAS doesn't just say "Present" or "Absent". The backend calculates a granular **Confidence Score (0.0 to 1.0)** for every single scan based on:
* **Geofence Distance:** Penalties applied for every meter away from the lecture hall's epicenter.
* **Lateness:** Dynamic decay applied based on the time elapsed since the session started.
* **Mock Location Detection:** Instantly flags students using GPS spoofing apps.
* **Auth Method:** Slight penalties for using manual OTPs over cryptographic QR scans.

Lecturers can adjust the **Geofence Sensitivity Threshold** slider in their settings to determine exactly what score constitutes a valid attendance mark.

### 3. Master Attendance Reports
Stop wrestling with Excel files. The web portal features a powerful, cross-tabulated **Master Report Matrix**.
* Views attendance across all active weeks in a single, horizontally-scrollable matrix.
* Color-codes student scores (Green > 85%, Yellow > 70%, Red < 70%).
* Automatically calculates a global percentage rate for the entire semester.
* Displays integrated `DiceBear` initials avatars for quick visual identification.

### 4. Collaborative Teaching (Co-Lecturers)
Instructors can share their course Invite Code with colleagues. Once a colleague joins as a co-lecturer, they gain full administrative rights to:
* Manage the weekly timetable/schedule.
* Start and stop live sessions.
* View and export master attendance reports.
* Eject students from the course.
*(Only the original Course Owner retains the right to permanently delete the course itself).*

### 5. Global Real-time Notifications
The built-in notification bell fetches and formats unseen updates across all your courses, alerting you when colleagues start sessions, create new schedules, or update venues.

---

## 🛠 Tech Stack

* **Core Framework:** React 18 + TypeScript + Vite
* **Routing:** React Router v6 (Client-side history)
* **Styling:** Tailwind CSS (Vanilla utilities, no heavy component libraries)
* **Icons & Assets:** `lucide-react`, `DiceBear API`
* **Deployment:** Vercel (Configured with `vercel.json` for SPA rewrites)
* **Backend Integration:** Connects to a Go-based REST API (currently deployed to HuggingFace Spaces).

---

## Getting Started

### Prerequisites
* Node.js (v18+)
* npm or yarn

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/geotas-web.git
   cd geotas-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Ensure the `.env.production` (or `.env.local` for development) points to your Go backend instance:
   ```env
   VITE_API_URL=https://niyiayooluwa-geotas.hf.space
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

## Authentication Flow
The Web Portal is strictly restricted to users with the `lecturer` role. 
* Students attempting to log into the web portal will be immediately rejected at the API boundary (they must use the Flutter Mobile App).
* All authentication relies on Stateless JWTs passed in the `Authorization: Bearer <token>` header.
* Registration requires an active `.edu.ng` institutional email address.

---

## Design Philosophy
The GEOTAS Web Portal was built with a **dark-monochrome, premium aesthetic**. It avoids generic primary colors in favor of sleek neutral palettes (`neutral-900`, `neutral-50`), glassmorphism effects, and highly curated typography. The UI is designed to feel native, rapid, and profoundly professional.
