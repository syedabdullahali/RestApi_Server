const express = require("express");
const router = express.Router();

const {
  creatText,
  deleteText,
  getText,
  updateText,
} = require("../controller/tdsgstTextController");

router.post("/", creatText);
router.delete("/:id", deleteText);
router.get("/", getText);
router.put("/:id", updateText);



module.exports = router;
