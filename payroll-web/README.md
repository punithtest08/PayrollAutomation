# HRMS — Production-Level HR Management System

React + Node.js + MongoDB · Indian Payroll · FY 2024-25

---

## System Architecture

```
Frontend (React + Vite + Tailwind)  →  Vite proxy  →  Backend (Express + Mongoose)  →  MongoDB
                                                              ↓
                                                       node-cron (1st of month)
                                                       Auto payroll generation
```

---

## Complete Data Flow

```
Add Employee
  → computeCTCBreakdown() stores all salary components in DB
  → Offer confirmation email sent (Nodemailer)
  → Initial payroll generated for current month

Mark Attendance (daily)
  → Upsert record per employee per date
  → Prevents duplicates via compound index

Cron Job (0 0 1 * * — 1st of every month, IST)
  → Fetches all Active employees
  → Counts attendance (Present=1, Half Day=0.5)
  → computeMonthlyPayroll() → prorates salary by attendance
  → Calculates PF, TDS (New Tax Regime), Professional Tax
  → Upserts Payroll record (prevents duplicates)
  → Writes AuditLog entry

Dashboard
  → Aggregates live data from all 5 collections
  → No hardcoded/mock data anywhere
```

---

## Payroll Calculation Logic

### CTC Breakdown (stored on employee create)
| Component         | Formula                              |
|-------------------|--------------------------------------|
| Basic             | 50% of Annual CTC                    |
| HRA               | 40% of Basic                         |
| PF (Employer)     | 12% of Basic (capped at ₹15,000/mo) |
| Gratuity          | 4.81% of Basic                       |
| Special Allowance | CTC − Basic − HRA − PF − Gratuity   |

### Monthly Payroll (attendance-prorated)
```
ratio          = min(daysWorked, 26) / 26
proratedBasic  = monthlyBasic  × ratio
proratedHRA    = monthlyHRA    × ratio
proratedSpecial= monthlySpecial× ratio
grossSalary    = proratedBasic + proratedHRA + proratedSpecial + bonus

PF deduction   = min(proratedBasic, ₹15,000) × 12%
TDS            = computeAnnualTax(annualisedIncome) / 12
ProfTax        = ₹200 (fixed)

netSalary      = grossSalary − PF − TDS − ProfTax
```

### Indian Tax Slabs (New Regime FY 2024-25)
| Income Slab         | Rate |
|---------------------|------|
| Up to ₹3,00,000     | 0%   |
| ₹3L – ₹7L          | 5%   |
| ₹7L – ₹10L         | 10%  |
| ₹10L – ₹12L        | 15%  |
| ₹12L – ₹15L        | 20%  |
| Above ₹15L         | 30%  |

- Standard Deduction: ₹75,000
- Rebate u/s 87A: Zero tax if taxable income ≤ ₹7,00,000
- Health & Education Cess: 4%

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (`mongod`) or MongoDB Atlas URI
- Git

### 1. Clone & Install

```bash
# Backend
cd payroll-web/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Backend Environment

Edit `payroll-web/backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hrms
JWT_SECRET=your_strong_secret_here
JWT_EXPIRY=8h

# Optional: SMTP for offer confirmation emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
FROM_NAME=HRMS Portal

FRONTEND_URL=http://localhost:3000
```

> For Gmail: enable 2FA → generate App Password at myaccount.google.com/apppasswords

### 3. Run the Application

**Terminal 1 — Backend:**
```bash
cd payroll-web/backend
npm run dev
# → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd payroll-web/frontend
npm run dev
# → http://localhost:3000
```

### 4. Create Your First HR Account

Open http://localhost:3000 → click **Sign Up** → select role **HR Manager**.

---

## Sample Test Data

### Create HR User (via UI signup or API)
```json
POST /api/auth/signup
{
  "name": "Priya Sharma",
  "email": "priya@company.com",
  "password": "Admin@123",
  "role": "HR"
}
```

### Add Employees
```json
POST /api/employees
Authorization: Bearer <token>

