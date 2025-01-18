const express = require("express");
const {
  createDocument,
  updateDocument,
  getDocuments,
  getSingaleDocuments,
} = require("../controller/doumentController");

const router = express.Router();

router.post("/", createDocument);
router.put("/:id", updateDocument);
router.get("/", getDocuments);
router.get("/:docName", getSingaleDocuments);


module.exports = router;
