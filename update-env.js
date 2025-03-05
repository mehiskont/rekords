const fs = require('fs');

// Read .env file
fs.readFile('.env', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading .env file:', err);
    return;
  }

  // Update DATABASE_URL
  const updatedData = `

`;

  // Write updated .env file
  fs.writeFile('.env', updatedData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing .env file:', err);
      return;
    }
    console.log('.env file updated successfully');
  });
});
