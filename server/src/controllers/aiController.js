const db = require('../config/database');

exports.predictRisk = async (req, res) => {
    const { studentId } = req.body;

    if (!studentId) {
        return res.status(400).json({ message: 'Student ID required' });
    }

    try {
        // 1. Fetch student history
        const [history] = await db.query(
            'SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [studentId]
        );

        // 2. Fetch trust score
        const [users] = await db.query('SELECT trust_score FROM users WHERE id = ?', [studentId]);
        const trustScore = users[0]?.trust_score || 100;

        // 3. Simple Heuristic "AI" Logic
        let riskLevel = 'LOW';
        let riskFactors = [];
        let predictionConfidence = 0.85; // Mock confidence

        // Logic: High frequency of outings = Risk?
        const recentOutings = history.filter(h => h.type === 'outing').length;

        if (trustScore < 70) {
            riskLevel = 'MEDIUM';
            riskFactors.push('Low Trust Score');
        }

        if (recentOutings > 5) { // More than 5 outings in last 10 requests
            riskLevel = 'HIGH';
            riskFactors.push('Frequent Outings Pattern detected');
            predictionConfidence = 0.92;
        }

        if (trustScore < 50) {
            riskLevel = 'CRITICAL';
            riskFactors.push('Critical Trust Deficit');
        }

        // Mock "Pattern Matching"
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 5 || dayOfWeek === 6) { // Fri/Sat
            riskFactors.push('Weekend Bunk Trend');
        }

        res.json({
            studentId,
            riskLevel, // LOW, MEDIUM, HIGH, CRITICAL
            riskScore: (100 - trustScore) + (recentOutings * 5), // Mock score
            confidence: predictionConfidence,
            factors: riskFactors
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'AI Service Error' });
    }
};
