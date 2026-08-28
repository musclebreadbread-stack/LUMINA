forbidden_export_columns <- c("name", "email", "ip_address", "user_agent", "url", "service_role_key")
required_export_columns <- c(
  "run_id", "item_version_id", "ordinal", "submitted_option_id", "scored_correct",
  "submitted_at", "consent_version", "device_eligibility", "item_bank_version",
  "algorithm_version", "split"
)

validate_export <- function(export, dictionary, approved_consent_versions = "cognitive-pilot-consent-v1") {
  if (!is.data.frame(export) || !is.data.frame(dictionary)) stop("export and dictionary must be data frames")
  missing <- setdiff(required_export_columns, names(export))
  if (length(missing) > 0) stop(sprintf("missing required column: %s", paste(missing, collapse = ", ")))
  forbidden <- intersect(names(export), forbidden_export_columns)
  if (length(forbidden) > 0) stop(sprintf("forbidden column: %s", paste(forbidden, collapse = ", ")))
  if (!all(names(export) %in% dictionary$column_name)) stop("column is not in data dictionary")
  if (length(unique(export$item_bank_version)) != 1) stop("mixed item-bank version")
  if (length(unique(export$algorithm_version)) != 1) stop("mixed algorithm version")
  if (!all(export$consent_version %in% approved_consent_versions)) stop("unapproved consent version")
  if (!all(export$device_eligibility == "eligible")) stop("ineligible device row")
  assignment_key <- paste(export$run_id, export$item_version_id, export$ordinal, sep = "|")
  if (anyDuplicated(assignment_key) > 0) stop("duplicate answered assignment")
  if (any(is.na(export$submitted_at)) || any(is.na(export$split))) stop("event ordering or split is missing")
  if (!any(export$split == "holdout")) stop("holdout flag is required")
  list(
    status = "valid",
    rows = nrow(export),
    item_bank_version = unique(export$item_bank_version),
    algorithm_version = unique(export$algorithm_version),
    splits = sort(unique(export$split))
  )
}
