#!/usr/bin/env bash

# loop - Execute Claude Code N times to work on tasks with realtime progress
# Usage: ./loop [N]
#   N - Number of times to run Claude Code (default: 1)
# Requires: bash 3.0+, jq

set -e
set -o pipefail

# Handle interrupt signals gracefully
cleanup() {
  echo -e "\n${YELLOW:-}Interrupted. Exiting...${NC:-}"
  exit 130
}
trap cleanup INT TERM

N=${1:-1}

if ! [[ "$N" =~ ^[0-9]+$ ]] || [ "$N" -lt 1 ]; then
  echo "Error: N must be a positive integer"
  echo "Usage: ./loop [N]"
  exit 1
fi

# Check for jq dependency
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required for parsing JSON output"
  echo "Install with your package manager:"
  echo "  macOS: brew install jq"
  echo "  Ubuntu/Debian: sudo apt install jq"
  exit 1
fi

PROMPT='Execute ch pop to get the task you need to work on. Implement the task and make sure all tests pass and there are no TypeScript errors. Before marking the task as done, use @agent-general-purpose to perform a code review of your changes - ensure the subagent is satisfied with the code quality, all tests pass, and there are no TypeScript errors. Only after the code review is approved, mark the task as done using ch done <id> and commit changes using pk branch create -am <message>.'

