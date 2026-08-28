validate_calibration <- function(calibration, difficulty_range = c(-4, 4), guessing_range = c(0, 0.5)) {
  required <- c("item_id", "converged", "a", "b", "c")
  missing <- setdiff(required, names(calibration))
  if (length(missing) > 0) stop(sprintf("missing calibration column: %s", paste(missing, collapse = ", ")))
  if (any(!calibration$converged)) stop("calibration did not converge")
  if (any(!is.finite(calibration$a)) || any(calibration$a <= 0)) stop("discrimination must be positive")
  if (any(!is.finite(calibration$b)) || any(calibration$b < difficulty_range[[1]]) || any(calibration$b > difficulty_range[[2]])) stop("difficulty is outside preregistered range")
  if (any(!is.finite(calibration$c)) || any(calibration$c < guessing_range[[1]]) || any(calibration$c > guessing_range[[2]])) stop("guessing is outside preregistered range")
  calibration
}

compare_irt_models <- function(model_2pl, model_3pl, information_threshold = 0.01) {
  if (!all(c("aic", "converged") %in% names(model_2pl)) || !all(c("aic", "converged") %in% names(model_3pl))) stop("model comparison requires AIC and convergence")
  if (!isTRUE(model_2pl$converged) || !isTRUE(model_3pl$converged)) stop("non-converged model cannot be selected")
  delta <- model_2pl$aic - model_3pl$aic
  selected <- if (delta > information_threshold) "3pl" else "2pl"
  list(selected = selected, delta_aic_2pl_minus_3pl = delta)
}
