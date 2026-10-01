# ~/.config/zsh/.zshrc
#
# Uses:
#   Plugin manager: zinit (turbo mode)
#   Prompt:         oh-my-posh
#   Navigation:     zoxide, fzf, fd
#   CLI tools:      eza, bat, ripgrep

# =========================================================
# Machine-local overrides (not tracked in git)
# =========================================================
# Sourced first: Homebrew's shellenv and anything else here can put
# tools on PATH that the rest of this file depends on.
[[ -f "$ZDOTDIR/local.zsh" ]] && source "$ZDOTDIR/local.zsh"

# =========================================================
# XDG-backed state/cache dirs
# =========================================================
# HISTFILE and the compdump live under XDG dirs below; make sure the
# parent directories exist before anything tries to write into them.
[[ -d "$XDG_STATE_HOME/zsh" ]] || mkdir -p "$XDG_STATE_HOME/zsh"
[[ -d "$XDG_CACHE_HOME/zsh" ]] || mkdir -p "$XDG_CACHE_HOME/zsh"

# =========================================================
# History
# =========================================================
HISTFILE="$XDG_STATE_HOME/zsh/history"
HISTSIZE=100000
SAVEHIST=100000

setopt SHARE_HISTORY          # write+reread on every command; implies APPEND_HISTORY
setopt HIST_IGNORE_SPACE      # don't record lines starting with a space
setopt HIST_IGNORE_DUPS       # don't record a line if it's the same as the previous one
setopt HIST_IGNORE_ALL_DUPS   # ...and if it's a dup of an older line, drop the older one
setopt HIST_FIND_NO_DUPS      # skip dups when walking history with search
setopt HIST_EXPIRE_DUPS_FIRST # if HISTSIZE is ever hit, expire dups before anything else
setopt EXTENDED_HISTORY       # store a timestamp with each entry (needed for `fc -li`)

# =========================================================
# Shell behaviour
# =========================================================
setopt AUTOCD                 # typing a bare path `cd`s into it
setopt NOBEEP
setopt INTERACTIVE_COMMENTS   # allow `# comments` when pasting into an interactive shell

# =========================================================
# Prompt safety
# =========================================================
export VIRTUAL_ENV_DISABLE_PROMPT=1   # oh-my-posh renders its own venv segment; avoid showing it twice
FUNCNEST=100                          # raise the recursion ceiling for deeply nested completion functions

# =========================================================
# Zinit — plugin manager
# =========================================================
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"

# Bootstrap zinit if not already installed
if [ ! -d "$ZINIT_HOME" ]; then
   mkdir -p "$(dirname "$ZINIT_HOME")"
   git clone --depth=1 https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
fi

source "${ZINIT_HOME}/zinit.zsh"

# zsh plugins — all deferred via turbo mode (wait lucid) in one call.
# autosuggestions needs its own atload hook to start under turbo, so
# it's listed with an inline ice override.
zinit wait lucid for \
    zsh-users/zsh-syntax-highlighting \
    zsh-users/zsh-completions \
    zsh-users/zsh-history-substring-search \
    Aloxaf/fzf-tab \
    atload"_zsh_autosuggest_start" \
        zsh-users/zsh-autosuggestions

# oh-my-zsh snippets — same deferred loading, one call
zinit wait lucid for \
    OMZL::git.zsh \
    OMZP::git \
    OMZP::sudo

# =========================================================
# Completion
# =========================================================
autoload -Uz compinit

# Full compinit (fpath rescan + security check) only when the dump is
# missing or more than 24h stale; otherwise skip straight to loading
# the cached dump with `compinit -C`.
#
# NOTE: this must glob into an array. `[[ -n path(#qN.mh+24) ]]` looks
# right but is a no-op — `[[ ]]` never performs filename generation,
# so the glob qualifier inside it is never evaluated and the branch is
# always true. Wrapping it in an anonymous function scopes the
# `extended_glob` option change to just this check.
() {
  emulate -L zsh -o extended_glob
  local dump="$XDG_CACHE_HOME/zsh/zcompdump"
  local -a stale=( $dump(#qN.mh+24) )
  if (( $#stale )) || [[ ! -f $dump ]]; then
    compinit -d "$dump"
  else
    compinit -C -d "$dump"
  fi
}
zinit cdreplay -q

zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' menu no
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'eza --color=always --icons --group-directories-first $realpath'

compdef eza=ls   # reuse ls's completion function for eza instead of defining a new one

# =========================================================
# Keybindings
# =========================================================
zmodload zsh/terminfo

bindkey -e
bindkey '^[[A' history-substring-search-up
bindkey '^[OA' history-substring-search-up
bindkey '^[[B' history-substring-search-down
bindkey '^[OB' history-substring-search-down

# =========================================================
# fzf
# =========================================================
export FZF_DEFAULT_COMMAND='fd --type f --hidden --exclude .git --strip-cwd-prefix'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"

export FZF_DEFAULT_OPTS='
  --height=60%
  --layout=reverse
  --border=rounded
  --prompt="  "
  --pointer="  "
  --preview-window=right:65%:wrap:border-left
'
# fzf-tab ignores FZF_DEFAULT_OPTS unless explicitly opted in.
zstyle ':fzf-tab:*' use-fzf-default-opts yes

export _FZF_PREVIEW_CMD='bat --color=always --style=plain,numbers --line-range=:500 {}'
export FZF_CTRL_T_OPTS="--preview '$_FZF_PREVIEW_CMD'"

eval "$(fzf --zsh)"

# =========================================================
# Aliases
# =========================================================
alias ls='eza --no-{time,user,permissions} -a'
alias lss='ls --total-size --long --icons'
alias cat="bat -P"
alias -- -='cd -'               # `cd -` jumps to the previous directory
if (( $+commands[pbcopy] )); then
    alias -g CP="| pbcopy"      # macOS clipboard, e.g. `git diff CP`
fi

# =========================================================
# Shell integrations / prompt
# =========================================================
eval "$(oh-my-posh init zsh --config ~/.config/posh.toml)"
eval "$(zoxide init --cmd cd zsh)"

# =========================================================
# Ghostty shell integration (manual — ZDOTDIR is set in
# /etc/zshenv, which defeats Ghostty's automatic ZDOTDIR
# trick, per https://github.com/ghostty-org/ghostty/blob/main/src/shell-integration/README.md)
# =========================================================
if [[ -n "$GHOSTTY_RESOURCES_DIR" ]]; then
    source "$GHOSTTY_RESOURCES_DIR/shell-integration/zsh/ghostty-integration"
fi
