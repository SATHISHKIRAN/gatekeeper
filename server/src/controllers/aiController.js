const db = require('../config/database');

exports.predictRisk = async (req, res) => {
    const { studentId } = req.body;

    if (!studentId) {
        return res.status(400).json({ message: 'Student ID required' });
    }

    try {
        // 1. Fetch student history with logs to detect late entries
        const [history] = await db.query(
            `SELECT r.*, l.timestamp as action_time, l.action
             FROM requests r 
             LEFT JOIN logs l ON r.id = l.request_id AND l.action = 'entry'
             WHERE r.user_id = ? 
             ORDER BY r.created_at DESC LIMIT 10`,
            [studentId]
        );

        // 2. Fetch trust score
        const [users] = await db.query('SELECT trust_score FROM users WHERE id = ?', [studentId]);
        const trustScore = users[0]?.trust_score || 100;

        // 3. Simple Heuristic "AI" Logic
        let riskLevel = 'LOW';
        let riskFactors = [];
        let predictionConfidence = 0.85;
        let reasoning = "Everything looks normal. The student follows the rules and returns on time.";

        // Logic: Late Returns Detection
        const lateReturns = history.filter(h => h.action_time && new Date(h.action_time) > new Date(h.return_date)).length;
        const recentOutings = history.filter(h => h.type === 'outing').length;

        if (lateReturns > 0) {
            riskLevel = 'MEDIUM';
            riskFactors.push(`${lateReturns} Late Returns detected`);
            reasoning = `The student has come back late ${lateReturns} times. They might not be taking the hostel timings seriously.`;
        }

        if (trustScore < 70) {
            riskLevel = 'MEDIUM';
            riskFactors.push('Low Trust Score');
            if (lateReturns > 0) reasoning += " Also, their trust score is starting to drop.";
        }

        if (recentOutings > 5) {
            riskLevel = 'HIGH';
            riskFactors.push('Frequent Outings Pattern detected');
            predictionConfidence = 0.92;
            reasoning = "The student goes out very often and is sometimes late. This is a risky pattern.";
        }

        if (trustScore < 50) {
            riskLevel = 'CRITICAL';
            riskFactors.push('Critical Trust Deficit');
            reasoning = "The student is repeatedly breaking rules and has a very low trust score. You should check on them immediately.";
        }

        // Weekend Bunk Detection
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 1 && lateReturns > 0) { // Monday check for weekend lates
            riskFactors.push('Weekend Delay Pattern');
            reasoning += " They are often late when coming back after the weekend.";
        }

        res.json({
            studentId,
            riskLevel,
            riskScore: (100 - trustScore) + (recentOutings * 5) + (lateReturns * 10),
            confidence: predictionConfidence,
            factors: riskFactors,
            reasoning // Simplified reasoning for Warden UI
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'AI Service Error' });
    }
};
