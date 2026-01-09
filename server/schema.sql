-- Database Schema for UniVerse GateKeeper

CREATE DATABASE IF NOT EXISTS universe_gatekeeper;
USE universe_gatekeeper;

SET FOREIGN_KEY_CHECKS = 0;

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hod_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255) DEFAULT NULL,
    role ENUM('student', 'staff', 'hod', 'warden', 'gatekeeper', 'admin', 'principal') NOT NULL,
    department_id INT DEFAULT NULL,
    register_number VARCHAR(50),
    year INT,
    mentor_id INT DEFAULT NULL,
    student_type ENUM('Day Scholar', 'Hostel') DEFAULT 'Day Scholar',
    hostel_id INT DEFAULT NULL,
    phone VARCHAR(20),
    parent_phone VARCHAR(20),
    address TEXT,
    trust_score INT DEFAULT 100,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    pass_blocked BOOLEAN DEFAULT FALSE,
    is_proxy_active BOOLEAN DEFAULT FALSE,
    cooldown_override_until DATETIME DEFAULT NULL,
    room_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Hostels Table
CREATE TABLE IF NOT EXISTS hostels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('Boys', 'Girls') NOT NULL,
    description TEXT,
    warden_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warden_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    floor INT NOT NULL,
    type ENUM('Single', 'Double', 'Triple', 'Dorm') DEFAULT 'Double',
    status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
);

-- Hostel Assignments Table (Legacy/Room-level)
CREATE TABLE IF NOT EXISTS hostel_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    status ENUM('active', 'history') DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    description TEXT,
    status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Hostel Announcements Table
CREATE TABLE IF NOT EXISTS hostel_announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority ENUM('Normal', 'Urgent') DEFAULT 'Normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
);

-- Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status ENUM('pending', 'approved_staff', 'approved_hod', 'approved_warden', 'rejected', 'cancelled', 'generated', 'completed', 'active') DEFAULT 'pending',
    reason TEXT,
    departure_date DATETIME NOT NULL,
    return_date DATETIME NOT NULL,
    qr_code_hash VARCHAR(255),
    category VARCHAR(50),
    forwarded_to INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (forwarded_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Logs Table (Gatekeeper Action)
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    gatekeeper_id INT NOT NULL,
    action ENUM('exit', 'entry') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (gatekeeper_id) REFERENCES users(id)
);

-- Proxy Settings
CREATE TABLE IF NOT EXISTS proxy_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hod_id INT NOT NULL,
    proxy_id INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (hod_id) REFERENCES users(id),
    FOREIGN KEY (proxy_id) REFERENCES users(id)
);

-- AI Predictions (Mock)
CREATE TABLE IF NOT EXISTS ai_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_type VARCHAR(50),
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trust Score History
CREATE TABLE IF NOT EXISTS trust_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    changed_by INT NOT NULL,
    old_score INT,
    new_score INT,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Visitor Passes Table
CREATE TABLE IF NOT EXISTS visitor_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    visitor_type ENUM('guest', 'worker', 'vendor', 'parent', 'other') DEFAULT 'guest',
    company VARCHAR(255),
    purpose VARCHAR(255) NOT NULL,
    host_name VARCHAR(255),
    host_department VARCHAR(100),
    id_proof_type ENUM('Aadhar', 'Driving License', 'ID Card', 'Other'),
    id_proof_number VARCHAR(50),
    check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out TIMESTAMP NULL,
    status ENUM('active', 'completed') DEFAULT 'active',
    gatekeeper_id INT NOT NULL,
    remarks TEXT,
    FOREIGN KEY (gatekeeper_id) REFERENCES users(id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    category VARCHAR(50) DEFAULT 'system',
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pass Restrictions
CREATE TABLE IF NOT EXISTS pass_restrictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    academic_year VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subscription JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Staff Actions Table (Logs)
CREATE TABLE IF NOT EXISTS staff_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    request_id INT,
    action_type VARCHAR(50) NOT NULL,
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL
);

-- Staff Leaves Table
CREATE TABLE IF NOT EXISTS staff_leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    reason TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    app_name VARCHAR(255) DEFAULT 'UniVerse GateKeeper',
    app_description TEXT,
    app_logo VARCHAR(255) DEFAULT '/logo.png',
    theme_primary VARCHAR(50) DEFAULT '#4F46E5',
    theme_secondary VARCHAR(50) DEFAULT '#10B981',
    maintenance_mode BOOLEAN DEFAULT FALSE,
    allow_registration BOOLEAN DEFAULT TRUE,
    low_cost_mode BOOLEAN DEFAULT FALSE,
    announcement_text TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    session_timeout INT DEFAULT 60,
    max_trust_score INT DEFAULT 100,
    min_trust_score INT DEFAULT 0,
    login_background MEDIUMTEXT
);

SET FOREIGN_KEY_CHECKS = 1;
