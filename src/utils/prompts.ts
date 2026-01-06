import * as readline from "node:readline";

// Create a readline interface for prompting
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Prompt for a yes/no confirmation
export async function confirm(message: string, defaultYes = false): Promise<boolean> {
  const rl = createReadline();
  const hint = defaultYes ? "[Y/n]" : "[y/N]";

  return new Promise((resolve) => {
    rl.question(`${message} ${hint} `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();

      if (normalized === "") {
        resolve(defaultYes);
      } else if (normalized === "y" || normalized === "yes") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Prompt for text input
export async function prompt(message: string, defaultValue?: string): Promise<string> {
  const rl = createReadline();
  const hint = defaultValue ? ` (${defaultValue})` : "";

  return new Promise((resolve) => {
    rl.question(`${message}${hint}: `, (answer) => {
      rl.close();
      const value = answer.trim();
      resolve(value || defaultValue || "");
    });
  });
}

// Prompt for a selection from a list of options
export async function select<T extends string>(
  message: string,
  options: { value: T; label: string }[]
): Promise<T> {
  const rl = createReadline();

  console.log(message);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label}`);
  });

  return new Promise((resolve) => {
    const askQuestion = (): void => {
      rl.question("Enter number: ", (answer) => {
        const num = parseInt(answer.trim(), 10);
        if (num >= 1 && num <= options.length) {
          rl.close();
          resolve(options[num - 1].value);
        } else {
          console.log("Invalid selection. Please try again.");
          askQuestion();
        }
      });
    };
    askQuestion();
  });
}

// Prompt for selecting multiple tasks (for --depends-on without ID)
export async function selectTasks(
  message: string,
  tasks: { id: string; title: string }[]
): Promise<string[]> {
  if (tasks.length === 0) {
    console.log("No tasks available to select.");
    return [];
  }

  const rl = createReadline();

  console.log(message);
  tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. ${task.id} - ${task.title}`);
  });
  console.log("\nEnter task numbers separated by commas (e.g., 1,3,5) or press Enter to skip:");

  return new Promise((resolve) => {
    rl.question("> ", (answer) => {
      rl.close();
      const input = answer.trim();

      if (!input) {
        resolve([]);
        return;
      }

      const selectedIds: string[] = [];
      const nums = input.split(",").map((s) => parseInt(s.trim(), 10));

      for (const num of nums) {
        if (num >= 1 && num <= tasks.length) {
          selectedIds.push(tasks[num - 1].id);
        }
      }

      resolve(selectedIds);
    });
  });
}
