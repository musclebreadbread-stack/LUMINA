source("research/cognitive/v1/R/04-fairness-dif.R")
source("research/cognitive/v1/R/04b-external-validity.R")

testthat::test_that("build_release_items excludes unresolved DIF flags", {
  items <- data.frame(item_id = c("gf-01", "gv-02"), dif_status = c("clear", "investigate"))
  testthat::expect_identical(build_release_items(items)$item_id, "gf-01")
  testthat::expect_identical(evaluate_dif(items, c(120, 120))$status, "investigate")
})

testthat::test_that("external validity requires a separately collected sample", {
  testthat::expect_error(summarize_external_validity(1:2, 2:3), "insufficient")
})