{
  "empId": "EMP001",
  "name": "Arjun Mehta",
  "email": "arjun@company.com",
  "department": "Engineering",
  "position": "Senior Software Engineer",
  "salary": 1200000,
  "phone": "+91 9876543210",
  "doj": "2024-01-15",
  "offerLetter": "OL-2024-001"
}
```

```json
{
  "empId": "EMP002",
  "name": "Sneha Patel",
  "email": "sneha@company.com",
  "department": "Product",
  "position": "Product Manager",
  "salary": 1800000,
  "phone": "+91 9876543211",
  "doj": "2024-02-01",
  "offerLetter": "OL-2024-002"
}
```

```json
{
  "empId": "EMP003",
  "name": "Rahul Verma",
  "email": "rahul@company.com",
  "department": "Design",
  "position": "UI/UX Designer",
  "salary": 900000,
  "phone": "+91 9876543212",
  "doj": "2024-03-10"
}
```

### Expected CTC Breakdown for EMP001 (₹12,00,000 CTC)
| Component         | Annual      | Monthly   |
|-------------------|-------------|-----------|
| Basic (50%)       | ₹6,00,000   | ₹50,000   |
| HRA (40% Basic)   | ₹2,40,000   | ₹20,000   |
| PF (12%, ₹15k cap)| ₹21,600     | ₹1,800    |
| Gratuity (4.81%)  | ₹28,860     | ₹2,405    |
| Special Allowance | ₹3,09,540   | ₹25,795   |
| **Total CTC**     | **₹12,00,000** | **₹1,00,000** |

### Mark Attendance
```json
POST /api/attendance
{
  "employee": "<employee_mongodb_id>",
  "date": "2025-01-15",
  "status": "Present",
  "checkIn": "09:00",
  "checkOut": "18:00"
}
```

### Manually Trigger Payroll
```json
POST /api/payroll/generate
{
  "employee": "<employee_mongodb_id>",
  "month": "2025-01",
  "bonus": 5000
}
```

### Run Payroll for All Employees
```json
POST /api/payroll/run-month
{ "month": "2025-01" }
```

### Apply Leave
```json
POST /api/leaves
{
  "employee": "<employee_mongodb_id>",
  "type": "Casual",
  "from": "2025-01-20",
  "to": "2025-01-22",
  "reason": "Family function"
}
```

---

## API Reference

| Method | Endpoint                          | Auth     | Description                        |
|--------|-----------------------------------|----------|------------------------------------|
| POST   | /api/auth/signup                  | Public   | Create HR/Manager account          |
| POST   | /api/auth/login                   | Public   | Login, returns JWT                 |
| GET    | /api/auth/me                      | Any      | Current user info                  |
| GET    | /api/employees                    | Any      | List employees (search/filter)     |
| POST   | /api/employees                    | HR only  | Add employee + auto CTC + payroll  |
| GET    | /api/employees/:id                | Any      | Single employee                    |
| GET    | /api/employees/:id/full-profile   | Any      | Employee + attendance + payroll + leaves |
| PUT    | /api/employees/:id                | HR only  | Update employee                    |
| DELETE | /api/employees/:id                | HR only  | Delete employee                    |
| GET    | /api/employees/departments        | Any      | Distinct department list           |
| GET    | /api/employees/confirm            | Public   | Offer confirmation link handler    |
| POST   | /api/attendance                   | HR only  | Mark/update attendance             |
| GET    | /api/attendance?date=YYYY-MM-DD   | Any      | All attendance for a date          |
| GET    | /api/attendance/:employeeId       | Any      | Full attendance history            |
| GET    | /api/attendance/summary/:id       | Any      | Monthly summary                    |
| POST   | /api/payroll/generate             | HR only  | Generate payroll for one employee  |
| POST   | /api/payroll/run-month            | HR only  | Run payroll for all employees      |
| GET    | /api/payroll                      | Any      | All payroll (filter by month/emp)  |
| GET    | /api/payroll/slip/:id             | Any      | Single salary slip                 |
| GET    | /api/payroll/employee/:empId      | Any      | Payroll history for employee       |
| PUT    | /api/payroll/:id/status           | HR only  | Update payroll status              |
| POST   | /api/leaves                       | Any      | Apply for leave                    |
| GET    | /api/leaves                       | Any      | All leaves (filter by status/emp)  |
| PUT    | /api/leaves/:id/review            | HR only  | Approve/Reject leave               |
| DELETE | /api/leaves/:id                   | HR only  | Delete leave                       |
| GET    | /api/dashboard                    | Any      | Dashboard summary stats            |
| GET    | /api/dashboard/audit              | Any      | Audit log entries                  |

---

## MongoDB Collections & Indexes

| Collection | Key Indexes                                    |
|------------|------------------------------------------------|
| employees  | empId (unique), email (unique)                 |
| attendance | { employee, date } (unique compound)           |
| payroll    | { employee, month } (unique compound)          |
| leaves     | employee, status                               |
| auditlogs  | createdAt (desc)                               |
| users      | email (unique)                                 |

---

## Frontend Navigation Flow

```
/login          → LoginPage (JWT auth)
/               → Dashboard (stats, charts, audit log)
/employees      → Employee list table (click row → detail)
/employees/:id  → EmployeeDetail
                    Tab: Profile    → personal info + CTC breakdown
                    Tab: Attendance → monthly table + summary
                    Tab: Payroll    → salary history + slip modal
                    Tab: Leaves     → leave records + approve/reject
/attendance     → Daily attendance marking
/leaves         → Leave management
/payroll        → Payroll generation + salary slips
/confirm        → Offer confirmation (public, email link)
```

---

## Cron Job

Scheduled: `0 0 1 * *` (1st of every month at midnight IST)

- Fetches all `Active` employees
- For each: counts attendance for the month (Present=1, Half Day=0.5)
- Falls back to 26 days if no attendance data (new joiners)
- Upserts payroll record (idempotent — safe to re-run)
- Writes audit log entry per employee + summary entry

Manual trigger: `POST /api/payroll/run-month { "month": "2025-01" }`

---

## Role-Based Access

| Feature                    | HR Manager | Manager |
|----------------------------|------------|---------|
| View employees/payroll     | ✅         | ✅      |
| Add/edit/delete employees  | ✅         | ❌      |
| Mark attendance            | ✅         | ❌      |
| Generate payroll           | ✅         | ❌      |
| Approve/reject leaves      | ✅         | ❌      |
| View dashboard             | ✅         | ✅      |
