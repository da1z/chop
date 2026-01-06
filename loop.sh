#!/bin/bash

# loop - Execute Claude Code N times to work on tasks
# Usage: ./loop [N]
#   N - Number of times to run Claude Code (default: 1)

set -e

N=${1:-1}

if ! [[ "$N" =~ ^[0-9]+$ ]] || [ "$N" -lt 1 ]; then
  echo "Error: N must be a positive integer"
  echo "Usage: ./loop [N]"
  exit 1
fi

PROMPT='Execute ch pop to get the task you need to work on. Implement the task and make sure all tests pass and there are no TypeScript errors. Before marking the task as done, use @agent-general-purpose to perform a code review of your changes - ensure the subagent is satisfied with the code quality, all tests pass, and there are no TypeScript errors. Only after the code review is approved, mark the task as done using ch done <id> and commit changes using pk commit create -am <message>.'

echo "Starting loop: running Claude Code $N time(s)"

for ((i = 1; i <= N; i++)); do
  echo ""
  echo "=========================================="
  echo "Run $i of $N"
  echo "=========================================="
  echo ""

  if [ "$N" -eq 1 ]; then
    # Interactive mode for single run
    claude "$PROMPT"
  else
    # Non-interactive mode for multiple runs
    claude -p "$PROMPT" --dangerously-skip-permissions
  fi

  echo ""
  echo "Run $i completed"
done

echo ""
echo "Loop finished: completed $N run(s)"
