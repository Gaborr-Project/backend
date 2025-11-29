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
  "/add-kyc-student",
  upload.fields([
    { name: "ktm", maxCount: 1 },
    { name: "studentActiveInfo", maxCount: 1 },
  ]),
  auth,
  async (req, res) => {
    const {
      id,
      fullname,
      nim,
      university,
      faculty,
      major,
      semester,
      expectedGraduate,
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID (id) is required" });
    }

    if (!req.files?.ktm || !req.files?.studentActiveInfo)
      return res.status(400).json({
        message: "Both KTM and Surat Keterangan Aktif Kuliah PDF are required",
      });

    try {
      const uploadedUrls = {};

      for (const key of ["ktm", "studentActiveInfo"]) {
        const file = req.files[key][0];
        const folder = `kyc-students/${id}`;
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
        nim,
        university,
        faculty,
        major,
        semester,
        expected_graduate: expectedGraduate,
        ktm_url: uploadedUrls.ktm,
        studentActiveInfo_url: uploadedUrls.studentActiveInfo,
        updated_at: new Date(),
      };

      const { data, error } = await supabase
        .from("users")
        .update({ documents: documentObj })
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

//Add Loan Application
router.post("/loan-application", auth, async (req, res) => {
  const {
    id,
    totalLoan,
    tenor,
    purpose,
    description,
    spp,
    tools,
    house,
    other,
    margin,
    installment,
  } = req.body;

  try {
    const { data: history, error: historyErr } = await supabase
      .from("student_histories")
      .insert({
        user_id: id,
        purpose,
        description,
        tenor,
        margin,
        installment,
        total_loan: totalLoan,
        status: "PENDING",
      })
      .select()
      .single();

    if (historyErr) {
      return res.status(400).json({
        success: false,
        message: "Loan application failed at step 1 (student history)",
        error: historyErr.message,
      });
    }

    if (!history?.id) {
      return res.status(500).json({
        success: false,
        message: "History inserted but no ID returned",
      });
    }

    const { data: loan, error: loanErr } = await supabase
      .from("loan_details")
      .insert({
        student_history_id: history.id,
        spp_cost: spp,
        maintenance_details: {
          house,
          tools,
          other,
        },
      })
      .select()
      .single();

    if (loanErr) {
      await supabase.from("student_histories").delete().eq("id", history.id);

      return res.status(400).json({
        success: false,
        message:
          "Loan application failed at step 2 (loan details) → rolled back",
        error: loanErr.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Loan application submitted successfully",
      student_history: history,
      loan_details: loan,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

//Get Loan Application
router.get("/loan-application", auth, async (req, res) => {
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

//Update Status Loan Application
router.put("/loan-application", auth, async (req, res) => {
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
