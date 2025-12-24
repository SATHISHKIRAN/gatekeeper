# UniVerse GateKeeper v1.0 🛡️

A comprehensive Full-Stack Campus Security and Gate Management System built for modern universities.

## 🚀 Features

### 👤 Role-Based Portals (RBAC)
- **Student**: Apply for passes, view live status, and access digital QR wallet.
- **Staff/Faculty**: One-tap approval queue for student requests.
- **HOD**: Department-wide statistics, bulk approvals, and medical emergency overrides.
- **Warden**: Final verification board with student trust scores and AI risk insights.
- **Gatekeeper**: Simulated QR scanner for validating entries and exits with real-time logging.
- **Admin**: Global analytics dashboard with campus-wide metrics and trends.

### 🧠 Intelligent Core
- **AI Risk Assessment**: Predicts student risk levels (LOW to CRITICAL) based on outing patterns.
- **Trust Score System**: Dynamic scoring that influences approval workflows.

### ✨ Modern UI/UX
- **Dark Mode**: Toggleable dark/light themes with system persistence.
- **Responsive**: Fully optimized for mobile, tablet, and desktop.
- **Animations**: Fluid page transitions and micro-interactions using Framer Motion.

---

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons, Recharts.
- **Backend**: Node.js, Express.
- **Database**: MySQL.
- **Auth**: JWT (JSON Web Tokens), Bcrypt.

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js (v16+)
- MySQL Server

### 2. Environment Configuration
Create a `.env` file in the `server/` directory with the following:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=gatekeeper_db
JWT_SECRET=your_super_secret_key
```

### 3. Database Setup
```bash
cd server
npm install
node setup_db.js
```

### 4. Running the Application
**Backend:**
```bash
cd server
npm start
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

---

## 📝 Demo Credentials
| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@universe.com` | `password123` |
| Student | `student@universe.com` | `password123` |
| Warden | `warden@universe.com` | `password123` |
| HOD | `hod@universe.com` | `password123` |

---

Developed with ❤️ for UniVerse Campus.
