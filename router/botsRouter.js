const express = require("express");
const router = express.Router();
const {
  deleteBot,
  GetBotById,
  createBot,
  getAllBots,
  getBotsByPagination,
  updateBot,
} = require("../controller/botController");

router.post("/", createBot);

router.get("/", getAllBots);
router.get("/pag", getBotsByPagination);

router.put("/:id", updateBot);

router.delete("/:id", deleteBot);

router.get("/:id", GetBotById);

module.exports = router;
