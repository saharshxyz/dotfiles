eval "$(/opt/homebrew/bin/brew shellenv)"

# Zinit — plugin manager
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"

# Bootstrap zinit if not already installed
if [ ! -d "$ZINIT_HOME" ]; then
   mkdir -p "$(dirname $ZINIT_HOME)"
   git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
fi

source "${ZINIT_HOME}/zinit.zsh"

# zsh plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions
zinit light zsh-users/zsh-autosuggestions
zinit light Aloxaf/fzf-tab

# oh-my-zsh snippets
zinit snippet OMZL::git.zsh
zinit snippet OMZP::git
zinit snippet OMZP::sudo
zinit snippet OMZP::command-not-found

# Load completions (must come before zinit cdreplay)
autoload -Uz compinit && compinit
zinit cdreplay -q

# Keybindings
bindkey -e
bindkey '^p' history-search-backward
bindkey '^n' history-search-forward

# History
HISTSIZE=5000
HISTFILE=~/.zsh_history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups

# Completion styling
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' menu no
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'eza --color=always --icons --group-directories-first $realpath'
zstyle ':fzf-tab:complete:__zoxide_z:*' fzf-preview 'eza --color=always --icons --group-directories-first $realpath'

# Aliases
alias ls='eza --no-{time,user,permissions} -a'
alias lss='ls --total-size --long --icons'
alias cat="bat -P"
alias -g CP="| pbcopy"  # pipe output to clipboard, e.g. `git diff CP`

# Auto-run ls on directory change
autoload -Uz add-zsh-hook
add-zsh-hook chpwd chpwd_ls

chpwd_ls() {
    [[ -o interactive ]] && ls
}

# Shell integrations / prompt
eval "$(oh-my-posh init zsh --config ~/.config/posh.toml)"
eval "$(fzf --zsh)"
eval "$(zoxide init --cmd cd zsh)"
