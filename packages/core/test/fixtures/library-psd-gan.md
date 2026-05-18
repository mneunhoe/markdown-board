# PSD_GAN — PSD 2026 paper

## Identity
- **Working title:** *Method or Implementation? A Plea for Carefully Tuned GANs in Synthetic Data Generation*
- **Authors:** Marcel Neunhoeffer (LMU Munich / IAB), Jörg Drechsler (IAB / LMU / JPSM)
- **Venue:** PSD 2026 (Privacy in Statistical Databases), LNCS proceedings
- **Page budget:** ~10 pages excluding bibliography
- **Submission deadline:** 2026-05-31
- **Internal target for SD2011 numbers:** 2026-05-22
- **Folder:** `/Users/marcelneunhoeffer/Desktop/claude/PSD_GAN`

## Argument
Four PSD 2024 papers (including F&D 2024 and Latner et al.) benchmarked GAN-based synthesizers — CTGAN, PATEGAN, DPGAN, usually at defaults — against statistical baselines (CART via `synthpop::syn`). They concluded GANs are not competitive for SDC. The current paper argues this conflates **method** (adversarial training) with **implementation** (off-the-shelf defaults). Using `RGAN` (Marcel's own R package) at three configurations — Default / Sensible / Tuned — the paper re-runs the experiments and shows the gap closes or inverts when standard GAN-stabilization technique is applied: mode-specific normalization, WGAN-GP, PacGAN, TTUR, careful early stopping, post-GAN boosting.

## Contributions
1. Framework distinguishing method from implementation, with diagnostic principles for fair empirical evaluation.
2. Empirical evidence: on PSD 2024 datasets, careful tuning of `RGAN` substantially changes the headline numbers.
3. Best-practices checklist for evaluating generative methods in the SDC literature.

## Self-disclosure / COI
Drechsler is on the PSD 2026 PC and co-author on two of the four critiqued papers. The paper flags this openly and the EasyChair submission needs an explicit COI declaration. The framing is "partial self-correction" rather than external critique.

## Section structure (planned page budgets)

| § | Section | Pages | Status |
|---|---------|-------|--------|
| 1 | Introduction | ~1.5 | Drafted |
| 2 | Related work: GANs at PSD | ~1.0 | Drafted |
| 3 | Method vs. implementation | ~1.5 | Drafted |
| 4 | The RGAN package | ~1.5 | Drafted |
| 5 | Empirical study | ~3.0 | Placeholder — depends on Stage 1 runs |
| 6 | Best-practices checklist | ~0.5 | Drafted |
| 7 | Discussion | ~0.5–1.0 | Drafted |
| A1 | Tuning appendix (12 steps) | — | Drafted |

## Replication study

**Three configurations per dataset:**
- **Default:** naive GAN (BCE, no `output_info`, hidden 128×2, ReLU, pac=1, no TTUR, constant LR, batch 64, 300 epochs, no early stop). Reproduces the "naive GAN" outcome.
- **Sensible:** Appendix A1 procedure verbatim (WGAN-GP gp_lambda=10, mode-specific normalization with BGMM n_modes=10, gumbel_tau=0.2, hidden 256×3, leaky_relu+batch_norm+residual+Xavier, pac=4, ttur=2, cosine LR, base_lr=1e-4, batch 500, 500 epochs, patience 50, post-GAN boosting).
- **Tuned:** Sensible + 12-config Sobol sweep over {noise_dim, generator_depth, base_lr, pac}; ranks by validation S_pMSE; re-fits at best config with `n_seeds_final` seeds.
- **CART baseline:** matched 12-config Sobol sweep over {cart.minbucket, cart.cp, visit.sequence permutation} for parity.

**Datasets, staged execution:**
| Stage | Datasets | Status |
|-------|----------|--------|
| 1 | SD2011 | Loader done; production run not yet attempted. Internal target 2026-05-22. |
| 2 | Adult, ACS | Adult loader done but needs `adult.data` dropped at `data/raw/`. ACS source not yet pinned. |
| 3 | EU-SILC (optional) | Gated on IAB data-use agreement; decision by 2026-05-25. |

**Primary metric:** S_pMSE (CART-based propensity model by default, per critiqued papers' practice; logit override available).
**Other metrics:** KS, Wasserstein, TSTR, DCR, MIA via `RGAN::synthetic_data_evaluator`.

**Seeds per configuration:** `n_seeds_final = 5` (bumped from 3 in the plan; pending Marcel's blessing).

## Code architecture

**Replication code:** `paper/replication/`
- `config/{common.R, datasets.R, sweep.R}` — master_seed, deterministic per-run seeding, device detection, dataset registry, Sobol spaces.
- `R/01_load_data.R` — per-dataset loaders. SD2011 fully working.
- `R/02_split.R` — 70/15/15 stratified splits with caching.
- `R/03_train_default.R` — Default config trainer. `train_default_pub()` is a documented stub pending F&D 2024 synthcity kwargs.
- `R/04_train_sensible.R` — Sensible config trainer.
- `R/05_train_tuned.R` — Sobol sweep + final seeds.
- `R/06_train_cart_baseline.R` — matched CART sweep.
- `R/07_evaluate.R` — reads run, recomputes test S_pMSE, runs `synthetic_data_evaluator`, patches manifest.
- `R/08_collect_results.R` — walks `runs/`, projects 17 cols into master tibble + per-dataset CSVs.
- `R/09_make_tables.R` — T2 (utility), T3 (risk), T4 (sweep) booktabs LaTeX.
- `R/10_make_figures.R` — F1 (marginals), F2 (correlations), F3 (per-config bar — not literal radar, documented decision).
- `R/utils/{manifest.R, spmse.R, sweeps.R, logging.R, preprocess.R, train_helpers.R}` — plumbing.
- `scripts/{run_one.R, run_all_local.sh, cluster_job.slurm, submit_cluster.sh}` — orchestration.

**RGAN dependency:** must be 0.2.0 dev (from `~/Desktop/github/RGAN`), not CRAN 0.1.1. Trainers gate via `.require_rgan_v("0.2.0")` and abort cleanly otherwise.

**Compute:** primary on M4 Max with `device="mps"`. LMU cluster as scale-up via the SLURM template.

## Current status (as of 2026-05-15)
- Replication code Phases 0–6 complete (18 test files, ~1400 expectations green).
- **No production runs yet** — all tests are smoke runs on 200–800 row subsamples with several stabilizers deliberately disabled.
- Six open code-review items (see TASKS.md) blocking the production runs.
- Stages 2 and 3 are blocked on user-provided data: Adult, ACS, EU-SILC.

## Risk to deadline
Low-to-moderate per the code review. Infra is built; gating risks are:
- Smoke tests deliberately bypass BGMM + validation paths; first real SD2011 run may surface a half-day of debugging.
- ACS source pin and EU-SILC access deadline both fall on 2026-05-25.
- Stage 2 datasets need to be runnable before May 28 or so to leave time for writing.

## Open decisions outstanding
See `TASKS.md` for the full list. Headline items:
1. Bless / revert `n_seeds_final = 5`.
2. Confirm `spmse()` default = "cart" (was "logit").
3. Default-pub row — keep with pinned synthcity kwargs, or drop.
4. Smoke-debug cache cleanup + `.gitignore` glob.
5. RGAN dependency pinning in `DESCRIPTION`.
6. `data/raw/adult.data` drop; ACS source decision; EU-SILC access confirmation.

## Methodological commitment
The paper's whole point is methodological honesty about how implementations are evaluated. The replication code itself must live up to that standard — no quiet smoothing of results, no silent defaults that mask failure modes. When in doubt, surface the assumption, don't bury it.
