source("research/cognitive/v1/R/lib-models.R")
source("research/cognitive/v1/R/02-fit-irt.R")

testthat::test_that("validate_calibration rejects non-converged and impossible parameters", {
  bad <- data.frame(item_id = "gf-01", converged = FALSE, a = -0.2, b = 0, c = 0.25)
  testthat::expect_error(validate_calibration(bad), "converged|discrimination")
})

testthat::test_that("a valid calibration creates a candidate manifest", {
  good <- data.frame(item_id = "gf-01", converged = TRUE, a = 1.1, b = 0, c = 0.25)
  manifest <- build_calibration_manifest(good, "3pl", "cognitive-pilot-v1", "cat-v1")
  testthat::expect_identical(manifest$status, "candidate")
  testthat::expect_identical(manifest$item_count, 1L)
})
