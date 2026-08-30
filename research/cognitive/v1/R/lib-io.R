build_response_matrix <- function(export) {
  required <- c("run_id", "item_version_id", "scored_correct")
  missing <- setdiff(required, names(export))
  if (length(missing) > 0) stop(sprintf("export is missing required column: %s", paste(missing, collapse = ", ")))
  if (!all(export$scored_correct %in% c(0, 1))) stop("scored_correct must be 0 or 1")
  run_ids <- sort(unique(export$run_id))
  item_ids <- sort(unique(export$item_version_id))
  row_index <- match(export$run_id, run_ids)
  col_index <- match(export$item_version_id, item_ids)
  cell_index <- cbind(row_index, col_index)
  if (anyDuplicated(cell_index) > 0) stop("export has duplicate run/item assignments")
  matrix_out <- matrix(NA_integer_, nrow = length(run_ids), ncol = length(item_ids), dimnames = list(run_ids, item_ids))
  matrix_out[cell_index] <- as.integer(export$scored_correct)
  matrix_out
}

hash_artifact <- function(x) {
  if (!requireNamespace("digest", quietly = TRUE)) stop("digest is required for evidence hashing")
  digest::digest(x, algo = "sha256")
}

read_cli_args <- function(args = commandArgs(trailingOnly = TRUE)) {
  parsed <- list()
  index <- 1
  while (index <= length(args)) {
    key <- args[[index]]
    if (!startsWith(key, "--")) stop(sprintf("unexpected argument: %s", key))
    name <- sub("^--", "", key)
    has_value <- index < length(args) && !startsWith(args[[index + 1]], "--")
    parsed[[name]] <- if (has_value) args[[index + 1]] else NA_character_
    index <- index + if (has_value) 2 else 1
  }
  parsed
}

cli_value <- function(args, name, default = NULL) {
  value <- args[[name]]
  if (is.null(value) || is.na(value)) default else value
}

require_cli_value <- function(args, name) {
  value <- cli_value(args, name)
  if (is.null(value)) stop(sprintf("--%s is required", name))
  value
}
