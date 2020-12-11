const Users = require("../models/userModel");
const jwtToken = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userCtrl = {
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const user = await Users.findOne({ email });
      if (user) return res.status(400).json({ msg: "email already exists..." });

      if (password.length < 6)
        return res
          .status(400)
          .json({ msg: "Password Should not be less then 6 characters.." });

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = new Users({
        name,
        email,
        password: passwordHash,
      });

      await newUser.save();

      const accesstoken = AuthAccessToken({ id: newUser._id });
      const refreshtoken = AuthRefereshToken({ id: newUser._id });

      res.cookie("refreshtoken", refreshtoken, {
        httpOnly: true,
        path: "/user/refresh_token",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ accesstoken });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await Users.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: "user not found.." });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ msg: "Please check your email or password.." });
      }

      const accesstoken = AuthAccessToken({ id: user._id });
      const refreshtoken = AuthRefereshToken({ id: user._id });

      res.cookie("refreshtoken", refreshtoken, {
        httpOnly: true,
        path: "/user/refresh_token",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ accesstoken });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  logout: async (req, res) => {
    try {
      res.clearCookie("refreshtoken", { path: "/user/refresh_token" });
      return res.json({ msg: "You are logged out..." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  refreshToken: (req, res) => {
    try {
      const rf_token = req.cookies.refreshtoken;
      if (!rf_token) {
        return res.status(400).json({ msg: "please login or register.." });
      }
      jwtToken.verify(
        rf_token,
        process.env.REFRESH_TOKEN_SECRET,
        (err, user) => {
          if (err) {
            return res.status(400).json({ msg: "please login or register.." });
          }
          const accesstoken = AuthAccessToken({ id: user.id });
          res.json({ accesstoken });
        }
      );
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }

    res.json({ rf_token });
  },
  getUser: async (req, res) => {
    try {
      const user = await Users.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(400).json({ msg: "User not found.." });
      }
      res.json(user);
      res.json(req.user);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

const AuthAccessToken = (user) => {
  return jwtToken.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

const AuthRefereshToken = (user) => {
  return jwtToken.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "8d",
  });
};
module.exports = userCtrl;
