// firebaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json'); // Update the path to your JSON key file

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
