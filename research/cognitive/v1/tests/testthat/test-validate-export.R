source("research/cognitive/v1/R/01-validate-export.R")

testthat::test_that("validate_export rejects identifiers and mixed item-bank versions", {
  dictionary <- utils::read.csv("research/cognitive/v1/data-dictionary.csv", stringsAsFactors = FALSE)
  export <- utils::read.csv("research/cognitive/v1/tests/fixtures/synthetic-responses.csv", stringsAsFactors = FALSE)
  export$email <- "not-allowed@example.test"
  testthat::expect_error(validate_export(export, dictionary), "forbidden column")
  export$email <- NULL
  export$item_bank_version[2] <- "mixed"
  testthat::expect_error(validate_export(export, dictionary), "mixed item-bank version")
})

testthat::test_that("validate_export accepts the synthetic holdout fixture", {
  dictionary <- utils::read.csv("research/cognitive/v1/data-dictionary.csv", stringsAsFactors = FALSE)
  export <- utils::read.csv("research/cognitive/v1/tests/fixtures/synthetic-responses.csv", stringsAsFactors = FALSE)
  result <- validate_export(export, dictionary)
  testthat::expect_identical(result$status, "valid")
  testthat::expect_identical(result$rows, 3L)
})
