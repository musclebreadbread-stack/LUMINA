build_release_items <- function(item_report) {
  if (!all(c("item_id", "dif_status") %in% names(item_report))) stop("DIF report is incomplete")
  item_report[item_report$dif_status == "clear", , drop = FALSE]
}

evaluate_dif <- function(item_report, group_sample_sizes, minimum_group_n = 100) {
  if (any(group_sample_sizes < minimum_group_n)) stop("DIF group sample size is below the preregistered threshold")
  released <- build_release_items(item_report)
  list(status = if (nrow(released) == nrow(item_report)) "pass" else "investigate", release_items = released$item_id)
}
