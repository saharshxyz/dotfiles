# Preferences

- Install software using Debian APT when possible. Use official upstream
  distributions when the needed package is unavailable through APT.
- Use https://github.com/saharshxyz/dotfiles as the source for relevant dotfiles.
- Keep Debian-specific changes on codex/debian. Its draft PR against master
  is a persistent comparison with the MacBook configuration and must never
  be merged. The repository's default branch is named master, not main.
- These dotfiles originate from my personal MacBook Air. Adapt them to the
  current machine; do not assume every Mac application or integration belongs here.
- Do not install Zed or Ghostty on this machine.
- Use Zsh as the default login shell on this machine.
- When I need to run setup commands myself, combine them into as few
  copy-paste commands as practical, stopping on errors.
- As we set up this machine, keep this file updated with my explicitly stated
  preferences and verified, useful machine context. Do not infer preferences
  from examples or put secrets in this file.

# This machine

- Debian GNU/Linux 13, x86_64; user: srsh; home: /home/srsh.
- CLI-oriented setup. The observed Codex session uses a TTY.
- Default login shell: /usr/bin/zsh.
- Dotfiles checkout: /home/srsh/.dotfiles (codex/debian branch).
- Relevant ~/.config entries are symlinks into the checkout. Keep other
  applications' configuration in place instead of replacing all of ~/.config.
- ~/.config/AGENTS.md is the tracked instruction file; ~/.codex/AGENTS.md
  links to it so Codex loads it as global guidance.
- Zsh uses ~/.zshenv linked to the tracked ~/.config/zsh/.zshenv, which sets
  ZDOTDIR to ~/.config/zsh. Local overrides are in the ignored zsh/local.zsh.
- Shell tools: Git, Git LFS, GitHub CLI, Zsh, fzf, fd-find, eza, bat,
  ripgrep, zoxide, Vim; prefer APT for these.
- Debian calls fd and bat fdfind and batcat. ~/.local/bin/fd and
  ~/.local/bin/bat are compatibility symlinks.
- Oh My Posh is installed in ~/.local/bin from its official upstream binary.
- Keep ~/.config/gh/hosts.yml local: it contains GitHub authentication.
  Only gh/config.yml is linked into the public dotfiles repository.
- Codex sandbox sessions may prevent sudo using no_new_privileges, even
  though sudo works in the user's own terminal. Check the actual execution
  environment before concluding that the host cannot install packages.
