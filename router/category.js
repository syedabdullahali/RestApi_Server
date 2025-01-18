const express = require("express");
const router = express.Router();

const {
  CreateCategory,
  GetAll_Category,
  UpdateCategory,
  DeleteCategory,
  GetSingleCategory,
  GetSubCategoryByCategory,
  GetPaginationSubCategoryByCategory,
  GetCategoryPagination,
} = require("../controller/categoryController");

router.post("/create", CreateCategory);
router.get("/all", GetAll_Category);

router.put("/update/:id", UpdateCategory);
router.delete("/delete/:id", DeleteCategory);
router.get("/:id", GetSingleCategory);
router.get("/allsub/:id", GetSubCategoryByCategory);

//pagination
router.get("/", GetCategoryPagination);
router.get("/sub/:id", GetPaginationSubCategoryByCategory);

module.exports = router;