# ANSI color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Parse and display stream-json output with realtime progress
parse_stream() {
  local turn=0

  while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Parse JSON type
    type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)
    [[ -z "$type" ]] && continue

    case "$type" in
    system)
      subtype=$(echo "$line" | jq -r '.subtype // empty')
      if [[ "$subtype" == "init" ]]; then
        model=$(echo "$line" | jq -r '.model // "unknown"')
        session_id=$(echo "$line" | jq -r '.session_id // "unknown"')
        echo -e "${GRAY}Session: ${session_id:0:8}... | Model: $model${NC}"
      fi
      ;;

    assistant)
      turn=$((turn + 1))
      # Check for tool use or text response
      content_type=$(echo "$line" | jq -r '.message.content[0].type // empty')

      if [[ "$content_type" == "tool_use" ]]; then
        tool_name=$(echo "$line" | jq -r '.message.content[0].name // "unknown"')

        # Get tool-specific details
        case "$tool_name" in
        Bash)
          desc=$(echo "$line" | jq -r '.message.content[0].input.description // empty')
          cmd=$(echo "$line" | jq -r '.message.content[0].input.command // empty')

          # Always show the command
          if [[ -n "$desc" ]]; then
            echo -e "${CYAN}[$turn]${NC} ${YELLOW}⚡ $tool_name${NC}: $desc"
            echo -e "     ${GRAY}└─ $ ${cmd}${NC}"
          else
            echo -e "${CYAN}[$turn]${NC} ${YELLOW}⚡ $tool_name${NC}: ${GRAY}$ ${cmd}${NC}"
          fi
          ;;
        Read)
          file=$(echo "$line" | jq -r '.message.content[0].input.file_path // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}📖 $tool_name${NC}: ${GRAY}${file##*/}${NC}"
          ;;
        Edit | Write)
          file=$(echo "$line" | jq -r '.message.content[0].input.file_path // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}✏️  $tool_name${NC}: ${GRAY}${file##*/}${NC}"
          ;;
        Glob)
          pattern=$(echo "$line" | jq -r '.message.content[0].input.pattern // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}🔍 $tool_name${NC}: ${GRAY}$pattern${NC}"
          ;;
        Grep)
          pattern=$(echo "$line" | jq -r '.message.content[0].input.pattern // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}🔎 $tool_name${NC}: ${GRAY}$pattern${NC}"
          ;;
        Task)
          desc=$(echo "$line" | jq -r '.message.content[0].input.description // empty')
          agent_type=$(echo "$line" | jq -r '.message.content[0].input.subagent_type // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}🤖 $tool_name${NC}: ${GRAY}$agent_type - $desc${NC}"
          ;;
        TodoWrite)
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}📝 $tool_name${NC}: ${GRAY}Updating task list${NC}"
          ;;
        WebSearch)
          query=$(echo "$line" | jq -r '.message.content[0].input.query // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}🌐 $tool_name${NC}: ${GRAY}$query${NC}"
          ;;
        WebFetch)
          url=$(echo "$line" | jq -r '.message.content[0].input.url // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}🌐 $tool_name${NC}: ${GRAY}$url${NC}"
          ;;
        LSP)
          operation=$(echo "$line" | jq -r '.message.content[0].input.operation // empty')
          file=$(echo "$line" | jq -r '.message.content[0].input.filePath // empty')
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}🔗 $tool_name${NC}: ${GRAY}$operation on ${file##*/}${NC}"
          ;;
        *)
          echo -e "${CYAN}[$turn]${NC} ${YELLOW}🔧 $tool_name${NC}"
          ;;
        esac
      elif [[ "$content_type" == "text" ]]; then
        # Show a brief snippet of text response
        text=$(echo "$line" | jq -r '.message.content[0].text // empty')
        if [[ -n "$text" ]]; then
          if [[ ${#text} -gt 80 ]]; then
            echo -e "${CYAN}[$turn]${NC} ${BLUE}💬${NC} ${GRAY}${text:0:80}...${NC}"
          else
            echo -e "${CYAN}[$turn]${NC} ${BLUE}💬${NC} ${GRAY}${text}${NC}"
          fi
        fi
      fi
      ;;

    user)
      # Tool result - show brief status
      is_error=$(echo "$line" | jq -r '.message.content[0].is_error // false')
      if [[ "$is_error" == "true" ]]; then
        echo -e "     ${GRAY}└─ ❌ Error${NC}"
      fi
      ;;

    result)
      subtype=$(echo "$line" | jq -r '.subtype // empty')
      duration_ms=$(echo "$line" | jq -r '.duration_ms // 0')
      num_turns=$(echo "$line" | jq -r '.num_turns // 0')
      cost=$(echo "$line" | jq -r '.total_cost_usd // 0')

      # Convert ms to readable format
      duration_sec=$((duration_ms / 1000))
      duration_min=$((duration_sec / 60))
      duration_remainder=$((duration_sec % 60))

      if [[ "$duration_min" -gt 0 ]]; then
        duration_str="${duration_min}m ${duration_remainder}s"
      else
        duration_str="${duration_sec}s"
      fi

      # Format cost
      cost_str=$(printf "%.4f" "$cost")

      echo ""
      if [[ "$subtype" == "success" ]]; then
        echo -e "${GREEN}✅ Completed${NC} | ${GRAY}Turns: $num_turns | Duration: $duration_str | Cost: \$$cost_str${NC}"
      else
        echo -e "${YELLOW}⚠️  Finished with status: $subtype${NC} | ${GRAY}Turns: $num_turns | Duration: $duration_str | Cost: \$$cost_str${NC}"
      fi
      ;;
    esac
  done
}

echo -e "${BOLD}Starting loop: running Claude Code $N time(s)${NC}"

for ((i = 1; i <= N; i++)); do
  echo ""
  echo -e "${BOLD}===========================================${NC}"
  echo -e "${BOLD}Run $i of $N${NC}"
  echo -e "${BOLD}===========================================${NC}"
  echo ""

  if [ "$N" -eq 1 ]; then
    # Interactive mode for single run - no streaming
    claude "$PROMPT"
  else
    # Non-interactive mode with streaming progress
    # Use script to provide pseudo-TTY since docker sandbox requires TTY
    claude -p "$PROMPT" --dangerously-skip-permissions --output-format stream-json --verbose | parse_stream
  fi

  echo ""
  echo -e "${GREEN}Run $i completed${NC}"
done

echo ""
echo -e "${BOLD}Loop finished: completed $N run(s)${NC}"
