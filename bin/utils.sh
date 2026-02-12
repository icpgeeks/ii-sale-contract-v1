#!/bin/bash
set -euo pipefail

span() {
  local message="$1"
  local color="$2"

  if [ -t 1 ]; then
    color_cmd=$(tput setaf "${color}")
    reset=$(tput sgr0)
    printf "%s%s%s" "${color_cmd}" "${message}" "${reset}"
  else
    printf "%s" "${message}"
  fi
}

header() {
  local message="$1"

  printf "\n"
  span "${message}" 14
  printf "\n\n"
}

usage() {
  local task="$1"
  local usage="$2"

  span "TASK:" 11
  printf "\n  %s\n\n" "${task}"
  span "USAGE:" 11
  printf "\n  "
  span "${usage}" 2
  printf "\n"
}

rainbow() {
  local message="$1"
  local reset='\e[0m'
  for ((colour = 1; colour <= 99; colour++)); do
    colour_code="\\e[0;${colour}m"
    span "asdfasdfasdf" "${colour}"
    printf "${colour} - ${colour_code}${message}${reset}\n"
  done
}

confirm() {
  local message="$1"

  span "${message}" 11
  printf " (y/n) "
  read -r answer
  if [ "${answer}" != "y" ]; then
    span "Cancelled..." 1
    printf "\n"
    exit 1
  fi
}

checkGitStatus() {
  if [ -n "$(git status --porcelain)" ]; then
    span "You have uncommitted changes. Please commit or stash them before proceeding." 1
    printf "\n"
    exit 1
  fi
}

calculateTimeMillisWithDelayFromNow() {
  local delay_millis="${1:-0}"
  local current_time_millis
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version
    current_time_millis=$(python3 -c "import time; print(int(time.time() * 1000))")
  else
    # Linux version
    current_time_millis=$(date +%s%3N | cut -c1-13)
  fi
  echo $((current_time_millis + delay_millis))
}