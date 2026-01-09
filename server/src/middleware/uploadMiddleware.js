const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base upload directories
const studentDir = 'c:\\Users\\mahesh-13145\\Downloads\\sk\\gate\\client\\public\\img\\student';
const staffDir = 'c:\\Users\\mahesh-13145\\Downloads\\sk\\gate\\client\\public\\img\\staff';

// Ensure directories exist
[studentDir, staffDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine directory based on role
        // Note: Frontend MUST append 'role' before 'profileImage' in FormData for this to work reliably
        const role = req.body.role || 'student';
        const targetDir = ['staff', 'hod', 'warden', 'gatekeeper', 'admin', 'principal'].includes(role) ? staffDir : studentDir;
        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        // Use register_number if available in body, otherwise fallback to timestamp
        const regNum = req.body.register_number ? req.body.register_number.trim() : `user-${Date.now()}`;
        // Sanitize filename
        const safeName = regNum.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const ext = path.extname(file.originalname);
        cb(null, `${safeName}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
