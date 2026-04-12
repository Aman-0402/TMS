# TMS - Training Management System

A comprehensive Training Management System built with **Django REST Framework** backend and **React** frontend. This system helps manage trainers, students, batches, attendance, labs, exams, results, and certificates.

## 🚀 Features

- **User Management**: Account creation and authentication with JWT tokens
- **Batch Management**: Create and manage training batches
- **Student Management**: Enroll students in batches and track their progress
- **Trainer Management**: Manage trainers and assign them to batches
- **Attendance Tracking**: Record and manage student attendance
- **Labs Management**: Create and manage lab assignments
- **Exams Management**: Schedule and manage exams
- **Results Management**: Track exam and lab results
- **Certificates**: Generate and manage completion certificates
- **CORS Enabled**: Configured for production deployment with secure origins

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.0.6
- **API**: Django REST Framework 3.17.1
- **Authentication**: JWT (djangorestframework-simplejwt 5.5.1)
- **Database**: MySQL (PyMySQL 1.1.2)
- **CORS**: django-cors-headers 4.9.0
- **Server**: Gunicorn 25.3.0

### Frontend
- **Framework**: React
- **Build Tool**: Vite
- **Deployment**: Netlify (https://tmsethnotec.netlify.app)

### Data Processing
- **pandas**: Data manipulation and analysis
- **numpy**: Numerical computing
- **openpyxl**: Excel file handling

## 📋 Prerequisites

- Python 3.8+
- Node.js 14+
- MySQL 5.7+ (or compatible)
- pip (Python package manager)
- npm (Node package manager)

## ⚙️ Installation

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TMS
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   cd tms
   pip install -r requirements.txt
   ```

4. **Configure database**
   - Update `tms/settings.py` with your MySQL credentials:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'mysql_compat',
           'NAME': 'tms_database',
           'USER': 'root',
           'PASSWORD': 'your_password',
           'HOST': 'localhost',
           'PORT': '3306',
       }
   }
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```
   Server runs on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5173`

## 🔐 CORS Configuration

The application is configured with CORS support for:

- **Development**: `http://localhost:5173`, `http://127.0.0.1:5173`
- **Production**: `https://tmsethnotec.netlify.app`

### CORS Settings (tms/settings.py)
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://tmsethnotec.netlify.app',
]

CSRF_TRUSTED_ORIGINS = [
    'https://tmsethnotec.netlify.app',
]
```

**Note**: `CorsMiddleware` is positioned first in the MIDDLEWARE list for proper request handling.

## 📁 Project Structure

```
TMS/
├── frontend/               # React frontend application
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── tms/                    # Django backend
│   ├── accounts/           # User authentication & management
│   ├── attendance/         # Attendance tracking
│   ├── batch/              # Batch management
│   ├── certificates/       # Certificate generation
│   ├── exams/              # Exam management
│   ├── labs/               # Lab assignments
│   ├── results/            # Results tracking
│   ├── students/           # Student management
│   ├── trainers/           # Trainer management
│   ├── tms/                # Django settings & URLs
│   ├── manage.py
│   ├── requirements.txt
│   └── Procfile
├── nixpacks.toml           # Deployment configuration
└── railway.json            # Railway deployment settings
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/token/refresh` - Refresh JWT token

### Students
- `GET/POST /api/students/` - List/Create students
- `GET/PUT/DELETE /api/students/<id>/` - Student details

### Trainers
- `GET/POST /api/trainers/` - List/Create trainers
- `GET/PUT/DELETE /api/trainers/<id>/` - Trainer details

### Batches
- `GET/POST /api/batches/` - List/Create batches
- `GET/PUT/DELETE /api/batches/<id>/` - Batch details

### Attendance
- `GET/POST /api/attendance/` - Record attendance
- `GET /api/attendance/<id>/` - Attendance details

### Exams
- `GET/POST /api/exams/` - Manage exams
- `GET/POST /api/results/` - Manage exam results

### Certificates
- `GET/POST /api/certificates/` - Manage certificates

## 🚀 Deployment

### Railway Deployment
The project includes Railway configuration for easy deployment:
- Update `railway.json` with your deployment settings
- Configure environment variables for production

### Netlify Deployment (Frontend)
The frontend is deployed on Netlify:
- Production URL: `https://tmsethnotec.netlify.app`
- Automatically deployed from connected Git repository

### Environment Variables
Create a `.env` file in the `tms/` directory:
```
DEBUG=False
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=yourdomain.com
DATABASE_URL=mysql://user:password@host:port/dbname
```

## 📊 Database

### Tables
- Users (accounts)
- Students
- Trainers
- Batches
- Attendance
- Labs
- Exams
- Results
- Certificates

The system uses MySQL with UTF-8MB4 charset for full unicode support.

## 🔑 Default Admin Credentials
After running migrations and creating a superuser, access the admin panel at:
```
http://localhost:8000/admin
```

## 📝 License

This project is proprietary and confidential.

## 👥 Contributing

For development contributions, please:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Create a pull request with detailed description

## 📧 Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated**: April 2026
