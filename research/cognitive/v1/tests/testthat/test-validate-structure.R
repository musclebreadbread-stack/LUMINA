source("research/cognitive/v1/R/lib-quality.R")
source("research/cognitive/v1/R/03-validate-structure.R")

testthat::test_that("release_precision rejects a score without holdout evidence", {
  report <- data.frame(split = "development", sem_iq = 4.8)
  testthat::expect_error(release_precision(report), "holdout")
})

testthat::test_that("structure and precision pass with holdout and retest evidence", {
  structure <- data.frame(model = "hierarchical", holdout_reproducible = TRUE, local_dependence_ok = TRUE)
  precision <- data.frame(split = "holdout", sem_iq = 4.5)
  retest <- data.frame(first_theta = c(-.2, .1), second_theta = c(-.1, .2), interval_days = c(14, 14))
  result <- validate_structure_and_precision(structure, precision, retest)
  testthat::expect_identical(result$precision$status, "pass")
  testthat::expect_identical(result$retest$status, "reported")
})
