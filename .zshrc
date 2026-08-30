eval "$(/opt/homebrew/bin/brew shellenv)"

export PATH="/opt/homebrew/opt/imagemagick-full/bin:$PATH"

# Zinit — plugin manager
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
    OMZP::sudo \
    OMZP::command-not-found

# Load completions (must come before zinit cdreplay)
# Cache the completion dump and only regenerate once every 24h,
# instead of doing a full fpath rescan on every shell startup.
autoload -Uz compinit
if [[ -n ${HOME}/.zcompdump(#qN.mh+24) ]]; then
  compinit
else
  compinit -C
fi
zinit cdreplay -q

# Keybindings
zmodload zsh/terminfo

bindkey -e
bindkey '^[[A' history-substring-search-up
bindkey '^[OA' history-substring-search-up
bindkey '^[[B' history-substring-search-down
bindkey '^[OB' history-substring-search-down

# History
HISTSIZE=5000
HISTFILE=~/.zsh_history
SAVEHIST=$HISTSIZE
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_find_no_dups
setopt hist_ignore_all_dups

# Completion styling
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' menu no
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'eza --color=always --icons --group-directories-first $realpath'

# Aliases
alias ls='eza --no-{time,user,permissions} -a'
alias lss='ls --total-size --long --icons'
alias cat="bat -P"
alias -g CP="| pbcopy"  # pipe output to clipboard, e.g. `git diff CP`

# Shell integrations / prompt
eval "$(oh-my-posh init zsh --config ~/.config/posh.toml)"
eval "$(fzf --zsh)"
eval "$(zoxide init --cmd cd zsh)"
