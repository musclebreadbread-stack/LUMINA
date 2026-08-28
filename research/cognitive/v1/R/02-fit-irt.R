fit_irt_candidates <- function(response_matrix, model = c("2pl", "3pl")) {
  model <- match.arg(model)
  if (!requireNamespace("mirt", quietly = TRUE)) stop("mirt is required for calibration")
  if (!is.matrix(response_matrix)) stop("response matrix is required")
  mirt::mirt(response_matrix, 1, itemtype = model, verbose = FALSE)
}

build_calibration_manifest <- function(calibration, selected_model, item_bank_version, algorithm_version) {
  validate_calibration(calibration)
  list(
    status = "candidate",
    selected_model = selected_model,
    item_bank_version = item_bank_version,
    algorithm_version = algorithm_version,
    item_count = nrow(calibration),
    item_ids = calibration$item_id
  )
}
