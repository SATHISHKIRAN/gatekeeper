const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../client/src/pages/HOD/Dashboard.jsx');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');

    // Indices are 0-based. Line 294 is index 293. Line 424 is index 423.
    // We want to extract lines 294 to 424 inclusive.
    const startLine = 294;
    const endLine = 424;

    const startIndex = startLine - 1;
    const endIndex = endLine; // Slice is exclusive of end, so endLine (index 423) + 1 = 424?
    // No, slice(start, end). lines[start] is included. lines[end] is excluded.
    // To include index 423, we need slice(293, 424).

    const block = lines.slice(startIndex, endIndex);

    // Verify block starts and ends correctly
    if (!block[0].includes('Pass Management Section')) {
        throw new Error('Start line mismatch: ' + block[0]);
    }
    // Check end line (it's just a closing div, generic, but let's trust the line numbers from view_file)
    console.log('Block start:', block[0]);
    console.log('Block end:', block[block.length - 1]);

    // Remove the block
    lines.splice(startIndex, endIndex - startIndex);

    // Insert at Line 121 (Index 120)
    const insertIndex = 120;

    // Add a spacer line before if needed, but existing line 121 was empty.
    lines.splice(insertIndex, 0, ...block);

    // Write back
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Successfully moved Pass Management section.');

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
