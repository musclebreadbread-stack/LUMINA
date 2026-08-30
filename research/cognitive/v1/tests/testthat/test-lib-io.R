source("research/cognitive/v1/R/lib-io.R")

testthat::test_that("build_response_matrix pivots long export rows into a run x item matrix", {
  export <- data.frame(
    run_id = c("r1", "r1", "r2"),
    item_version_id = c("gf-001", "gc-001", "gf-001"),
    scored_correct = c(1, 0, 1)
  )
  result <- build_response_matrix(export)
  testthat::expect_identical(dim(result), c(2L, 2L))
  testthat::expect_identical(rownames(result), c("r1", "r2"))
  testthat::expect_identical(colnames(result), c("gc-001", "gf-001"))
  testthat::expect_identical(result["r1", "gf-001"], 1L)
  testthat::expect_true(is.na(result["r2", "gc-001"]))
})

testthat::test_that("build_response_matrix rejects duplicate run/item assignments", {
  export <- data.frame(run_id = c("r1", "r1"), item_version_id = c("gf-001", "gf-001"), scored_correct = c(1, 0))
  testthat::expect_error(build_response_matrix(export), "duplicate")
})

testthat::test_that("build_response_matrix rejects a score outside 0/1", {
  export <- data.frame(run_id = "r1", item_version_id = "gf-001", scored_correct = 2)
  testthat::expect_error(build_response_matrix(export), "0 or 1")
})

testthat::test_that("hash_artifact returns a stable 64-character sha256 hex digest", {
  digest_value <- hash_artifact(list(status = "pass"))
  testthat::expect_identical(nchar(digest_value), 64L)
  testthat::expect_identical(hash_artifact(list(status = "pass")), digest_value)
  testthat::expect_false(identical(hash_artifact(list(status = "blocked")), digest_value))
})

testthat::test_that("read_cli_args parses alternating flag/value pairs", {
  parsed <- read_cli_args(c("--export", "a.csv", "--sample-version", "v1"))
  testthat::expect_identical(parsed$export, "a.csv")
  testthat::expect_identical(parsed[["sample-version"]], "v1")
})

testthat::test_that("cli_value falls back to the default when a flag is absent", {
  parsed <- read_cli_args(c("--export", "a.csv"))
  testthat::expect_identical(cli_value(parsed, "out", "default.json"), "default.json")
  testthat::expect_identical(cli_value(parsed, "export", "default.json"), "a.csv")
})

testthat::test_that("require_cli_value errors when a required flag is missing", {
  parsed <- read_cli_args(c("--export", "a.csv"))
  testthat::expect_error(require_cli_value(parsed, "sample-version"), "sample-version")
})
