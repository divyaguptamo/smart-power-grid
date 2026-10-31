# Shared helpers for the two push scripts. Not meant to be run directly.
set -e

check_identity() {
  local name email
  name="$(git config user.name || true)"
  email="$(git config user.email || true)"
  if [ -z "$name" ] || [ -z "$email" ]; then
    echo "Git does not know who you are yet. Run these first (use the email on your GitHub account):"
    echo '  git config --global user.name  "Your Name"'
    echo '  git config --global user.email "you@example.com"'
    exit 1
  fi
  echo "Commits will be made as: $name <$email>"
  printf "Is this the right person and the email on your GitHub account? (y/n) "
  read -r ok
  [ "$ok" = "y" ] || { echo "Stopped. Fix git config and run again."; exit 1; }
}

# commit_paths "message" path1 path2 ...   (paths are relative to the repo root)
commit_paths() {
  local msg="$1"; shift
  git --literal-pathspecs add -- "$@"
  if git diff --cached --quiet; then
    echo "  (nothing new for: $msg)"
  else
    git commit -q -m "$msg"
    echo "  committed: $msg"
  fi
}
