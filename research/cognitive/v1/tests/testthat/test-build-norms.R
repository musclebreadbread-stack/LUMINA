source("research/cognitive/v1/R/05-build-norms.R")

testthat::test_that("norm building remains a candidate until the release gate", {
  result <- build_norm_candidate(seq(-2, 2, length.out = 100), rep(32, 100), rep(.3, 100), "pilot-v1", "cat-v1", "synthetic-v1")
  testthat::expect_identical(result$status, "candidate")
  testthat::expect_identical(result$iq_mean, 100)
  testthat::expect_identical(result$iq_sd, 15)
})

testthat::test_that("norming rejects an out-of-range age", {
  testthat::expect_error(build_norm_candidate(seq(-2, 2, length.out = 100), c(rep(32, 99), 17), rep(.3, 100), "pilot-v1", "cat-v1", "synthetic-v1"), "invalid")
})
