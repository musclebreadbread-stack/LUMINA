evaluate_release_gate <- function(artifacts) {
  required <- c("export", "irt", "structure", "precision", "retest", "dif", "external_validity", "independent_review")
  missing <- setdiff(required, names(artifacts))
  if (length(missing) > 0) stop(sprintf("release evidence is missing: %s", paste(missing, collapse = ", ")))
  checks <- c(
    export = identical(artifacts$export$status, "valid"),
    irt = identical(artifacts$irt$status, "pass"),
    structure = identical(artifacts$structure$status, "pass"),
    precision = identical(artifacts$precision$status, "pass"),
    retest = identical(artifacts$retest$status, "reported"),
    dif = identical(artifacts$dif$status, "pass"),
    external_validity = identical(artifacts$external_validity$status, "reported"),
    independent_review = isTRUE(artifacts$independent_review)
  )
  if (!all(checks)) return(list(status = "blocked", reasons = names(checks)[!checks]))
  # An automated script can only create a candidate. Human/statistician approval is out-of-band.
  list(status = "candidate", reasons = character(0), checks = checks)
}
