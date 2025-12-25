const express = require('express');
const app = express();

try {
    app.get('*', (req, res) => {
        res.send('ok');
    });
    console.log('Success: app.get("*") works');
} catch (e) {
    console.error('Error in app.get("*"):');
    console.error(e);
}
