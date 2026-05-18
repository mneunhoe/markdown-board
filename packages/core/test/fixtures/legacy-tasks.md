# Tasks

## Active

### DFG-Online-Synthesis — proposal cleanup + structure
- [ ] **Consolidate WP numbering.** - Currently 7+ WPs with overlapping numbers (WP6 appears twice — DPScans and plot learning). Pick a coherent map before more drafting.
- [ ] **Move embedded session notes out of `main.tex`.** - Sessions from 24 Oct 2025, 9 May 2025, 27 May 2025 are still inline. Create `notes/meetings.md` or similar and migrate them.
- [ ] **Migrate WP prose from `main.tex` into `content/06_objectives_and_work.tex`.** - The sub-file exists but is currently bypassed by the inline WP blocks in main.tex.
- [ ] **Address Jörg's "too Claude-based" critique on WP1.** - Restructure the prose; make each component traceable to a reviewer-defensible claim. Clarify whether "Formalizing Utility Requirements" is one WP or two.
- [ ] **Address the framing critique:** - Jörg pushed back on the "every analysis translates to a marginal workload" framing. Soften and qualify.
- [ ] **Restructure §1** - per Jörg's 10-bullet reorganization list (still embedded as a TODO in main.tex).
- [ ] **Verify "MEASURE-TEST-RELEASE" terminology.** - Jörg flagged this as possibly wrong. Check the AIM / DP synthesis literature.
- [ ] **Write WP3 substantive content.** - Currently essentially a placeholder ("Modifying AIM to Generate Statistically Valid Synthetic Data") with one MN comment.
- [ ] **Build the publication lists** - in `content/02_literature.bib`. Two cap-10 lists: peer-reviewed (`keyword=own`) and other (`keyword=ownpreprint`).
- [ ] **Write §07_diversity.tex** - — sex/gender/diversity relevance.
- [ ] **Write §08_supplement.tex** - — ethics + identifiable-data statement. IAB admin data raises real privacy considerations that need a substantive ethics statement (more than the Occupation-Embeddings proposal).
- [ ] **Finalize Gantt chart.** - Personnel-month allocation per WP per applicant.
- [ ] **Confirm DFG submission target date** - with Esfandiar and Jörg.

### DFG-Occupation-Embeddings — proposal drafting
- [ ] **Confirm co-PI(s) and authorship.** - Current draft has placeholder authors. Multi-applicant structure (≥2 PIs). Likely combination: Marcel + an IAB-adjacent labor-economics PI (BERUFENET is IAB-affiliated data).
- [ ] **Pin submission timeline.** - DFG Sachbeihilfe has no fixed deadline; need an internal target or programme-specific call deadline.
- [ ] **Map work packages to applicants.** - `\todo{Map WPs to applicants}` in §2.3. Which WP is led by whom, how PI effort splits.
- [ ] **Complete §2.2 Objectives.** - Four `\goal{}` headers present but no elaboration under each. `\todo{Complete this section}`.
- [ ] **Populate WP `wpsummary` blocks.** - All four are placeholder boilerplate ("In this work package, we do a lot of things..."). Each summary should have Aim / Method / Outcome bullets reflecting actual WP content.
- [ ] **Pin WP timing.** - Each WP has `\todo{The work for this objective will start XX and run for X months.}` — needs concrete months over the 36-month period.
- [ ] **Rewrite §2.3 Handling of research data.** - Currently template boilerplate referencing NCBI GEO / SRA (biomedical repos — wrong domain). Replace with: GitHub for code, OSF/Zenodo for replication materials, derived embeddings as Parquet/CSV with documentation.
- [ ] **Write §2.4 Sex/Gender/Diversity relevance.** - Currently `\todo{Text}`. Angle: embedding-based AI exposure measurement has downstream policy implications for gendered occupational segregation and for immigrant-heavy occupations whose technical jargon lies outside Transformer training data.
- [ ] **Update Gantt chart.** - `\todo{Update placeholder gantt diagram}`.
- [ ] **Decide citation style.** - `\todo{CITATION STYLE}` on §1 line 76. DFG accepts numerical or author-year — pick once.
- [ ] **Address EiV-alternatives `\todo` in §1.** - "Needs to elaborate on how to deal with the strong assumptions for classical measurement error / EiV framework and what alternatives there are" — likely candidates: Bayesian errors-in-variables, simulation-extrapolation (SIMEX), instrumental variables where applicable.
- [ ] **Build §3 publication list** - from `literature.bib`, highlighting up to 10 of Marcel's own most relevant publications.
- [ ] **Fix authors block.** - Replace "Prof.Name Author" / "Institute 1, University 1" placeholders with real names, institutes, addresses.
- [ ] **Update ethics section** - (§4.1.2): currently "does not apply" — confirm BERUFENET / O*NET / PATSTAT are non-personal data (almost certainly true) and write a brief justification.

