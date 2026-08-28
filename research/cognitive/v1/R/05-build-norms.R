build_norm_candidate <- function(theta, age, sem_theta, item_bank_version, algorithm_version, sample_version) {
  if (length(theta) != length(age) || length(theta) != length(sem_theta) || length(theta) < 100) stop("norming sample is insufficient")
  if (any(age < 18 | age > 64) || any(!is.finite(theta)) || any(!is.finite(sem_theta) | sem_theta < 0)) stop("norming input is invalid")
  theta_sd <- stats::sd(theta)
  if (!is.finite(theta_sd) || theta_sd <= 0) stop("theta variation is insufficient for norming")
  list(
    status = "candidate",
    target_population = "ko-adults-18-64",
    item_bank_version = item_bank_version,
    algorithm_version = algorithm_version,
    sample_version = sample_version,
    iq_mean = 100,
    iq_sd = 15,
    iq_points_per_theta = 15 / theta_sd,
    age_range = c(minimum = 18, maximum = 64),
    sem_iq_median = stats::median(sem_theta) * 15 / theta_sd
  )
}
