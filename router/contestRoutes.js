const express = require("express");
const {
  createContest,
  getContests,
  getContestById,
  updateContest,
  deleteContest,
  getContestsPagination,
  getTypeContests,
} = require("../controller/contestController");

const router = express.Router();

router.post("/create-contest", createContest);
router.get("/get-all-contests", getContests);
router.get("/get-contests", getContestsPagination);
router.get("/get-contest-by-id/:id", getContestById);
router.put("/update-contests/:id", updateContest);
router.delete("/:id", deleteContest);
// router.get("/type/contest",getTypeContests);

module.exports = router;
