testthat::test_that("every exported column has a sensitivity and retention class", {
  dictionary <- utils::read.csv("research/cognitive/v1/data-dictionary.csv", stringsAsFactors = FALSE)
  testthat::expect_true(all(c("column_name", "allowed_values", "sensitivity", "retention_class") %in% names(dictionary)))
  testthat::expect_false(any(is.na(dictionary$sensitivity)))
  testthat::expect_false(any(is.na(dictionary$retention_class)))
})

testthat::test_that("the synthetic fixture contains no direct identifiers", {
  dictionary <- utils::read.csv("research/cognitive/v1/data-dictionary.csv", stringsAsFactors = FALSE)
  fixture <- utils::read.csv("research/cognitive/v1/tests/fixtures/synthetic-responses.csv", stringsAsFactors = FALSE)
  testthat::expect_true(all(names(fixture) %in% dictionary$column_name))
  testthat::expect_false(any(c("email", "name", "ip_address", "user_agent") %in% names(fixture)))
})
