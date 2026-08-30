.pipeline_script_dir <- local({
  file_arg <- grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)
  if (length(file_arg) == 1) dirname(sub("^--file=", "", file_arg)) else "research/cognitive/v1/R"
})

source(file.path(.pipeline_script_dir, "lib-models.R"))
source(file.path(.pipeline_script_dir, "lib-quality.R"))
source(file.path(.pipeline_script_dir, "lib-io.R"))
source(file.path(.pipeline_script_dir, "01-validate-export.R"))
source(file.path(.pipeline_script_dir, "02-fit-irt.R"))
source(file.path(.pipeline_script_dir, "03-validate-structure.R"))
source(file.path(.pipeline_script_dir, "04-fairness-dif.R"))
source(file.path(.pipeline_script_dir, "04b-external-validity.R"))
source(file.path(.pipeline_script_dir, "05-build-norms.R"))
source(file.path(.pipeline_script_dir, "06-release-gate.R"))

release_gate_artifact_names <- c(
  "export", "irt", "structure", "precision", "retest", "dif", "external_validity", "independent_review"
)

assemble_release_manifest <- function(artifacts, item_bank_version, algorithm_version, extra_evidence = list()) {
  missing <- setdiff(release_gate_artifact_names, names(artifacts))
  if (length(missing) > 0) stop(sprintf("assemble_release_manifest is missing artifacts: %s", paste(missing, collapse = ", ")))
  gate <- evaluate_release_gate(artifacts[release_gate_artifact_names])
  evidence <- c(artifacts[release_gate_artifact_names], extra_evidence)
  evidence_hashes <- unname(vapply(names(evidence), function(name) hash_artifact(evidence[[name]]), character(1)))
  list(
    status = gate$status,
    target_population = "ko-adults-18-64",
    item_bank_version = item_bank_version,
    algorithm_version = algorithm_version,
    evidence_hashes = evidence_hashes,
    reasons = gate$reasons
  )
}

read_review_record <- function(path) {
  if (is.null(path) || !file.exists(path)) return(list(confirmed = FALSE, record = NULL))
  if (!requireNamespace("jsonlite", quietly = TRUE)) stop("jsonlite is required to read the review record")
  record <- jsonlite::fromJSON(path)
  required <- c("reviewer", "date", "statement")
  has_fields <- all(required %in% names(record))
  confirmed <- has_fields && all(vapply(required, function(field) nzchar(trimws(record[[field]])), logical(1)))
  list(confirmed = isTRUE(confirmed), record = record)
}

main <- function() {
  args <- read_cli_args()
  export_path <- require_cli_value(args, "export")
  dictionary_path <- cli_value(args, "dictionary", "research/cognitive/v1/data-dictionary.csv")

  export <- utils::read.csv(export_path, stringsAsFactors = FALSE)
  dictionary <- utils::read.csv(dictionary_path, stringsAsFactors = FALSE)
  export_result <- validate_export(export, dictionary)
  item_bank_version <- export_result$item_bank_version
  algorithm_version <- export_result$algorithm_version

  irt_comparison_path <- require_cli_value(args, "irt-comparison")
  if (!requireNamespace("jsonlite", quietly = TRUE)) stop("jsonlite is required to read --irt-comparison")
  comparison_input <- jsonlite::fromJSON(irt_comparison_path)
  comparison <- compare_irt_models(comparison_input$model_2pl, comparison_input$model_3pl)
  calibration <- validate_calibration(utils::read.csv(require_cli_value(args, "irt-calibration"), stringsAsFactors = FALSE))
  calibration_manifest <- build_calibration_manifest(calibration, comparison$selected, item_bank_version, algorithm_version)

  structure_report <- utils::read.csv(require_cli_value(args, "structure-report"), stringsAsFactors = FALSE)
  precision_report <- utils::read.csv(require_cli_value(args, "precision-report"), stringsAsFactors = FALSE)
  retest_data <- utils::read.csv(require_cli_value(args, "retest"), stringsAsFactors = FALSE)
  structure_result <- validate_structure_and_precision(structure_report, precision_report, retest_data)

  dif_items <- utils::read.csv(require_cli_value(args, "dif-item-report"), stringsAsFactors = FALSE)
  dif_group_sizes <- utils::read.csv(require_cli_value(args, "dif-group-sizes"), stringsAsFactors = FALSE)$n
  dif_result <- evaluate_dif(dif_items, dif_group_sizes)

  external_data <- utils::read.csv(require_cli_value(args, "external"), stringsAsFactors = FALSE)
  external_result <- summarize_external_validity(external_data$lumina_theta, external_data$external_score)

  norm_scores <- utils::read.csv(require_cli_value(args, "norm-scores"), stringsAsFactors = FALSE)
  if (!is.numeric(norm_scores$age)) {
    stop(paste(
      "norm-scores age column must be numeric years (18-64).",
      "The standard analysis export only carries age_band per data-dictionary.csv,",
      "so exact age must come from a separately governed source before this stage can run."
    ))
  }
  sample_version <- require_cli_value(args, "sample-version")
  norm_candidate <- build_norm_candidate(
    norm_scores$theta, norm_scores$age, norm_scores$sem_theta,
    item_bank_version, algorithm_version, sample_version
  )

  review <- read_review_record(cli_value(args, "review-record"))

  artifacts <- list(
    export = export_result,
    irt = list(
      status = "pass",
      selected_model = comparison$selected,
      delta_aic_2pl_minus_3pl = comparison$delta_aic_2pl_minus_3pl,
      item_count = calibration_manifest$item_count
    ),
    structure = structure_result$structure,
    precision = structure_result$precision,
    retest = structure_result$retest,
    dif = dif_result,
    external_validity = external_result,
    independent_review = review$confirmed
  )

  manifest <- assemble_release_manifest(artifacts, item_bank_version, algorithm_version, extra_evidence = list(norms = norm_candidate))

  if (!requireNamespace("jsonlite", quietly = TRUE)) stop("jsonlite is required to write pipeline output")
  out_path <- cli_value(args, "out", paste0(export_path, ".release-manifest.json"))
  norm_out_path <- cli_value(args, "norm-out", paste0(export_path, ".norm-candidate.json"))
  manifest_for_json <- manifest
  manifest_for_json$evidence_hashes <- I(manifest$evidence_hashes)
  manifest_for_json$reasons <- I(manifest$reasons)
  jsonlite::write_json(manifest_for_json, out_path, auto_unbox = TRUE, pretty = TRUE)
  jsonlite::write_json(norm_candidate, norm_out_path, auto_unbox = TRUE, pretty = TRUE)

  cat(sprintf("Cognitive release manifest: %s (%s)\n", manifest$status, out_path))
  if (!identical(manifest$status, "candidate")) quit(status = 1, save = "no")
}

if (length(grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)) > 0) {
  main()
}
