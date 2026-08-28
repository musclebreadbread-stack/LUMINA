validate_structure_and_precision <- function(structure_report, precision_report, retest_data) {
  list(
    structure = validate_structure(structure_report),
    precision = release_precision(precision_report),
    retest = summarize_retest(retest_data)
  )
}
