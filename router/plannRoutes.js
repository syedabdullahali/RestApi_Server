const express = require("express");
const router = express.Router();

const {
  dayWiseContest,
  resheduleAndStop,
  rescheduleContest,
  getAllScheduleDates,
} = require("../controller/plannController");

router.get("/contests/:id/day-wise", dayWiseContest);
router.put("/contests/:id/timeslots/:slotId", resheduleAndStop);
router.put("/contests/:id/reschedule", rescheduleContest);
router.get("/contests/:id/day-wise-list/:date", getAllScheduleDates);

module.exports = router;
