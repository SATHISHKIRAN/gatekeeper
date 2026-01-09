const db = require('../config/database');
const crypto = require('crypto');
const { deductTrustScore } = require('../utils/trustUtils');

// Helper to generate unique QR string
const generateQRHash = (userId, requestId) => {
    return crypto.createHash('sha256').update(`${userId}-${requestId}-${Date.now()}`).digest('hex');
};

const { sendNotification } = require('./notificationController');

exports.createRequest = async (req, res) => {
    let { type, reason, departure_date, return_date } = req.body;
    const userId = req.user.id;

    if (!type || !departure_date) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // --- DAY SCHOLAR LEAVE FIX ---
    // If Day Scholar applies for Leave, they rely on 'exit only'. 
    // If return_date is missing, we set it to end of departure day (23:59:59) for logic consistency.
    let isReturnAutoFilled = false;
    if (!return_date) {
        const d = new Date(departure_date);
        d.setHours(23, 59, 59, 0); // End of same day
        return_date = d.toISOString();
        isReturnAutoFilled = true;
    }

    // --- LAZY EXPIRATION / CLEANUP (Day Scholar Workflows) ---
    // Rule: Clean up old 'approved' passes that are legally 'done' based on time, specifically for Day Scholars 
    // where gate scans might be skipped (Leave/OD) or missed (Permission).
    try {
        // 1. Expire missed Permissions (Departure + 2 hours grace)
        await db.query(`
            UPDATE requests 
            SET status = 'expired' 
            WHERE user_id = ? 
            AND status = 'approved_hod' 
            AND type = 'Permission' 
            AND departure_date < DATE_SUB(NOW(), INTERVAL 2 HOUR)
        `, [userId]);

        // 2. Complete lapsed Leave/OD (Return Date passed)
        // Only for Day Scholars mostly, but safe for all 'No Scan' types if we implement globally.
        // For now, let's target Leave/OD specifically.
        await db.query(`
            UPDATE requests 
            SET status = 'completed' 
            WHERE user_id = ? 
            AND status = 'approved_hod' 
            AND type IN ('Leave', 'On Duty') 
            AND return_date < NOW()
        `, [userId]);

    } catch (cleanupErr) {
        console.warn('Lazy Pass Cleanup Failed:', cleanupErr.message);
        // Continue flow, don't fail request
    }

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // --- PARALLEL QUERY EXECUTION ---
        const [
            [[user]],
            [requestCount],
            [existing],
            [cancellationCount]
        ] = await Promise.all([
            db.query('SELECT status, pass_blocked, department_id, year, student_type, mentor_id, name, trust_score, cooldown_override_until FROM users WHERE id = ?', [userId]),
            db.query('SELECT COUNT(*) as count FROM requests WHERE user_id = ? AND created_at >= ?', [userId, startOfMonth]),
            db.query('SELECT id FROM requests WHERE user_id = ? AND status NOT IN ("completed", "rejected", "cancelled", "expired") LIMIT 1', [userId]),
            db.query('SELECT COUNT(*) as count FROM requests WHERE user_id = ? AND status = "cancelled" AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)', [userId])
        ]);

        if (!user) {
            return res.status(401).json({ message: 'User not found. Please login again.' });
        }

        // --- 1. 7-DAY ADVANCE LIMIT ---
        const now = new Date();
        const departure = new Date(departure_date);
        const limitDate = new Date();
        limitDate.setDate(now.getDate() + 7);

        if (departure > limitDate) {
            return res.status(400).json({
                message: 'Advance Booking Limit: You cannot apply for a pass more than 7 days in advance.',
                severity: 'warning'
            });
        }
        if (departure < now && (now - departure) > 5 * 60 * 1000) { // 5 min grace
            return res.status(400).json({ message: 'Invalid Date: Departure cannot be in the past.' });
        }

        // --- 2. DYNAMIC POLICY ENGINE ---
        // Fetch Calendar Status
        const departureDateStr = departure.toISOString().split('T')[0];
        const [holidays] = await db.query('SELECT * FROM calendar_events WHERE start_date <= ? AND end_date >= ? AND type = "holiday"', [departureDateStr, departureDateStr]);

        const dayOfWeek = departure.getDay();
        const isDbHoliday = holidays.length > 0;
        const isHoliday = isDbHoliday || dayOfWeek === 0 || dayOfWeek === 6; // Holiday = DB Event OR Weekend (Sat/Sun)

        // Fetch Applicable Policy
        const studentTypeKey = user.student_type && user.student_type.toLowerCase().includes('day') ? 'Day Scholar' : 'Hostel';
        const [policies] = await db.query('SELECT * FROM pass_policies WHERE student_type = ? AND pass_type = ?', [studentTypeKey, type]);
        const policy = policies[0];

        if (policy) {
            const hour = departure.getHours();
            if (isHoliday) {
                // --- HOLIDAY RULES ---
                if (policy.holiday_behavior === 'block') {
                    return res.status(400).json({
                        message: `Holiday Restriction: ${type} passes are NOT allowed on Holidays/Sundays for ${studentTypeKey}s.`,
                        severity: 'error'
                    });
                } else if (policy.holiday_behavior === 'custom_time') {
                    const hStart = parseInt(policy.holiday_start.split(':')[0]);
                    const hEnd = parseInt(policy.holiday_end.split(':')[0]);
                    if (hour < hStart || hour >= hEnd) {
                        return res.status(400).json({
                            message: `Holiday Timing: ${type} allowed only between ${policy.holiday_start} and ${policy.holiday_end}.`,
                            severity: 'warning'
                        });
                    }
                }
            } else {
                // --- WORKING DAY RULES ---
                if (policy.working_start && policy.working_end) {
                    const wStart = parseInt(policy.working_start.split(':')[0]);
                    const wEnd = parseInt(policy.working_end.split(':')[0]);
                    if (hour < wStart || hour >= wEnd) {
                        return res.status(400).json({
                            message: `Time Restriction: ${type} allowed only between ${policy.working_start} and ${policy.working_end} on Working Days.`,
                            severity: 'warning'
                        });
                    }
                }
            }

            // --- DURATION CHECK ---
            if (policy.max_duration_hours) {
                const ret = new Date(return_date);
                const diffMs = ret - departure;
                const diffHrs = diffMs / (1000 * 60 * 60);
                if (diffHrs > policy.max_duration_hours) {
                    return res.status(400).json({
                        message: `Duration Limit: Maximum allowed duration for this pass is ${policy.max_duration_hours} hours.`,
                        severity: 'warning'
                    });
                }
            }
        }

        // --- EXCESSIVE REQUEST CHECK ---
        const count = requestCount[0].count;
        if (count >= 5) {
            // Async Trust Score Deduction (No await)
            deductTrustScore(userId, 5, `Excessive Requests: Request #${count + 1} this month`).catch(console.error);
        }

        // --- STATUS BLOCK (Suspended/Inactive) ---
        if (user.status && ['suspended', 'inactive'].includes(user.status.toLowerCase())) {
            return res.status(403).json({
                message: `ACCOUNT_BLOCKED: Your account status is '${user.status}'. You cannot apply for passes. Please contact the Principal.`,
                severity: 'critical'
            });
        }

        // --- EXISTING REQ CHECK ---
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You already have an active or pending request.' });
        }

        // --- CANCELLATION ABUSE CHECK ---
        let cancelCount = cancellationCount[0].count;

        // Custom override logic (if present)
        if (user.cooldown_override_until) {
            const [customCancel] = await db.query('SELECT COUNT(*) as count FROM requests WHERE user_id = ? AND status = "cancelled" AND updated_at > ?', [userId, user.cooldown_override_until]);
            cancelCount = customCancel[0].count;
        }

        if (cancelCount >= 3) {
            return res.status(429).json({
                message: `COOL_DOWN_BLOCK: You have cancelled 3 passes recently. You are temporarily restricted.`,
                severity: 'high'
            });
        }

        // --- TRUST SCORE BLOCK ---
        if (user.trust_score < 30) {
            return res.status(403).json({
                message: 'TRUST_BLOCK: Your Trust Score is critically low (<30). Access denied.',
                severity: 'critical'
            });
        }

        if (user.pass_blocked) {
            return res.status(403).json({
                message: 'INDIVIDUAL_BLOCK: Your pass application privileges have been suspended by the HOD.',
                severity: 'high'
            });
        }

        // --- YEAR RESTRICTION CHECK (Depends on User) ---
        const [restrictions] = await db.query(
            'SELECT reason FROM pass_restrictions WHERE department_id = ? AND academic_year = ?',
            [user.department_id, user.year]
        );

        if (restrictions.length > 0) {
            return res.status(403).json({
                message: `YEAR_BLOCK: Pass applications are currently suspended for Year ${user.year} students. Reason: ${restrictions[0].reason}`,
                severity: 'medium'
            });
        }

        const category = type === 'Emergency' ? 'critical' : 'general';

        const [result] = await db.query(
            'INSERT INTO requests (user_id, type, reason, departure_date, return_date, status, category) VALUES (?, ?, ?, ?, ?, "pending", ?)',
            [userId, type, reason, departure_date, return_date, category]
        );

        // Notify Student (Confirmation) (Async)
        sendNotification(
            { userId },
            {
                title: 'Pass Application Submitted',
                message: `Your request (ID: #${result.insertId}) for ${type} has been submitted and is pending Mentor recommendation.`,
                type: 'success',
                category: 'request',
                entityId: result.insertId
            }
        ).catch(err => console.error('Student Notification Failed:', err));

        // SMART NOTIFICATION ROUTING
        if (user.mentor_id) {
            // Check Mentor Availability
            const [mentorLeaves] = await db.query(
                'SELECT id FROM staff_leaves WHERE user_id = ? AND status = "approved" AND CURDATE() BETWEEN start_date AND end_date',
                [user.mentor_id]
            );

            if (mentorLeaves.length > 0) {
                // MENTOR IS ON LEAVE - ESCALATE TO HOD
                const [[department]] = await db.query('SELECT hod_id FROM departments WHERE id = ?', [user.department_id]);

                if (department && department.hod_id) {
                    // Check HOD Availability
                    const [hodLeaves] = await db.query(
                        'SELECT id FROM staff_leaves WHERE user_id = ? AND status = "approved" AND CURDATE() BETWEEN start_date AND end_date',
                        [department.hod_id]
                    );

                    let targetId = department.hod_id;
                    let roleName = 'HOD';
                    let isProxy = false;

                    if (hodLeaves.length > 0) {
                        // HOD IS ALSO ON LEAVE - ESCALATE TO PROXY
                        const [[proxy]] = await db.query('SELECT proxy_id FROM proxy_settings WHERE hod_id = ? AND is_active = TRUE', [department.hod_id]);
                        if (proxy) {
                            targetId = proxy.proxy_id;
                            roleName = 'Assistant HOD (Proxy)';
                            isProxy = true;
                        } else {
                            // No proxy? Fallback to HOD (queued)
                            console.warn('HOD on leave and no active Proxy found. Request queued for HOD.');
                        }
                    } else {
                        // Check for Proxy Delegation even if HOD is present active (e.g. manual override)
                        const [[proxy]] = await db.query('SELECT proxy_id FROM proxy_settings WHERE hod_id = ? AND is_active = TRUE', [department.hod_id]);
                        if (proxy) {
                            targetId = proxy.proxy_id;
                            roleName = 'Assistant HOD (Proxy)';
                            isProxy = true;
                        }
                    }

                    sendNotification(
                        { userId: targetId },
                        {
                            title: 'Escalated Request',
                            message: `${user.name} has requested a ${type} pass. Escalated to you as ${roleName} (Mentor on Leave).`,
                            type: 'warning',
                            link: '/hod',
                            category: 'escalated_request',
                            entityId: result.insertId
                        }
                    ).catch(err => console.error('Escalation Notification Failed:', err));
                }
            } else {
                // NORMAL ROUTE (Mentor Available)
                sendNotification(
                    { userId: user.mentor_id },
                    {
                        title: 'New Student Request',
                        message: `${user.name} has requested a ${type} pass.`,
                        type: 'info',
                        link: '/staff/queue',
                        category: 'approval_pending',
                        entityId: result.insertId
                    }
                ).catch(err => console.error('Mentor Notification Failed:', err));
            }
        }

        res.status(201).json({ message: 'Request submitted successfully', requestId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMyRequests = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [requests] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [req.user.id, parseInt(limit), offset]
        );

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) as total FROM requests WHERE user_id = ?',
            [req.user.id]
        );

        // --- COOL-DOWN INFO ---
        const [[user]] = await db.query('SELECT cooldown_override_until FROM users WHERE id = ?', [req.user.id]);

        if (!user) {
            // If user doesn't exist (db reset), return default/empty or error. 
            // Better to error so frontend can logout.
            return res.status(401).json({ message: 'User not found. Please login again.' });
        }

        let cooldownQuery = 'SELECT COUNT(*) as count FROM requests WHERE user_id = ? AND status = "cancelled" AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        let cooldownParams = [req.user.id];
        if (user.cooldown_override_until) {
            cooldownQuery += ' AND updated_at > ?';
            cooldownParams.push(user.cooldown_override_until);
        }
        const [[{ count: cooldownCount }]] = await db.query(cooldownQuery, cooldownParams);

        let cooldownInfo = { count: cooldownCount, active: cooldownCount >= 3, timeLeft: null };
        if (cooldownCount >= 3) {
            const [[lastCancel]] = await db.query('SELECT updated_at FROM requests WHERE user_id = ? AND status = "cancelled" ORDER BY updated_at DESC LIMIT 1 OFFSET 2', [req.user.id]);
            if (lastCancel) {
                const expiry = new Date(new Date(lastCancel.updated_at).getTime() + 24 * 60 * 60 * 1000);
                cooldownInfo.timeLeft = expiry.toISOString();
            }
        }

        res.json({
            requests,
            total,
            pages: Math.ceil(total / limit),
            cooldown: cooldownInfo
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.cancelRequest = async (req, res) => {
    const requestId = req.params.id;
    console.log(`[DEBUG] Attempting cancel for Request ID: ${requestId} by User: ${req.user.id}`);

    try {
        // Debug: Check current status
        const [check] = await db.query('SELECT status, type FROM requests WHERE id = ? AND user_id = ?', [requestId, req.user.id]);

        if (check.length === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        const { status, type } = check[0];
        console.log('[DEBUG] Request Status found:', status);

        // 1. EXIT BLOCK: Prevent cancellation if student has already exited (status is 'active')
        if (status === 'active') {
            return res.status(400).json({
                message: 'EXIT_BLOCK: You cannot cancel a pass after you have exited the campus.',
                severity: 'error'
            });
        }

        // 2. TRUST PENALTY LOGIC: Deduct 20 points for cancelling AFTER Final Approval
        // Final Approval = 'approved_warden' (Hostel) OR 'approved_hod' (Day Scholar / Proxy)
        if (status === 'approved_warden' || status === 'approved_hod') {
            await deductTrustScore(req.user.id, 20, `Late Cancellation: Cancelled 'Ready for Leave' pass`);
        }

        // 3. EXECUTE CANCELLATION
        // Allowed statuses: pending, approved_staff, approved_hod, approved_warden, emergency
        // We explicitly exclude 'rejected', 'cancelled', 'completed', 'active' (active handled above)
        const [result] = await db.query(
            'UPDATE requests SET status = "cancelled", updated_at = NOW() WHERE id = ? AND user_id = ? AND status IN ("pending", "approved_staff", "approved_hod", "approved_warden", "emergency", "generated")',
            [requestId, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Cannot cancel. Request is already processed or completed.' });
        }

        // --- NOTIFICATION LOGIC ---
        // Fetch user details for notification
        const [[userData]] = await db.query('SELECT name, mentor_id FROM users WHERE id = ?', [req.user.id]);

        // Count cancellations in last 24h to add context
        const [cancelCountRes] = await db.query(
            'SELECT COUNT(*) as count FROM requests WHERE user_id = ? AND status = "cancelled" AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
            [req.user.id]
        );
        const cancelCount = cancelCountRes[0].count;

        // Notify Student (Async)
        sendNotification(
            { userId: req.user.id },
            {
                title: 'Pass Request Cancelled',
                message: `You have successfully cancelled your ${type} request.${cancelCount >= 3 ? ' Warning: You have hit the daily cancellation limit.' : ''}`,
                type: cancelCount >= 3 ? 'warning' : 'info',
                category: 'request',
                entityId: requestId
            }
        ).catch(err => console.error('Student Notification Failed:', err));

        // Notify Mentor (if assigned) (Async)
        if (userData && userData.mentor_id) {
            let mentorMsg = `${userData.name} has cancelled their ${type} request.`;
            let mentorTitle = 'Student Cancelled Pass';
            let notifType = 'info';

            if (cancelCount >= 3) {
                mentorTitle = 'Frequent Cancellation Alert';
                mentorMsg = `⚠️ Attention: ${userData.name} has cancelled 3 passes in the last 24 hours.`;
                notifType = 'warning';
            } else {
                mentorMsg += ` (Cancellation #${cancelCount} today)`;
            }

            sendNotification(
                { userId: userData.mentor_id },
                {
                    title: mentorTitle,
                    message: mentorMsg,
                    type: notifType,
                    category: 'system',
                    entityId: requestId
                }
            ).catch(err => console.error('Mentor Notification Failed:', err));
        }

        res.json({ message: 'Request cancelled successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.editRequest = async (req, res) => {
    const requestId = req.params.id;
    const { type, reason, departure_date, return_date } = req.body;

    if (!type || !departure_date || !return_date) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Only allow editing if status is 'pending'


        // --- 2-Hour Edit Lock Check ---
        // Fetch the CURRENT departure date (after update? No, we need to check BEFORE update usually, 
        // but since we already updated, we might have allowed it.
        // Wait, standard practice is check BEFORE update.
        // Re-ordering logic.

        /* 
           Wait, I need to check the OLD departure date or the NEW one?
           Usually "Edit 2hr before" means "You cannot edit if the CURRENTLY SCHEDULED departure is within 2 hours".
           Because if I have a pass for 10am, and it's 8:30am, I shouldn't be able to change it to 12pm to evade the lock.
        */

        const [current] = await db.query('SELECT departure_date FROM requests WHERE id = ? AND user_id = ?', [requestId, req.user.id]);
        if (current.length === 0) return res.status(404).json({ message: 'Request not found' });

        const now = new Date();
        const depTime = new Date(current[0].departure_date);
        const timeDiff = depTime - now;

        // If departure is in the past OR within next 2 hours (2 * 60 * 60 * 1000 = 7200000 ms)
        if (timeDiff < 7200000) {
            return res.status(400).json({ message: 'Edit Locked: You cannot edit a pass within 2 hours of departure (or if departure has passed).' });
        }

        const [result] = await db.query(
            'UPDATE requests SET type = ?, reason = ?, departure_date = ?, return_date = ? WHERE id = ? AND user_id = ? AND status = "pending"',
            [type, reason, departure_date, return_date, requestId, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Cannot edit. Request might not be pending or does not exist.' });
        }

        res.json({ message: 'Request updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTimeline = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Fetch Request Creation Time
        const [[request]] = await db.query('SELECT created_at, status, updated_at FROM requests WHERE id = ?', [id]);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        // 2. Fetch Staff Actions (Approvals)
        // We join with users to get the name of the approver if needed, but for now just timestamp and action_type
        const [staffActions] = await db.query(
            'SELECT action_type, timestamp, details FROM staff_actions WHERE request_id = ? ORDER BY timestamp ASC',
            [id]
        );

        // 3. Fetch Gate Logs (Exit/Entry)
        const [gateLogs] = await db.query(
            'SELECT action, timestamp FROM logs WHERE request_id = ? ORDER BY timestamp ASC',
            [id]
        );

        // Normalize and Merge
        const timeline = [
            { stage: 'submitted', timestamp: request.created_at, label: 'Request Submitted' }
        ];

        // Map Staff Actions to timeline stages
        staffActions.forEach(action => {
            if (action.action_type === 'approve_staff' || action.action_type === 'approve') {
                timeline.push({ stage: 'mentor', timestamp: action.timestamp, label: 'Mentor Verified' });
            } else if (action.action_type === 'approve_hod') {
                timeline.push({ stage: 'hod', timestamp: action.timestamp, label: 'HOD Approved' });
            } else if (action.action_type === 'approve_warden') {
                timeline.push({ stage: 'warden', timestamp: action.timestamp, label: 'Warden Authorized' });
            } else if (action.action_type.includes('reject')) {
                const role = action.action_type.split('_')[1] || 'Staff';
                timeline.push({
                    stage: 'rejected',
                    timestamp: action.timestamp,
                    label: `Rejected by ${role.toUpperCase()}`,
                    rejectedBy: role // Identify who rejected it for UI mapping
                });
            }
        });

        // Map Gate Logs
        gateLogs.forEach(log => {
            if (log.action === 'exit') {
                timeline.push({ stage: 'exit', timestamp: log.timestamp, label: 'Gate Exit' });
            } else if (log.action === 'entry') {
                timeline.push({ stage: 'return', timestamp: log.timestamp, label: 'Gate Return' });
            }
        });

        // Check for cancellation
        if (request.status === 'cancelled') {
            timeline.push({
                stage: 'cancelled',
                timestamp: request.updated_at,
                label: 'Request Cancelled'
            });
        }

        res.json(timeline);
    } catch (error) {
        console.error("Timeline Fetch Error:", error);
        res.status(500).json({ message: 'Server error fetching timeline' });
    }
};
