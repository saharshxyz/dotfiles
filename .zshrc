eval "$(/opt/homebrew/bin/brew shellenv zsh)"

export PATH="/opt/homebrew/opt/imagemagick-full/bin:$PATH"

# Aliases
alias ls='eza --no-{time,user,permissions} -a'
alias lss='ls --total-size --long --icons'
alias cat="bat -P"

alias -g CP="| pbcopy"

autoload -Uz add-zsh-hook
add-zsh-hook chpwd chpwd_ls

chpwd_ls() {
    [[ -o interactive ]] && ls
}

eval "$(oh-my-posh init zsh --config ~/.config/posh.toml)"
eval "$(zoxide init --cmd cd zsh)"