### Diversity Profiles — choose next path after PA desk-reject (2026-05-08)
- [ ] **[Wed] Decide venue.** - PSRM (editor's explicit recommendation) vs BJPS vs AJPS. PSRM is the path of least resistance.
- [ ] **[Wed] Decide format.** - PA was a Letter (200w abstract, 6000w body). Thomas explicitly recommends full paper. PSRM accepts full articles. Likely decision: full paper.
- [ ] **Reframe intro using Thomas's draft.** - Thomas wrote a 7-paragraph alt intro in `feedback/Thomas_feedback.md` that opens with motivation, states the issue plainly, and brings the UK-vs-Germany same-ENP-different-shape example to the front. Adopt or adapt.
- [ ] **Confirm Thomas's identity** - — given the German-language feedback, likely an LMU/IAB colleague. Note in `people/` once known.
- [ ] **Audit reviewer items R1.M4–M7 and R2.M1–M5.** - Status of these in `notes/response-to-reviewers.md` not yet checked. R1.M1–M3 are 🟢 done; need to verify the rest before resubmission.
- [ ] **partyscape R package — push to GitHub, tag a stable release.** - Reviewer 2 explicitly asked for this. Consider CRAN submission timeline.
- [ ] **Manuscript cleanup before submission.** - Delete or archive stale snapshots: `main copy.tex`, `main copy 2.tex`, `main copy 3.tex`, `main_PA.tex`, `20260426_main.tex`.
- [ ] **If going full paper:** - rewrite to ~9000 words (target depends on venue), expand §4, §7, §8 (which were painfully compressed for the Letter format), add the worked applied example R2 asked for, add the ParlGov-coding sensitivity check R2.M4 wanted.
- [ ] **Re-run replication.qmd to verify all figures and tables before next submission.** - Cached chunks exist in `replication_code/replication_cache/`; force a clean rerun.

### ADA-HDSR — revised proposal (six-week clock)
- [ ] **[Tue] Address reviewer Request 1 — the logic model.** - Articulate ADA's program design as a logic model (inputs → activities → outputs → outcomes → impact). Connect each design decision to the data-literacy / professional-training / embedded-research / public-sector-innovation literature. Cite Ridsdale 2015, Kreuter 2019, Mergel 2019 at minimum; review Dorsey 2025, Koloski 2025, Hilty 2025 from the special-theme set.
- [ ] **[Thu] Address reviewer Request 2 — methodology for cross-case conclusions.** - Spell out the case-study analysis approach. What evidence underpins specific claims (participant feedback, deliverable adoption, follow-up engagement, tool usage post-handoff)? Provide an explicit evidentiary basis for "a single seminar would not have produced the same result" — counterfactual reasoning, comparison to alternative formats, or sustained-use observations.
- [ ] **Confirm gender-equality reporting case study approval** - with the Bavarian State Ministry for Family, Labour and Social Affairs. If not approved by the proposal deadline, drop to 3 case studies and explain the substitution.
- [ ] **Circulate the revised proposal to co-authors** - with enough lead time for comments — Frauke Kreuter, Malte Schierholz, Felix Henninger, Heidi Seibold, Wiebke Weber, Julia von Bartenwerffer, Jacob Beck, Leonhard Kestel, Michael König.
- [ ] **Submit the revised proposal** - through the HDSR system before the six-week deadline.

### PSD_GAN — open decisions from 2026-05-15 code review (fast)
- [ ] **[Mon] [P1] Bless or revert `n_seeds_final = 5`** - in `paper/replication/config/sweep.R` (line 20). Plan said 3; code bumped to 5 unilaterally. 5 is more defensible but doubles laptop wall-clock for the final-seeds step.
- [ ] **[Mon] [P1] Confirm `spmse()` default method = "cart"** - (was "logit" per Snoke 2018). Change well-justified. Also tidy stale "logit is default" comment at line 26 of `R/utils/spmse.R`.
- [ ] **[Mon] [P1] Decide on `train_default_pub()`** - — keep with pinned F&D 2024 synthcity CTGAN kwargs, or drop the inoculation row from Table 2.
- [ ] **[Mon] Clean smoke-debug cache files** - — delete `data/cache/smoke_dbg*.rds`, `smoke4_*.rds`, `smoke6_*.rds`; add `smoke*_*.rds` to `.gitignore`.
- [ ] **[Mon] Pin RGAN dependency** - — bump `DESCRIPTION` to `RGAN (>= 0.2.0)` and document install path, OR wait for 0.2.0 on CRAN.

### PSD_GAN — unblock empirical pipeline
- [ ] **[Mon] [P1] Drop `adult.data` into `data/raw/`** - — one-line curl from UCI; loader currently aborts with the command.
- [ ] **[Mon] [P1] Decide ACS source** - — F&D 2024 extract vs. own PUMS reconstruction via `tidycensus::get_pums()` — due 2026-05-25.
- [ ] **[Fri] [P1] Confirm EU-SILC access via IAB** - — due 2026-05-25. If not confirmed, EU-SILC is out.

### PSD_GAN — production runs
- [ ] **[Mon] [P1] Stage 1: real SD2011 end-to-end** - (Default + Sensible + Tuned-sweep + CART). Budget: one evening on M4 Max; expect 1–2 false starts (smoke tests bypass BGMM + validation paths). Internal target: 2026-05-22.
- [ ] **[Tue] [P1] Eyeball SD2011 synthetic.csv vs. splits$train** - before launching the 12-config Tuned sweep.
- [ ] **[Thu] [P1] Write run summary** - to `paper/notes/run-summary-2026-05-XX.md` once Stage 1 numbers are in.
- [ ] **Stage 2: Adult + ACS** - after Stage 1 looks plausible.
- [ ] **Stage 3 (optional): EU-SILC** - if access is confirmed.

### PSD_GAN — paper writing
- [ ] **[Thu] [P1] Section 5 (Experiments)** - — placeholder; populate once Stage 1 numbers are in.
- [ ] **Confirm final dataset list** - in `sections/05-experiments.tex`.
- [ ] **Verify page numbers and DOIs** - in `references.bib` against actual proceedings entries.
- [ ] **Add funding / acknowledgements text** - .
- [ ] **Add GitHub repository URL** - for reproducibility code (decide whether to publicly release before submission).
- [ ] **Decide on DP comparison** - — single DP row in Table 2 (current scope: no).
- [ ] **EasyChair COI declaration** - — Drechsler on PC + co-author on two critiqued papers.

### MIBench — cluster setup (gates simulation sweeps)
- [ ] **A1: get repos onto LRZ** - — easiest path is C1 first (push to GitHub), then `git clone` on LRZ. Fallback: `scp -r ~/Desktop/github/MIBench{,-experiments} lrz:~/projects/`.
- [ ] **A2: SSH + tmux + miniconda3 on LRZ** - — wget Miniconda installer, install to `~/miniconda3`, `conda init bash`.
- [ ] **A3: create R env + install packages** - — `conda env create -f cluster/envs/mibench-r-env.yml`; `Rscript cluster/install_R_packages.R`. Verify `MIBench` 0.2.0 loads. (~10 min, mostly conda solver.)
- [ ] **A4: smoke test** - — `sbatch cluster/slurm/run_smoke_test.sh`. Expected PASS for mixgb + miceRanger; FAIL for mice_pcr (expected — fork not installed).

### MIBench — first real cluster job (after A4)
- [ ] **B: submit 4 methods in parallel** - — `sbatch --export=METHOD=10_mixgb / 11_miceRanger / 01_amelia / 02_mice_pmm cluster/slurm/run_one_method.sh`. Each runs `n_repetitions=1000` × all DGPs × all missingness mechanisms. 3–12h wall-clock per method.
- [ ] **Pull results** - — `scp -r lrz:~/projects/MIBench-experiments/results ./lrz_results` after all complete.

### MIBench — non-cluster work in parallel
- [ ] **[Fri] C1: push MIBench + MIBench-experiments to GitHub.** - Both ahead of origin and unpushed. Backup + simplifies A1. (Branches: `MIBench:refactor-2026-04`, `MIBench-experiments:main`.)
- [ ] **C2: run K-R / Campos / Minozzi drivers locally** - for replication numbers before cluster sweeps return. Per-method: Campos ~30 min, Minozzi ~3-8 min, K-R ~1h per method. Needs heavy package deps (Amelia 1.7.5 + Rcpp for K-R; PanelMatch + miceadds + CBPS for Campos; lme4 + nloptr for Minozzi).
- [ ] **C3: draft §§1–3 of BJPS main.tex** - — doesn't need empirical results. Replication-study findings already in hand (Mullin-Hansen, Charnysh-Lall, Letsa). Charnysh-Lall is the strongest headline.
- [ ] **C4 (low priority): bib cleanup** - — 3 duplicate keys in `mibench.bib` (`lall2022midas`, `marbach2022choosing`, `mullin2022local`/`park2022change`).

### MIBench — decision points for later
- [ ] **Decide: add more 2023–2026 MI methods** - before publishing (LLM imputers, miceDRF, NewImp)? Default no — current 4 wrappers enough for argument.
- [ ] **Decide: K-R / Campos / Minozzi on cluster too?** - Smaller ones easy (Campos ~30 min, Minozzi ~30-50 min); K-R is 1-2 cluster-days × 6 methods, worth it for completeness but not gating the draft.

### ValidImpute — immediate (before more writing)
- [ ] **Build placeholder coverage-vs-width figure** - with synthetic numbers in expected ranges. Replace the `\fbox` in §6.1. Synthetic targets per plan: method near 0.95 at modest width; SOTA ML (DiffPuter, ReMasker) below the line at large width; classical MI (mice, Amelia) near line at larger width; infeasible baseline tight on line; listwise way below.
- [ ] **Verify `(?)` references** - in `plans/imputation_papers.md`: MissDiff venue (workshop vs. main track), HexaGAN venue (ICML 2019?), Mohan & Pearl venue, exact title/authors/year of "Beyond Accuracy" workshop paper, Golchian–Wright arXiv ID.
- [ ] **Populate `iclr2026_conference.bib`** - with the confirmed entries from the reading list. Don't bulk-import — only what will actually be cited.

### ValidImpute — package (`~/Desktop/github/validimpute`)
- [ ] **Phase 3 (June target): method integration layer.** - Extract methods into `R/methods/` (impute_mice, impute_amelia, impute_em, impute_mean, impute_listwise, impute_infeasible). Build registry. Refactor `run_experiment` to use registry. Unit test each method. Numerical regression test against pre-refactor results — numbers must match exactly.
- [ ] **Phase 4 (June–July, highest risk): external method wrappers via subprocess+Parquet.** - Set up `inst/methods/<method>/` with `environment.yml`, `impute.py`, README. Define wire format (data.parquet, mask.parquet, config.json → imputations.parquet). R-side bridge `impute_external()`. Wrap DiffPuter first as proof of concept — this discovers whether DiffPuter cleanly supports M-imputation (plan suggests possibly NOT, which is itself a finding). Then ReMasker, MIWAE, MissDiff/TabCSDI.
- [ ] **Phase 5 (July, parallel with 4): extend benchmark.** - Add MAR/MNAR mechanisms to `tbm_data` (currently only MCAR). Add marginal-mean estimand (`analysis_model_mean`). Add predictive-accuracy estimand (held-out train/test split). Add scalability sweep (n in {1k, 10k, 100k}). Refactor DGP dispatch into a registry like methods.
- [ ] **Phase 6 (August): Python user-facing API.** - `python/validimpute/` with reticulate-based thin wrapper. `pyproject.toml` for `pip install validimpute`. Jupyter notebook example producing the killer plot. **First to cut if time is tight.**
- [ ] **Phase 7 (late August): polish + pre-submission hardening.** - Full benchmark sweep (every method × every DGP × every missingness × 100+ MC replicates). Snapshot results as RDS for reviewer reproducibility. Hide internal helpers from NAMESPACE. Standardize argument names. Increase test coverage. REPRODUCING.md. **Clean-machine smoke test.**

### ValidImpute — coupled work (paper side, depends on package phases)
- [ ] **Have a stats-trained reader review §3 + Appendix B** - before submission. Plan flags this as the common failure point.
- [ ] **Test the introduction on someone outside the immediate research circle.** - Coverage probability is the central terminology risk.

### ValidImpute — writing (do NOT write top-to-bottom; this is the plan-prescribed order)
- [ ] **§6 Experiments first** - — once empirical work produces real figures.
- [ ] **§4 Method** - — once method is fully implemented and understood.
- [ ] **§3 Theory** - — formalize after method is in code.
- [ ] **§§1–2 Intro + Background** - — vignette informed by which DGPs/estimands showed striking results.
- [ ] **§7 Related Work** - — last, so positioning is precise.
- [ ] **Abstract** - — keep a working draft updated; finalize last.

### ValidImpute — pre-submission housekeeping (later)
- [ ] **Decide if title still fits** - once results are in (flow matching vs. diffusion; θ-uncertainty vs. diffusion as headline).
- [ ] **Cap §5 (Evaluation Framework) at ~0.5 pages** - — past 1 page, the paper starts reading like a benchmark paper.
- [ ] **Author contributions section** - — decide.
- [ ] **arXiv preprint timing** - — recommend posting once paper is reasonably stable; protects against scooping.
- [ ] **Plan rebuttal responses** - — for computational cost, only-coverage-not-other-uncertainty-metrics, missing-method-X, theoretical-assumption-Y.

### ValidImpute — camera-ready (only after acceptance)
- [ ] **Uncomment `\iclrfinalcopy`.**
- [ ] **Replace anonymous author block with real author info.**
- [ ] **Add Acknowledgments.**
- [ ] **Strip `\todo` markers (or redefine `\todo` to no-op).**

## Waiting On

## Someday

## Done
