const jwt = require("jsonwebtoken");
require("dotenv").config()

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  // console.log("token: ", token);

  if (!token) return res.status(401).json({ message: "Access denied" });

  // console.log("process.env.SECRET_KEY: ", process.env.SECRET_KEY);


  jwt.verify(token, process.env.SECRET_KEY,
    (err, user) => {
      // console.log("error: ", err);

      // console.log("user:", user)
      if (err) return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    }
  );
  //  console.log(user._id,"Verify User",token)



  //  _id: user._id, email
};
const AdminAuthentication = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.status(401).json({ message: "Access denied" });
  jwt.verify(token, process.env.SECRET_KEY,
    (err, user) => {
      // console.log(user)
      if (user.role === "admin") {
        req.user = user;
        next();
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

    }
  );

};


module.exports = { authenticateToken, AdminAuthentication }
