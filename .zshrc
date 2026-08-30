export PATH="/opt/homebrew/opt/imagemagick-full/bin:$PATH"

# Aliases
alias ls='eza --no-{time,user,permissions} -a'
alias lss='ls --total-size --long --icons'
alias cat="bat -P"


eval "$(oh-my-posh init zsh --config ~/.config/posh.toml)"
