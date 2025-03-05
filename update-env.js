const fs = require('fs');

// Read .env file
fs.readFile('.env', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading .env file:', err);
    return;
  }

  // Update DATABASE_URL
  const updatedData = `
NEXTAUTH_SECRET="asdasd"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="698394828065-5tc20k251t492r6bbuikkj9br0at52t0.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# Local PostgreSQL Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Stripe Keys
STRIPE_WEBHOOK_SECRET="whsec_dzuQ0hFFCt15E0hBT3J4Jr7UxKhH14rE"
STRIPE_SECRET_KEY="sk_test_51QvFwrLKWZZc2yek85ZVrGkrtqGuFWB11SCZClzFHOCduXna01pfV6BNBZDAK6hJEnltCWqneCop8SiyaLvxyqIT00OqPXXaHE"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51QvFwrLKWZZc2yekkkddQH22AvOAWmdWAPB7kF6gOhq4ME8FgoYTq4KfWzvZBm9Jzj4xtZoc2x8ATbSGU8H2Pjy700BiI1wOl8"

# Discogs API
DISCOGS_API_TOKEN="dykeiJzLtAHQmERysugPfQrCYdNFdxMxghgaaNuQ"
DISCOGS_USERNAME="Room_202"
DISCOGS_CONSUMER_KEY="wqDcUVotiuAIUVZyflGx"
DISCOGS_CONSUMER_SECRET="RAjcDAzbekvBFInLkKYxjJqaAMfDCNLZ"

# Other services
RESEND_API_KEY="re_U2Su4RXX_E72x5WeyUvBmJq3qu6SkV53d"
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
