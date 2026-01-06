import type { Command } from "commander";
import { TaskStore } from "../storage/task-store.ts";

// Generate bash completion script
function generateBashCompletion(): string {
  return `# Bash completion for chop
# Add this to your ~/.bashrc or ~/.bash_profile:
# eval "$(chop completion bash)"
# or: eval "$(ch completion bash)"

_chop_completions() {
    local cur prev words cword

    # Use bash-completion if available, otherwise fallback to basic parsing
    if declare -F _init_completion >/dev/null 2>&1; then
        _init_completion || return
    else
        cur="\${COMP_WORDS[COMP_CWORD]}"
        prev="\${COMP_WORDS[COMP_CWORD-1]}"
        words=("\${COMP_WORDS[@]}")
        cword=$COMP_CWORD
    fi

    local commands="init add a list ls pop p done d status move mv mt mb archive ar purge edit e show s completion"

    # If completing the first argument (command name)
    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$commands" -- "$cur"))
        return
    fi

    # If completing argument for commands that need task ID
    local cmd="\${words[1]}"
    case "$cmd" in
        done|d|move|mv|mt|mb|archive|ar|edit|e|show|s)
            # Get task IDs from chop
            local task_ids
            task_ids=$(chop completion --list-ids 2>/dev/null)
            COMPREPLY=($(compgen -W "$task_ids" -- "$cur"))
            return
            ;;
    esac
}

complete -F _chop_completions chop
complete -F _chop_completions ch
`;
}

// Generate zsh completion script
function generateZshCompletion(): string {
  return `#compdef chop ch
# Zsh completion for chop
# Add this to your ~/.zshrc:
# eval "$(chop completion zsh)"
# or: eval "$(ch completion zsh)"

_chop() {
    local -a commands
    commands=(
        'init:Initialize chop in current directory'
        'add:Add a new task'
        'a:Add a new task (alias)'
        'list:List tasks'
        'ls:List tasks (alias)'
        'pop:Start working on next task'
        'p:Pop next task (alias)'
        'done:Mark a task as done'
        'd:Mark done (alias)'
        'status:Show current task status'
        'move:Move a task in the queue'
        'mv:Move task (alias)'
        'mt:Move task to top'
        'mb:Move task to bottom'
        'archive:Archive a task'
        'ar:Archive task (alias)'
        'purge:Purge archived tasks'
        'edit:Edit a task'
        'e:Edit task (alias)'
        'show:Display full task info'
        's:Show task (alias)'
        'completion:Generate shell completions'
    )

    _arguments -C \\
        '1: :->command' \\
        '*: :->args'

    case $state in
        command)
            _describe 'command' commands
            ;;
        args)
            case $words[2] in
                done|d|move|mv|mt|mb|archive|ar|edit|e|show|s)
                    local -a task_ids
                    task_ids=(\${(f)"$(chop completion --list-ids 2>/dev/null)"})
                    _describe 'task id' task_ids
                    ;;
            esac
            ;;
    esac
}

compdef _chop chop
compdef _chop ch
`;
}

// Generate fish completion script
function generateFishCompletion(): string {
  return `# Fish completion for chop
# Add this to your ~/.config/fish/completions/chop.fish:
# chop completion fish > ~/.config/fish/completions/chop.fish
# or: ch completion fish > ~/.config/fish/completions/ch.fish

# Disable file completion by default
complete -c chop -f
complete -c ch -f

# All commands including aliases
set -l all_cmds init add a list ls pop p done d status move mv mt mb archive ar purge edit e show s completion

# Commands for chop
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a init -d "Initialize chop in current directory"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a add -d "Add a new task"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a a -d "Add a new task (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a list -d "List tasks"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a ls -d "List tasks (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a pop -d "Start working on next task"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a p -d "Pop next task (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a done -d "Mark a task as done"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a d -d "Mark done (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a status -d "Show current task status"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a move -d "Move a task in the queue"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a mv -d "Move task (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a mt -d "Move task to top"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a mb -d "Move task to bottom"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a archive -d "Archive a task"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a ar -d "Archive task (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a purge -d "Purge archived tasks"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a edit -d "Edit a task"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a e -d "Edit task (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a show -d "Display full task info"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a s -d "Show task (alias)"
complete -c chop -n "not __fish_seen_subcommand_from $all_cmds" -a completion -d "Generate shell completions"

# Task ID completion for commands that need it
complete -c chop -n "__fish_seen_subcommand_from done d move mv mt mb archive ar edit e show s" -a "(chop completion --list-ids 2>/dev/null)"

# Same for ch alias
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a init -d "Initialize chop in current directory"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a add -d "Add a new task"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a a -d "Add a new task (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a list -d "List tasks"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a ls -d "List tasks (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a pop -d "Start working on next task"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a p -d "Pop next task (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a done -d "Mark a task as done"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a d -d "Mark done (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a status -d "Show current task status"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a move -d "Move a task in the queue"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a mv -d "Move task (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a mt -d "Move task to top"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a mb -d "Move task to bottom"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a archive -d "Archive a task"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a ar -d "Archive task (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a purge -d "Purge archived tasks"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a edit -d "Edit a task"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a e -d "Edit task (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a show -d "Display full task info"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a s -d "Show task (alias)"
complete -c ch -n "not __fish_seen_subcommand_from $all_cmds" -a completion -d "Generate shell completions"

complete -c ch -n "__fish_seen_subcommand_from done d move mv mt mb archive ar edit e show s" -a "(ch completion --list-ids 2>/dev/null)"
`;
}

// Get list of task IDs for completion
async function getTaskIds(): Promise<string[]> {
  try {
    const store = await TaskStore.create();
    const data = await store.readTasks();
    return data.tasks.map((task) => task.id);
  } catch {
    // Return empty array if we can't read tasks (e.g., not initialized)
    return [];
  }
}

export function registerCompletionCommand(program: Command): void {
  program
    .command("completion [shell]")
    .description("Generate shell completion script")
    .option("--list-ids", "List task IDs (internal use)")
    .action(async (shell: string | undefined, options: { listIds?: boolean }) => {
      // Internal option for listing task IDs during completion
      if (options.listIds) {
        const ids = await getTaskIds();
        console.log(ids.join("\n"));
        return;
      }

      // Determine shell type
      const targetShell = shell || detectShell();

      switch (targetShell) {
        case "bash":
          console.log(generateBashCompletion());
          break;
        case "zsh":
          console.log(generateZshCompletion());
          break;
        case "fish":
          console.log(generateFishCompletion());
          break;
        default:
          console.error(`Unknown shell: ${targetShell}`);
          console.error("Supported shells: bash, zsh, fish");
          process.exit(1);
      }
    });
}

// Detect current shell from environment
function detectShell(): string {
  const shell = process.env.SHELL || "";
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("fish")) return "fish";
  if (shell.includes("bash")) return "bash";
  return "bash"; // Default to bash
}
