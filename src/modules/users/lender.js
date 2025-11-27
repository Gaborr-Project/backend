const express = require("express");
const router = express.Router();
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

module.exports = router;
