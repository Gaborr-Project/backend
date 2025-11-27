const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const supabase = require("../../config/supabase");
const auth = require("../../middleware/auth");

const upload = multer({ storage: multer.memoryStorage() });

//Add KYC
router.post(
  "/add-kyc-lender",
  upload.fields([
    { name: "ktp", maxCount: 1 },
    { name: "selfieKtp", maxCount: 1 },
  ]),
  auth,
  async (req, res) => {
    const { id, fullname, nik, noTelp, address } = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID (id) is required" });
    }

    if (!req.files?.ktp || !req.files?.selfieKtp)
      return res.status(400).json({
        message: "Both KTP and Selfie with KTP PDF are required",
      });

    try {
      const uploadedUrls = {};

      for (const key of ["ktp", "selfieKtp"]) {
        const file = req.files[key][0];
        const folder = `kyc-lender/${id}`;
        const fileName = `${folder}/${key}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file.buffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("documents")
          .getPublicUrl(fileName);
        uploadedUrls[key] = data.publicUrl;
      }

      const documentObj = {
        full_name: fullname,
        nik,
        noTelp,
        address,
        ktp_url: uploadedUrls.ktp,
        selfieKtp_url: uploadedUrls.selfieKtp,
        updated_at: new Date(),
      };

      const { data, error } = await supabase
        .from("users")
        .update({ document: documentObj })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.json({ message: "KYC uploaded successfully" });
    } catch (err) {
      res.status(500).json({ message: "Upload failed", error: err.message });
    }
  }
);

//Get Loan Application
router.get("loan-application", auth, async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("student_histories")
      .select(
        `
        *,
        loan_details ( * )
      `
      )
      .eq("user_id", id);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch loan applications",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Loan applications fetched successfully",
      total: data.length,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

//update status
router.put("loan-application", auth, async (req, res) => {
  const { id, started, due, status } = req.body;
  try {
    const { data, error } = await supabase
      .from("student_histories")
      .update({ started, due, status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ message: "Loan Application updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "updated failed", error: err.message });
  }
});

module.exports = router;
