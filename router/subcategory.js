const express = require("express");
const router = express.Router();

const {
  CreateSubCategory,
  GetAll_SubCategory,

  UpdateSubCategory,
  DeleteSubCategory,
  GetSingleSubCategory,
  GetSubCategoryPagination,
} = require("../controller/subCategoryController");

router.post("/create", CreateSubCategory);
router.get("/all", GetAll_SubCategory);

router.put("/update/:id", UpdateSubCategory);
router.delete("/delete/:id", DeleteSubCategory);
router.get("/:id", GetSingleSubCategory);

//pagination
router.get("/", GetSubCategoryPagination);

module.exports = router;
