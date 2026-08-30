source("research/cognitive/v1/R/00-run-release-pipeline.R")

passing_artifacts <- list(
  export = list(status = "valid"),
  irt = list(status = "pass"),
  structure = list(status = "pass"),
  precision = list(status = "pass"),
  retest = list(status = "reported"),
  dif = list(status = "pass"),
  external_validity = list(status = "reported"),
  independent_review = TRUE
)

testthat::test_that("assemble_release_manifest never emits approved and hashes every gate artifact", {
  manifest <- assemble_release_manifest(passing_artifacts, "cognitive-pilot-v1", "cat-v1")
  testthat::expect_identical(manifest$status, "candidate")
  testthat::expect_identical(manifest$target_population, "ko-adults-18-64")
  testthat::expect_length(manifest$evidence_hashes, 8L)
  testthat::expect_true(all(nzchar(manifest$evidence_hashes)))
  testthat::expect_identical(length(unique(manifest$evidence_hashes)), 8L)
  testthat::expect_length(manifest$reasons, 0L)
})

testthat::test_that("assemble_release_manifest blocks and reports the failing artifact name", {
  blocked_artifacts <- passing_artifacts
  blocked_artifacts$dif <- list(status = "investigate")
  manifest <- assemble_release_manifest(blocked_artifacts, "cognitive-pilot-v1", "cat-v1")
  testthat::expect_identical(manifest$status, "blocked")
  testthat::expect_true("dif" %in% manifest$reasons)
})

testthat::test_that("assemble_release_manifest appends extra evidence hashes beyond the eight gate artifacts", {
  manifest <- assemble_release_manifest(
    passing_artifacts, "cognitive-pilot-v1", "cat-v1",
    extra_evidence = list(norms = list(status = "candidate"))
  )
  testthat::expect_identical(manifest$status, "candidate")
  testthat::expect_length(manifest$evidence_hashes, 9L)
})

testthat::test_that("assemble_release_manifest errors when a required artifact is missing", {
  incomplete_artifacts <- passing_artifacts
  incomplete_artifacts$dif <- NULL
  testthat::expect_error(assemble_release_manifest(incomplete_artifacts, "cognitive-pilot-v1", "cat-v1"), "dif")
})

testthat::test_that("read_review_record confirms only a complete, non-empty review record", {
  result <- read_review_record("research/cognitive/v1/tests/fixtures/review-record-valid.json")
  testthat::expect_true(result$confirmed)
})

testthat::test_that("read_review_record rejects an incomplete review record", {
  result <- read_review_record("research/cognitive/v1/tests/fixtures/review-record-incomplete.json")
  testthat::expect_false(result$confirmed)
})

testthat::test_that("read_review_record treats a missing file as unconfirmed rather than erroring", {
  result <- read_review_record("research/cognitive/v1/tests/fixtures/does-not-exist.json")
  testthat::expect_false(result$confirmed)
})
