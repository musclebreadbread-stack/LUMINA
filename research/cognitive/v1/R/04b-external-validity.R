summarize_external_validity <- function(lumina_theta, external_score) {
  if (length(lumina_theta) != length(external_score) || length(lumina_theta) < 30) stop("external validity sample is insufficient")
  list(
    status = "reported",
    n = length(lumina_theta),
    correlation = stats::cor(lumina_theta, external_score, use = "complete.obs"),
    limitation = "The external assessment is a separate licensed criterion; its proprietary score is not transformed or stored in LUMINA."
  )
}
