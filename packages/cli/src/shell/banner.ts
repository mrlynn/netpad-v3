/**
 * Shell Banner and Sayings
 * 
 * Same content as the web terminal for consistent experience
 */

import chalk from 'chalk';

// Edgy dev humor for the terminal
const TERMINAL_SAYINGS = [
  "It's not a bug, it's a surprise feature.",
  "sudo make me a sandwich",
  "There's no place like 127.0.0.1",
  "I don't always test my code, but when I do, I do it in production.",
  "// TODO: fix this later  — committed 4 years ago",
  "Works on my machine ¯\\_(ツ)_/¯",
  'git commit -m "fixed it for real this time"',
  "SELECT * FROM users WHERE clue > 0;  — 0 rows returned",
  "Debugging: Being the detective in a crime movie where you're also the murderer.",
  'A SQL query walks into a bar, walks up to two tables and asks: "Can I join you?"',
  "There are only 10 types of people: those who understand binary and those who don't.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "rm -rf / — just kidding, please don't.",
  "In case of fire: git commit, git push, leave building.",
  "99 little bugs in the code, 99 little bugs... Take one down, patch it around... 127 little bugs in the code.",
  "My code doesn't have bugs, it just develops random features.",
  'A programmer\'s wife tells him: "Go to the store and get a loaf of bread. If they have eggs, get a dozen." He comes home with 12 loaves.',
  "The best thing about a boolean is that even if you're wrong, you're only off by a bit.",
  "Weeks of coding can save you hours of planning.",
  "It compiles. Ship it.",
  "Have you tried turning it off and on again?",
  "chmod 777 — because security is overrated.",
  "console.log('here');  // the pinnacle of debugging",
  "localhost: where all my relationships work.",
  "I would love to change the world, but they won't give me the source code.",
];

export function getRandomSaying(): string {
  return TERMINAL_SAYINGS[Math.floor(Math.random() * TERMINAL_SAYINGS.length)];
}

export function printBanner(): void {
  const banner = `
${chalk.green('╔══════════════════════════════════════════════════════════╗')}
${chalk.green('║                                                          ║')}
${chalk.green('║')}   ${chalk.cyan.bold('███╗   ██╗███████╗████████╗██████╗  █████╗ ██████╗ ')}    ${chalk.green('║')}
${chalk.green('║')}   ${chalk.cyan.bold('████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗')}    ${chalk.green('║')}
${chalk.green('║')}   ${chalk.cyan.bold('██╔██╗ ██║█████╗     ██║   ██████╔╝███████║██║  ██║')}    ${chalk.green('║')}
${chalk.green('║')}   ${chalk.cyan.bold('██║╚██╗██║██╔══╝     ██║   ██╔═══╝ ██╔══██║██║  ██║')}    ${chalk.green('║')}
${chalk.green('║')}   ${chalk.cyan.bold('██║ ╚████║███████╗   ██║   ██║     ██║  ██║██████╔╝')}    ${chalk.green('║')}
${chalk.green('║')}   ${chalk.cyan.bold('╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═════╝ ')}    ${chalk.green('║')}
${chalk.green('║                                                          ║')}
${chalk.green('╚══════════════════════════════════════════════════════════╝')}
`;
  
  console.log(banner);
  console.log(`  ${chalk.yellow('"')}${chalk.italic.yellow(getRandomSaying())}${chalk.yellow('"')}\n`);
  console.log(`${chalk.gray('Commands:')}  ${chalk.cyan('ls')}  ${chalk.cyan('cd')}  ${chalk.cyan('pwd')}  ${chalk.cyan('cat')}  ${chalk.cyan('tree')}  ${chalk.cyan('find')}  ${chalk.cyan('help')}`);
  console.log(`${chalk.gray('Hierarchy:')} ${chalk.magenta('org')} / ${chalk.blue('project')} / ${chalk.cyan('app')} / ${chalk.yellow('forms|workflows|data')} / ${chalk.green('items')}`);
  console.log();
}

export function printHelp(): void {
  console.log(`
${chalk.bold.cyan('NetPad CLI - Interactive Shell')}

${chalk.bold('Navigation Commands:')}
  ${chalk.cyan('ls')} [path]              List directory contents
  ${chalk.cyan('cd')} <path>              Change directory
  ${chalk.cyan('pwd')}                    Print working directory
  ${chalk.cyan('tree')} [path]            Display directory tree
  ${chalk.cyan('cat')} <file>             Display file contents
  ${chalk.cyan('find')} <pattern>         Search for files

${chalk.bold('Entity Commands:')}
  ${chalk.cyan('list')} <type>            List forms, workflows, templates
  ${chalk.cyan('show')} <type> <id>       Show entity details
  ${chalk.cyan('create')} <type> <name>   Create new entity
  ${chalk.cyan('delete')} <type> <id>     Delete entity
  ${chalk.cyan('deploy')} <type> <id>     Deploy form or workflow

${chalk.bold('RBAC Commands:')}
  ${chalk.cyan('users')} <action>         Manage organization members
  ${chalk.cyan('groups')} <action>        Manage user groups
  ${chalk.cyan('roles')} <action>         Manage roles and permissions
  ${chalk.cyan('assign')} <target> <role> Assign role to user/group
  ${chalk.cyan('unassign')} <target>      Remove role assignment
  ${chalk.cyan('permissions')} [action]   View/check permissions
  ${chalk.cyan('whoami')}                 Show current user info

${chalk.bold('Other Commands:')}
  ${chalk.cyan('search')} <query>         Search marketplace
  ${chalk.cyan('install')} <package>      Install from marketplace
  ${chalk.cyan('login')}                  Authenticate with NetPad
  ${chalk.cyan('logout')}                 Clear credentials
  ${chalk.cyan('clear')}                  Clear screen
  ${chalk.cyan('history')}                Show command history
  ${chalk.cyan('exit')} | ${chalk.cyan('quit')}           Exit the shell

${chalk.gray('Type "help <command>" for detailed command help')}
`);
}
