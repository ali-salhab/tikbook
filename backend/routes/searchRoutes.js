const express = require("express");
const { globalSearch } = require("../controllers/searchController");

const router = express.Router();

router.get("/", globalSearch);

module.exports = router;
