const express = require("express");
const router = express.Router();

const controller = require("../controllers/authController");
console.log("authController export:", controller);

const { register, login } = controller;

router.post("/register", register);
router.post("/login", login);

module.exports = router;
