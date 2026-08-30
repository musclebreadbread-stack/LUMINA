required_packages <- list(
  mirt = "1.41",
  testthat = "3.1.0",
  digest = "0.6.30",
  jsonlite = "1.8.0"
)

check_environment <- function(packages = required_packages, r_version = "4.3.0") {
  problems <- character(0)
  if (getRversion() < r_version) {
    problems <- c(problems, sprintf("R %s or later is required (found %s)", r_version, getRversion()))
  }
  for (name in names(packages)) {
    minimum <- packages[[name]]
    if (!requireNamespace(name, quietly = TRUE)) {
      problems <- c(problems, sprintf("package '%s' >= %s is required but not installed", name, minimum))
      next
    }
    installed <- as.character(utils::packageVersion(name))
    if (utils::compareVersion(installed, minimum) < 0) {
      problems <- c(problems, sprintf("package '%s' >= %s is required but %s is installed", name, minimum, installed))
    }
  }
  list(status = if (length(problems) == 0) "ok" else "blocked", problems = problems)
}

if (length(grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)) > 0) {
  result <- check_environment()
  if (identical(result$status, "ok")) {
    cat("R environment check: ok\n")
  } else {
    cat("R environment check: blocked\n")
    for (problem in result$problems) cat(sprintf("- %s\n", problem))
    quit(status = 1, save = "no")
  }
}
