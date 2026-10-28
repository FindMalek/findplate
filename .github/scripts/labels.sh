#!/usr/bin/env bash
# idempotent: creates the label or updates its color and description
set -euo pipefail

label() {
  gh label create "$1" --color "$2" --description "$3" --force
}

label bug "d73a4a" "something is broken"
label feature "a2eeef" "new capability"
label module "5319e7" "optional template module"
label docs "0075ca" "docs site or readme"
label "good first issue" "7057ff" "small and well scoped"
label "help wanted" "008672" "open for contributors"
label p0 "b60205" "drop everything"
label p1 "d93f0b" "next up"
label p2 "fbca04" "when there is time"
