release_precision <- function(precision_report, sem_threshold_iq = 5) {
  if (!is.data.frame(precision_report) || !"split" %in% names(precision_report)) stop("holdout precision report is required")
  if (!any(precision_report$split == "holdout")) stop("holdout evidence is required")
  if (!"sem_iq" %in% names(precision_report)) stop("SEM is required")
  holdout <- precision_report[precision_report$split == "holdout", , drop = FALSE]
  if (any(!is.finite(holdout$sem_iq)) || any(holdout$sem_iq > sem_threshold_iq)) stop("individual score precision is insufficient")
  list(status = "pass", holdout_rows = nrow(holdout), maximum_sem_iq = max(holdout$sem_iq))
}

validate_structure <- function(structure_report) {
  required <- c("model", "holdout_reproducible", "local_dependence_ok")
  if (!all(required %in% names(structure_report))) stop("structure report is incomplete")
  if (!all(structure_report$holdout_reproducible) || !all(structure_report$local_dependence_ok)) stop("structure evidence is insufficient")
  list(status = "pass", models = structure_report$model)
}

summarize_retest <- function(retest_data) {
  required <- c("first_theta", "second_theta", "interval_days")
  if (!all(required %in% names(retest_data))) stop("retest data is incomplete")
  if (any(retest_data$interval_days <= 0)) stop("retest interval must be positive")
  list(
    status = "reported",
    n = nrow(retest_data),
    correlation = stats::cor(retest_data$first_theta, retest_data$second_theta, use = "complete.obs"),
    mean_practice_effect = mean(retest_data$second_theta - retest_data$first_theta, na.rm = TRUE)
  )
}
