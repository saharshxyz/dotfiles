# ~/.config/zsh/.zshenv
# Sourced for EVERY zsh invocation — interactive, scripts, subshells.
# Keep this file to plain env vars only: no prompts, plugins, aliases,
# or anything that forks a process, since it runs on every shell.

# ---------- XDG base directories ----------
# Centralizes config/cache/data/state so tools stop dropping dotfiles
# straight into $HOME.
export XDG_CONFIG_HOME="$HOME/.config"
export ZDOTDIR="$XDG_CONFIG_HOME/zsh"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_STATE_HOME="$HOME/.local/state"

# ---------- Editor ----------
export EDITOR="vim"
export VISUAL="vim"

# ---------- Pager ----------
if command -v bat >/dev/null 2>&1; then
  export MANPAGER="bat -l man -p"
elif command -v batcat >/dev/null 2>&1; then
  export MANPAGER="batcat -l man -p"
fi

# ---------- Terminal.app session resume ----------
# Apple's shell integration writes window-restore state to
# ${ZDOTDIR:-$HOME}/.zsh_sessions, ignoring XDG dirs entirely. Since
# ZDOTDIR points into this repo, that would otherwise create a
# generated/runtime directory inside version control.
export SHELL_SESSIONS_DISABLE=1

# ---------- GPG ----------
# $TTY is a zsh builtin parameter, so this avoids forking `tty` on
# every single shell startup the way `$(tty)` would.
export GPG_TTY="$TTY"

# ---------- PATH ----------
# Personal binaries/scripts.
export PATH="$HOME/.local/bin:$PATH"
