source("research/cognitive/v1/R/00-check-environment.R")

testthat::test_that("check_environment passes when requirements are trivially satisfied", {
  result <- check_environment(packages = list(), r_version = "3.0.0")
  testthat::expect_identical(result$status, "ok")
  testthat::expect_length(result$problems, 0L)
})

testthat::test_that("check_environment blocks on an impossible R version requirement", {
  result <- check_environment(packages = list(), r_version = "99.0.0")
  testthat::expect_identical(result$status, "blocked")
  testthat::expect_true(any(grepl("99.0.0", result$problems)))
})

testthat::test_that("check_environment blocks when a required package is missing", {
  result <- check_environment(packages = list(`definitely-not-a-real-package-xyz` = "1.0.0"), r_version = "3.0.0")
  testthat::expect_identical(result$status, "blocked")
  testthat::expect_true(any(grepl("definitely-not-a-real-package-xyz", result$problems)))
})
