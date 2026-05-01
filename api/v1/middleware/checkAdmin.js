const admin = require('firebase-admin');
const User = require('../models/user.model');

if (!admin.apps.length) {
  try {
    const rawBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || "";

    const cleanBase64 = rawBase64.replace(/\s/g, '');

    if (!cleanBase64) {
      throw new Error("The environment variable GOOGLE_SERVICE_ACCOUNT BASE64 is empty!");
    }

    const decodedServiceAccount = Buffer.from(cleanBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decodedServiceAccount);

    console.log(">>> Initializing Firebase Admin for the Project:", serviceAccount.project_id);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log(">>> Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error(">>> Firebase Admin Init Error:", error.message);
  }
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No authentication token found!' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token, true);

    req.user = {
      ...decodedToken,
      id: decodedToken.uid
    };
    next();
  } catch (error) {
    console.error('>>> Token Verification Error:', error.code, error.message);

    let errorMessage = 'Invalid token or server configuration error!';

    if (error.code === 'auth/id-token-expired') {
      errorMessage = 'Your token has expired, please log in again!';
    } else if (error.code === 'auth/argument-error') {
      errorMessage = 'The Firebase configuration (Private Key) does not match the token submitted!';
    }

    return res.status(403).json({
      message: errorMessage,
      debug_info: error.message,
      code: error.code
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ message: 'The verification information is incomplete!' });
    }

    const user = await User.findOne({ uid: req.user.uid }).select('role');

    if (user && user.role === 'admin') {
      return next();
    }

    return res.status(403).json({
      message: 'Access denied. Your account does not have administrator privileges.',
    });
  } catch (error) {
    console.error('>>> Admin privilege check error:', error.message);
    return res.status(500).json({ message: 'System error while checking permissions.' });
  }
};

module.exports = { verifyToken, isAdmin };