const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../../config/supabase");
const auth = require("../../middleware/auth");

//Login W2
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return res.status(400).json({ message: "Email not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    res.status(200).json({
      message: "Login success",
      token,
      user: {
        id: user.id,
        fullname: user.full_name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

//Register W2
router.post("/register-w2", async (req, res) => {
  const { fullname, email, noTelp, password, status } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from("users")
      .insert({
        full_name: fullname,
        email: email,
        no_telp: noTelp,
        password: hashedPassword,
        status: status ?? "STUDENT",
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const user = data;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    return res.status(201).json({
      message: "Register success",
      token,
      user: {
        id: user.id,
        fullname: user.full_name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
});

//Connect Wallet
router.post("/connect-wallet", async (req, res) => {
  const { walletAddress } = req.body;

  try {
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, full_name, email, status")
      .eq("wallet_address", walletAddress)
      .single();

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({ wallet_address: walletAddress })
        .select("id, wallet_address, full_name, email, status")
        .single();

      if (insertError) {
        return res.status(400).json({ message: insertError.message });
      }

      user = newUser;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        status: user.status,
        wallet_address: walletAddress,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    res.status(200).json({
      message: "Login success",
      token,
      user: {
        id: user.id,
        fullname: user.full_name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

//Register base wallet
router.post("/register", auth, async (req, res) => {
  const { fullname, email, noTelp, walletAddress, status } = req.body;

  try {
    const { data: userCheck, error: userCheckError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (userCheckError || !userCheck) {
      return res.status(400).json({ message: "Wallet address not found" });
    }
    const { data, error } = await supabase
      .from("users")
      .update({
        full_name: fullname,
        email: email,
        no_telp: noTelp,
        status: status ?? "STUDENT",
      })
      .select()
      .eq("id", userCheck.id)
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const user = data;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    return res.status(201).json({
      message: "Register success",
      token,
      user: {
        id: user.id,
        fullname: user.full_name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /:walletAddr
router.get("/", auth, async (req, res) => {
  const { walletAddr } = req.body;
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, wallet_address, full_name, email, status, no_telp")
    .eq("wallet_address", walletAddr)
    .single();

  if (userError || !user) {
    return res.status(400).json({ message: "User not found" });
  }
  delete user.password;
  delete user.created_at;
  res.status(200).json({
    user,
  });
});

module.exports = router;
