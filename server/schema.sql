-- Database Schema for UniVerse GateKeeper

CREATE DATABASE IF NOT EXISTS universe_gatekeeper;
USE universe_gatekeeper;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
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
    room_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL,
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
    left_at TIMESTAMP,
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
    type ENUM('outing', 'emergency', 'vacation') NOT NULL,
    status ENUM('pending', 'approved_staff', 'approved_hod', 'approved_warden', 'rejected', 'cancelled', 'generated', 'completed') DEFAULT 'pending',
    reason TEXT,
    departure_date DATETIME NOT NULL,
    return_date DATETIME NOT NULL,
    qr_code_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Logs Table (Gatekeeper Action)
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    gatekeeper_id INT NOT NULL,
    action ENUM('exit', 'entry') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
