const { JWT_SECRET } = require("./config");
const jwt = require("jsonwebtoken");

// Example: Authorization: Bearer abc123

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(403).json({});
  }
  const token = authHeader.split(" ")[1];
  // Check if the token is valid
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({});
  }
};

module.exports = authMiddleware;
