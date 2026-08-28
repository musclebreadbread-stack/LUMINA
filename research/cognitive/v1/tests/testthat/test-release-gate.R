source("research/cognitive/v1/R/06-release-gate.R")

testthat::test_that("release gate rejects unresolved DIF", {
  artifacts <- list(
    export = list(status = "valid"), irt = list(status = "pass"), structure = list(status = "pass"),
    precision = list(status = "pass"), retest = list(status = "reported"), dif = list(status = "investigate"),
    external_validity = list(status = "reported"), independent_review = TRUE
  )
  testthat::expect_identical(evaluate_release_gate(artifacts)$status, "blocked")
})

testthat::test_that("the automated gate never emits approved", {
  artifacts <- list(
    export = list(status = "valid"), irt = list(status = "pass"), structure = list(status = "pass"),
    precision = list(status = "pass"), retest = list(status = "reported"), dif = list(status = "pass"),
    external_validity = list(status = "reported"), independent_review = TRUE
  )
  testthat::expect_identical(evaluate_release_gate(artifacts)$status, "candidate")
})
